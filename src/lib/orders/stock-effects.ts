import type { PrismaTransactionClient } from "@/lib/prisma";
import { computeStockDecrements } from "@/lib/orders/stock";
import { toNumber } from "@/lib/catalog/pricing";
import type { CartLine } from "@/lib/cart/types";
import type { Money } from "@/lib/catalog/types";

/** Ítem mínimo del pedido para mover stock (combo expandido a sus componentes; gift card sin variante = sin stock). */
export interface StockItem {
  variantId: string | null;
  comboId?: string | null;
  qty: number;
  combo?: { items: Array<{ variantId: string; qty: number }> } | null;
}

/** Pedido mínimo para aplicar los efectos de "pasó a pagado". */
export interface PaidEffectsOrder {
  id: string;
  couponId: string | null;
  customerId: string | null;
  shippingMethod: string;
  shippingCost: Money;
  items: StockItem[];
}

/** Cantidad por variante a mover; las líneas sin variante ni combo (gift cards) no tienen stock físico. */
function stockAmounts(items: StockItem[]): Array<[string, number]> {
  const lines: CartLine[] = [];
  items.forEach((it, i) => {
    if (it.comboId && it.combo) {
      lines.push({ id: String(i), kind: "combo", refId: it.comboId, unitPrice: 0, qty: it.qty, weightGr: 0, isGiftCard: false, components: it.combo.items.map((ci) => ({ variantId: ci.variantId, qty: ci.qty })) });
    } else if (it.variantId) {
      lines.push({ id: String(i), kind: "variant", refId: it.variantId, unitPrice: 0, qty: it.qty, weightGr: 0, isGiftCard: false });
    }
  });
  // En orden de id, igual que el `ORDER BY id FOR UPDATE` del checkout: evita deadlocks entre tx concurrentes.
  return [...computeStockDecrements(lines)].filter(([, qty]) => qty > 0).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Repone el stock del pedido (el que `applyPaidEffects` descontó). */
export async function restockItems(tx: PrismaTransactionClient, items: StockItem[]): Promise<void> {
  for (const [variantId, qty] of stockAmounts(items)) {
    await tx.productVariant.update({ where: { id: variantId }, data: { stock: { increment: qty } } });
  }
}

/**
 * Efectos "una sola vez" de pasar un pedido a pagado: descuento de stock, Shipment `pending` y uso
 * de cupón. Lo llama quien ganó la transición pending_payment → paid (webhook o admin).
 * El stock se descuenta SIEMPRE completo, aunque quede negativo: el negativo registra lo adeudado y
 * la reposición al cancelar/reembolsar es simétrica (sin columna extra que diga qué se descontó).
 * Devuelve las variantes sobrevendidas (stock < 0 tras descontar) y el código del cupón común que
 * ya no tenía usos (el pago no se revierte; se avisa a la dueña).
 */
export async function applyPaidEffects(
  tx: PrismaTransactionClient,
  order: PaidEffectsOrder,
  now: Date,
): Promise<{ oversoldVariantIds: string[]; couponOverLimit: string | null }> {
  const oversoldVariantIds: string[] = [];
  for (const [variantId, qty] of stockAmounts(order.items)) {
    const updated = await tx.productVariant.update({ where: { id: variantId }, data: { stock: { decrement: qty } }, select: { stock: true } });
    if (updated.stock < 0) oversoldVariantIds.push(variantId);
  }
  if (order.shippingMethod !== "digital") await tx.shipment.create({ data: { orderId: order.id, status: "pending", cost: toNumber(order.shippingCost) } });

  let couponOverLimit: string | null = null;
  const coupon = order.couponId
    ? await tx.coupon.findUnique({ where: { id: order.couponId }, select: { code: true, maxUses: true, perCustomerLimit: true, sourceOrderId: true } })
    : null;
  // Una gift card usada como cupón ya se reservó (usedCount+1) al crear el pedido: acá no se vuelve a incrementar.
  if (order.couponId && coupon?.sourceOrderId == null) {
    // TOCTOU: perCustomerLimit/maxUses se validan en el checkout (lectura, antes de pagar), pero
    // el incremento real pasa acá. Reafirmar de forma atómica (mismo patrón que el stock: update
    // condicionado al valor leído en este momento) evita que dos pedidos que ganaron la carrera
    // del checkout con el mismo cupón terminen superando el límite al pagar ambos.
    if (coupon?.maxUses != null) {
      const res = await tx.coupon.updateMany({ where: { id: order.couponId, usedCount: { lt: coupon.maxUses } }, data: { usedCount: { increment: 1 } } });
      if (res.count === 0) couponOverLimit = coupon.code;
    } else {
      await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } });
    }

    if (order.customerId && coupon) {
      if (coupon.perCustomerLimit != null) {
        const res = await tx.couponRedemption.updateMany({
          where: { customerId: order.customerId, couponId: order.couponId, redeemedCount: { lt: coupon.perCustomerLimit } },
          data: { redeemedCount: { increment: 1 }, lastRedeemedAt: now },
        });
        if (res.count === 0) {
          // No había fila todavía (primer uso de esta clienta) → crearla si el límite lo permite.
          // Si ya existía, es que esta clienta ya está en el límite: no incrementar más (igual que
          // el stock, "no pasarse" en vez de sobrescribir un límite ya alcanzado).
          const exists = await tx.couponRedemption.findUnique({
            where: { customerId_couponId: { customerId: order.customerId, couponId: order.couponId } },
          });
          if (!exists && coupon.perCustomerLimit > 0) {
            await tx.couponRedemption.create({
              data: { customerId: order.customerId, couponId: order.couponId, redeemedCount: 1, lastRedeemedAt: now },
            });
          }
        }
      } else {
        await tx.couponRedemption.upsert({
          where: { customerId_couponId: { customerId: order.customerId, couponId: order.couponId } },
          create: { customerId: order.customerId, couponId: order.couponId, redeemedCount: 1, lastRedeemedAt: now },
          update: { redeemedCount: { increment: 1 }, lastRedeemedAt: now },
        });
      }
    }
  }

  return { oversoldVariantIds, couponOverLimit };
}
