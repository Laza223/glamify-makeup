import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import { canTransition } from "@/lib/orders/state-machine";
import { computeStockDecrements } from "@/lib/orders/stock";
import { voidUnusedGiftCards, releaseGiftCardReservation } from "@/lib/coupons/gift-card-service";
import type { CartLine } from "@/lib/cart/types";
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

/** Convierte un OrderItem a CartLine para computar decrementos/incrementos de stock. */
function orderItemToLine(it: AdminOrderItem): CartLine {
  if (it.comboId && it.combo) {
    return {
      id: it.id,
      kind: "combo",
      refId: it.comboId,
      unitPrice: 0,
      qty: it.qty,
      weightGr: 0,
      isGiftCard: false,
      components: it.combo.items.map((ci) => ({ variantId: ci.variantId, qty: ci.qty })),
    };
  }
  return {
    id: it.id,
    kind: "variant",
    refId: it.variantId ?? "",
    unitPrice: 0,
    qty: it.qty,
    weightGr: 0,
    isGiftCard: false,
  };
}

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
  const giftCardsUsed = await deps.db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: order.id }, data: { status: to } });
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
    await tx.order.update({ where: { id: order.id }, data: { status: "cancelled" } });
    if (shouldRestock) {
      const decrements = computeStockDecrements(order.items.map(orderItemToLine));
      for (const [variantId, qty] of decrements) {
        if (variantId && qty > 0) {
          await tx.productVariant.update({
            where: { id: variantId },
            data: { stock: { increment: qty } },
          });
        }
      }
    }
    return applyGiftCardEffects(tx, order.id, order.status, "cancelled");
  });
  return { id: order.id, giftCardsUsed };
}

export { STATUS_LABELS };
