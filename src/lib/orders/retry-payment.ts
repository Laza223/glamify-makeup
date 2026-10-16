import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import { createPreference as realCreatePreference } from "@/lib/payments/mercadopago";
import { toNumber } from "@/lib/catalog/pricing";
import type { Money } from "@/lib/catalog/types";
import { lockStock, stockShortfall, holdExpiry, payDeadline, heldMessage, unitsByVariant, type LockStock, type UnitsItem } from "@/lib/orders/stock-hold";
import { CustomerFacingError } from "@/lib/orders/customer-error";

const RETRY_INCLUDE = { items: { include: { combo: { select: { items: { select: { variantId: true, qty: true } } } } } } } as const;

interface RetryOrderRow {
  id: string;
  orderNumber: string;
  status: string;
  contactEmail: string;
  shippingCost: Money;
  discountTotal: Money;
  total: Money;
  items: Array<UnitsItem & { productNameSnapshot: string; variantNameSnapshot: string | null; unitPriceSnapshot: Money }>;
}
export interface RetryPaymentDb {
  order: { findUnique: (args: { where: { id: string }; include: typeof RETRY_INCLUDE }) => Promise<RetryOrderRow | null> };
  payment: { updateMany: (args: { where: { orderId: string; status: "pending" }; data: { mpPreferenceId: string } }) => Promise<unknown> };
  $transaction: <T>(fn: (tx: PrismaTransactionClient) => Promise<T>) => Promise<T>;
}
export interface RetryPaymentDeps {
  db: RetryPaymentDb;
  lockStock: LockStock;
  createPreference: typeof realCreatePreference;
  appUrl: string;
  /** true si MP_ACCESS_TOKEN es de sandbox (TEST-...) — decide qué init_point devolver. */
  isSandboxToken: boolean;
  now?: Date;
}

export function defaultRetryPaymentDeps(appUrl: string): RetryPaymentDeps {
  return {
    db: prisma as unknown as RetryPaymentDb,
    lockStock,
    createPreference: realCreatePreference,
    appUrl,
    isSandboxToken: process.env.MP_ACCESS_TOKEN?.startsWith("TEST-") ?? false,
  };
}

const itemName = (it: RetryOrderRow["items"][number]) =>
  it.variantNameSnapshot ? `${it.productNameSnapshot} — ${it.variantNameSnapshot}` : it.productNameSnapshot;

/**
 * Nueva preference de MP para un pedido que sigue `pending_payment` (pago rechazado, sin saldo o
 * abandonado en MP). Reusa el pedido y su Payment: no crea otro pedido ni descuenta stock, pero vuelve
 * a chequearlo y renueva la reserva (la anterior pudo vencer y otra persona comprar la unidad).
 * El webhook sigue matcheando por `external_reference` = id del pedido.
 */
export async function retryOrderPayment(orderId: string, deps: RetryPaymentDeps): Promise<{ initPoint: string }> {
  const order = await deps.db.order.findUnique({ where: { id: orderId }, include: RETRY_INCLUDE });
  if (!order) throw new CustomerFacingError("No encontramos el pedido.");
  if (order.status !== "pending_payment") throw new CustomerFacingError("Este pedido ya no está pendiente de pago.");

  const now = deps.now ?? new Date();
  const reservedUntil = holdExpiry(now);
  const needed = unitsByVariant(order.items);
  // Primero la fila del pedido y después las variantes: mismo orden de locks que el webhook. Si no hay
  // stock, el rollback deshace la renovación.
  await deps.db.$transaction(async (tx) => {
    const res = await tx.order.updateMany({ where: { id: order.id, status: "pending_payment" }, data: { reservedUntil } });
    if (res.count !== 1) throw new CustomerFacingError("Este pedido ya no está pendiente de pago.");
    if (needed.size > 0) {
      const shortfall = stockShortfall(needed, await deps.lockStock(tx, [...needed.keys()], { now, excludeOrderId: order.id }));
      if (shortfall.kind !== "ok") {
        const touches = (it: UnitsItem) => (it.variantId ? [it.variantId] : (it.combo?.items ?? []).map((c) => c.variantId));
        const names = order.items.filter((it) => touches(it).some((id) => shortfall.variantIds.has(id))).map(itemName);
        throw new CustomerFacingError(
          shortfall.kind === "held" ? heldMessage(names) : `Ya no queda stock de ${names.join(", ")}. Armá un pedido nuevo desde la tienda.`,
        );
      }
    }
  });

  const shippingCost = toNumber(order.shippingCost);
  const total = toNumber(order.total);
  // Mismo criterio que createCheckout: los ítems deben sumar exactamente `total`.
  const items =
    toNumber(order.discountTotal) > 0
      ? [{ title: `Glamify Makeup · Pedido ${order.orderNumber}`, quantity: 1, unit_price: total }]
      : [
          ...order.items.map((it) => ({ title: itemName(it), quantity: it.qty, unit_price: toNumber(it.unitPriceSnapshot) })),
          ...(shippingCost > 0 ? [{ title: "Envío", quantity: 1, unit_price: shippingCost }] : []),
        ];

  const preference = await deps.createPreference({
    orderId: order.id,
    orderNumber: order.orderNumber,
    items,
    payerEmail: order.contactEmail,
    appUrl: deps.appUrl,
    notificationUrl: `${deps.appUrl}/api/webhooks/mercadopago`,
    expiresAt: payDeadline(now),
  });
  await deps.db.payment.updateMany({ where: { orderId: order.id, status: "pending" }, data: { mpPreferenceId: preference.id } });

  const initPoint = deps.isSandboxToken && preference.sandbox_init_point ? preference.sandbox_init_point : preference.init_point;
  return { initPoint };
}
