import { prisma } from "@/lib/prisma";
import { createPreference as realCreatePreference } from "@/lib/payments/mercadopago";
import { toNumber } from "@/lib/catalog/pricing";
import type { Money } from "@/lib/catalog/types";

interface RetryOrderRow {
  id: string;
  orderNumber: string;
  status: string;
  contactEmail: string;
  shippingCost: Money;
  discountTotal: Money;
  total: Money;
  items: Array<{ productNameSnapshot: string; variantNameSnapshot: string | null; unitPriceSnapshot: Money; qty: number }>;
}
export interface RetryPaymentDb {
  order: { findUnique: (args: { where: { id: string }; include: { items: true } }) => Promise<RetryOrderRow | null> };
  payment: { updateMany: (args: { where: { orderId: string; status: "pending" }; data: { mpPreferenceId: string } }) => Promise<unknown> };
}
export interface RetryPaymentDeps {
  db: RetryPaymentDb;
  createPreference: typeof realCreatePreference;
  appUrl: string;
  /** true si MP_ACCESS_TOKEN es de sandbox (TEST-...) — decide qué init_point devolver. */
  isSandboxToken: boolean;
}

export function defaultRetryPaymentDeps(appUrl: string): RetryPaymentDeps {
  return {
    db: prisma as unknown as RetryPaymentDb,
    createPreference: realCreatePreference,
    appUrl,
    isSandboxToken: process.env.MP_ACCESS_TOKEN?.startsWith("TEST-") ?? false,
  };
}

/**
 * Nueva preference de MP para un pedido que sigue `pending_payment` (pago rechazado, sin saldo o
 * abandonado en MP). Reusa el pedido y su Payment: no crea otro pedido ni toca stock.
 * El webhook sigue matcheando por `external_reference` = id del pedido.
 */
export async function retryOrderPayment(orderId: string, deps: RetryPaymentDeps): Promise<{ initPoint: string }> {
  const order = await deps.db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new Error("No encontramos el pedido.");
  if (order.status !== "pending_payment") throw new Error("Este pedido ya no está pendiente de pago.");

  const shippingCost = toNumber(order.shippingCost);
  const total = toNumber(order.total);
  // Mismo criterio que createCheckout: los ítems deben sumar exactamente `total`.
  const items =
    toNumber(order.discountTotal) > 0
      ? [{ title: `Glamify Makeup · Pedido ${order.orderNumber}`, quantity: 1, unit_price: total }]
      : [
          ...order.items.map((it) => ({
            title: it.variantNameSnapshot ? `${it.productNameSnapshot} — ${it.variantNameSnapshot}` : it.productNameSnapshot,
            quantity: it.qty,
            unit_price: toNumber(it.unitPriceSnapshot),
          })),
          ...(shippingCost > 0 ? [{ title: "Envío", quantity: 1, unit_price: shippingCost }] : []),
        ];

  const preference = await deps.createPreference({
    orderId: order.id,
    orderNumber: order.orderNumber,
    items,
    payerEmail: order.contactEmail,
    appUrl: deps.appUrl,
    notificationUrl: `${deps.appUrl}/api/webhooks/mercadopago`,
  });
  await deps.db.payment.updateMany({ where: { orderId: order.id, status: "pending" }, data: { mpPreferenceId: preference.id } });

  const initPoint = deps.isSandboxToken && preference.sandbox_init_point ? preference.sandbox_init_point : preference.init_point;
  return { initPoint };
}
