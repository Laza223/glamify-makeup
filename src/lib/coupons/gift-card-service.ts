// NOTA: sin `import "server-only"` — lo importa el webhook, que usa scripts/simulate-mp-webhook.ts (node).
import type { PrismaTransactionClient } from "@/lib/prisma";
import { toNumber } from "@/lib/catalog/pricing";
import type { Money } from "@/lib/catalog/types";
import { generateGiftCardCode } from "@/lib/coupons/gift-card-code";
import { addMonthsUtc, GIFT_CARD_VALID_MONTHS } from "@/lib/coupons/gift-card";

export interface IssuedGiftCard {
  code: string;
  amount: number;
  validTo: Date;
}

/**
 * Emite un cupón de UN SOLO USO por cada unidad de línea gift card del pedido: monto fijo = precio
 * unitario, solo productos (no envío), vence a los 6 meses. Corre dentro de la tx del webhook que
 * ganó la transición a paid (una sola vez por pedido).
 */
export async function issueGiftCards(
  tx: PrismaTransactionClient,
  order: { id: string; items: Array<{ isGiftCard: boolean; unitPriceSnapshot: Money; qty: number }> },
  now: Date,
): Promise<IssuedGiftCard[]> {
  const validTo = addMonthsUtc(now, GIFT_CARD_VALID_MONTHS);
  const issued: IssuedGiftCard[] = [];
  for (const it of order.items) {
    if (!it.isGiftCard) continue;
    const amount = toNumber(it.unitPriceSnapshot);
    for (let i = 0; i < it.qty; i++) issued.push({ code: generateGiftCardCode(), amount, validTo });
  }
  if (issued.length === 0) return issued;
  // Un solo INSERT para todos los códigos (una ida a la DB por pedido, no una por unidad).
  await tx.coupon.createMany({
    data: issued.map((c) => ({
      code: c.code, type: "fixed" as const, value: c.amount, scope: "all" as const, maxUses: 1,
      validFrom: now, validTo: c.validTo, active: true, sourceOrderId: order.id,
    })),
  });
  return issued;
}

/**
 * Anula (`active=false`) las gift cards emitidas por el pedido que NO se usaron. Para cuando el
 * pedido pasa a refunded/cancelled. `used` = cuántas ya estaban usadas (no se pueden anular).
 */
export async function voidUnusedGiftCards(tx: PrismaTransactionClient, orderId: string): Promise<{ voided: number; used: number }> {
  const res = await tx.coupon.updateMany({ where: { sourceOrderId: orderId, usedCount: 0, active: true }, data: { active: false } });
  const used = await tx.coupon.count({ where: { sourceOrderId: orderId, usedCount: { gt: 0 } } });
  return { voided: res.count, used };
}

/**
 * Libera la reserva de la gift card que el pedido `pending_payment` usó como cupón (el checkout la
 * reserva con usedCount+1 para que no se gaste dos veces). Llamar SOLO al cancelar un pedido que
 * nunca llegó a pagarse. Precondición `usedCount > 0` → nunca queda negativo ni libera de más.
 * Si el pedido de origen de la gift card ya está refunded/cancelled, además la deja `active: false`.
 */
export async function releaseGiftCardReservation(tx: PrismaTransactionClient, orderId: string): Promise<void> {
  const reservedBy = { sourceOrderId: { not: null }, orders: { some: { id: orderId } } };
  await tx.coupon.updateMany({ where: { ...reservedBy, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
  // Si el pedido que la emitió ya se reembolsó/canceló, nadie la anuló mientras estaba reservada
  // (el void solo toca las sin usar): al liberarla hay que dejarla inactiva, no reutilizable.
  await tx.coupon.updateMany({
    where: { ...reservedBy, usedCount: 0, active: true, sourceOrder: { status: { in: ["refunded", "cancelled"] } } },
    data: { active: false },
  });
}
