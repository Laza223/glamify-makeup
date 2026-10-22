import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import { canTransition } from "@/lib/orders/state-machine";
import { applyPaidEffects, restockItems } from "@/lib/orders/stock-effects";
import { voidUnusedGiftCards, releaseGiftCardReservation } from "@/lib/coupons/gift-card-service";
import type { Money } from "@/lib/catalog/types";
import type { OrderStatus } from "@prisma/client";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  paid: "Pagado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

/** Item mínimo del pedido para recomputar stock (combo expandido a componentes). */
export interface AdminOrderItem {
  id: string;
  variantId: string | null;
  comboId: string | null;
  qty: number;
  /** Snapshot de la línea: emite un cupón al pagarse (solo lo hace el webhook de MP). */
  isGiftCard?: boolean;
  combo: { items: Array<{ variantId: string; qty: number }> } | null;
}

/** Superficie mínima del pedido que el servicio necesita. */
export interface AdminOrder {
  id: string;
  status: OrderStatus;
  couponId: string | null;
  customerId?: string | null;
  shippingMethod?: string;
  shippingCost?: Money;
  items: AdminOrderItem[];
}

/** Superficie mínima de DB (para inyectar fakes en tests). */
export interface OrdersDb {
  order: { findUnique: (args: { where: { id: string }; include?: unknown }) => Promise<AdminOrder | null> };
  $transaction: <T>(fn: (tx: PrismaTransactionClient) => Promise<T>) => Promise<T>;
}

export interface OrdersDeps {
  db: OrdersDb;
  now?: Date;
}

export function defaultOrdersDeps(): OrdersDeps {
  return { db: prisma as unknown as OrdersDb };
}

/** include para cargar el pedido con lo necesario para restock. */
const orderInclude = { items: { include: { combo: { include: { items: true } } } } } as const;

/**
 * Efectos sobre gift cards cuando el pedido pasa a refunded/cancelled: se anulan las emitidas sin
 * usar (devuelve cuántas ya estaban usadas) y, si nunca se pagó, se libera la gift card que reservó.
 */
async function applyGiftCardEffects(tx: PrismaTransactionClient, orderId: string, from: OrderStatus, to: OrderStatus): Promise<number> {
  if (to !== "refunded" && to !== "cancelled") return 0;
  const { used } = await voidUnusedGiftCards(tx, orderId);
  if (to === "cancelled" && from === "pending_payment") await releaseGiftCardReservation(tx, orderId);
  return used;
}

const ORDER_CHANGED_ERROR = "El pedido cambió de estado mientras lo editabas. Recargá la página.";

export const GIFT_CARD_MANUAL_PAID_ERROR =
  "Los pedidos con gift card se confirman solo con el pago de Mercado Pago (así se emiten los códigos).";

/** Cambia el estado del pedido validando la transición (blueprint 04 §3). Lanza con mensaje claro si es inválida.
 *  `giftCardsUsed`: gift cards emitidas por el pedido que ya estaban usadas (no se pueden anular). */
export async function changeOrderStatus(
  orderId: string,
  to: OrderStatus,
  deps: OrdersDeps,
): Promise<{ id: string; giftCardsUsed: number }> {
  const order = await deps.db.order.findUnique({ where: { id: orderId }, include: orderInclude });
  if (!order) throw new Error("El pedido no existe.");
  if (order.status === to) return { id: order.id, giftCardsUsed: 0 };
  if (!canTransition(order.status, to)) {
    throw new Error(
      `No se puede pasar de "${STATUS_LABELS[order.status]}" a "${STATUS_LABELS[to]}".`,
    );
  }
  // Marcar pagado a mano no emite los códigos (eso lo hace el webhook al acreditarse el pago).
  if (order.status === "pending_payment" && to === "paid" && order.items.some((it) => it.isGiftCard)) {
    throw new Error(GIFT_CARD_MANUAL_PAID_ERROR);
  }
  // Reembolso/cancelación de un pedido que ya descontó stock y todavía no salió (paid/preparing) lo repone;
  // en shipped/delivered no (la dueña lo suma a mano cuando el producto vuelve; ver state-machine.ts).
  const shouldRestock = (to === "refunded" || to === "cancelled") && (order.status === "paid" || order.status === "preparing");
  const giftCardsUsed = await deps.db.$transaction(async (tx) => {
    // Guarda atómica sobre el estado leído: el webhook de MP puede haber movido el pedido antes, y ni los
    // efectos de una sola vez (stock, cupón) ni un estado viejo pueden pisar lo que ya pasó.
    const res = await tx.order.updateMany({ where: { id: order.id, status: order.status }, data: { status: to } });
    if (res.count !== 1) throw new Error(ORDER_CHANGED_ERROR);
    if (shouldRestock) await restockItems(tx, order.items);
    // Marcar pagado a mano aplica los mismos efectos que el webhook: stock, envío y uso del cupón.
    if (to === "paid") {
      await applyPaidEffects(
        tx,
        { id: order.id, couponId: order.couponId, customerId: order.customerId ?? null, shippingMethod: order.shippingMethod ?? "", shippingCost: order.shippingCost ?? 0, items: order.items },
        deps.now ?? new Date(),
      );
    }
    return applyGiftCardEffects(tx, order.id, order.status, to);
  });
  return { id: order.id, giftCardsUsed };
}

/**
 * Cancela el pedido. Si el estado previo descontó stock (paid/preparing/shipped),
 * repone el stock de las variantes/combos en la misma transacción.
 */
export async function cancelOrder(orderId: string, deps: OrdersDeps): Promise<{ id: string; giftCardsUsed: number }> {
  const order = await deps.db.order.findUnique({ where: { id: orderId }, include: orderInclude });
  if (!order) throw new Error("El pedido no existe.");
  if (order.status === "cancelled") return { id: order.id, giftCardsUsed: 0 };
  if (!canTransition(order.status, "cancelled")) {
    throw new Error(
      `No se puede cancelar un pedido en estado "${STATUS_LABELS[order.status]}".`,
    );
  }
  const shouldRestock =
    order.status === "paid" || order.status === "preparing" || order.status === "shipped";
  const giftCardsUsed = await deps.db.$transaction(async (tx) => {
    // Misma guarda que changeOrderStatus: si el webhook ya reembolsó y repuso, cancelar de nuevo repondría dos veces.
    const res = await tx.order.updateMany({ where: { id: order.id, status: order.status }, data: { status: "cancelled" } });
    if (res.count !== 1) throw new Error(ORDER_CHANGED_ERROR);
    if (shouldRestock) await restockItems(tx, order.items);
    return applyGiftCardEffects(tx, order.id, order.status, "cancelled");
  });
  return { id: order.id, giftCardsUsed };
}

export { STATUS_LABELS };
