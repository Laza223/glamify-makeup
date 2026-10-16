import { Prisma } from "@prisma/client";
import type { PrismaTransactionClient } from "@/lib/prisma";
import { checkAvailability } from "@/lib/orders/stock";

// Reserva blanda de stock. El stock se sigue descontando en el webhook al aprobarse el pago; mientras
// tanto, un pedido pendiente retiene sus unidades STOCK_HOLD_MINUTES (y su preference de MP vence a la
// misma hora), así dos personas no pueden pagar la misma última unidad.

export const STOCK_HOLD_MINUTES = 30;

export function holdExpiry(now: Date): Date {
  return new Date(now.getTime() + STOCK_HOLD_MINUTES * 60_000);
}

export interface UnitsItem {
  variantId: string | null;
  qty: number;
  combo: { items: Array<{ variantId: string; qty: number }> } | null;
}

/** Unidades por variante de ítems de pedido (combos expandidos a sus componentes). */
export function unitsByVariant(items: UnitsItem[]): Map<string, number> {
  const m = new Map<string, number>();
  const add = (variantId: string, qty: number) => m.set(variantId, (m.get(variantId) ?? 0) + qty);
  for (const it of items) {
    if (it.variantId) add(it.variantId, it.qty);
    else for (const c of it.combo?.items ?? []) add(c.variantId, c.qty * it.qty);
  }
  return m;
}

export interface VariantStock {
  stock: number;
  /** Unidades retenidas por otros pedidos pendientes. */
  held: number;
}
export type LockStock = (
  tx: PrismaTransactionClient,
  variantIds: string[],
  opts: { now: Date; excludeOrderId?: string },
) => Promise<Map<string, VariantStock>>;

/**
 * Bloquea las variantes hasta el fin de la tx (dos checkouts de la misma unidad se serializan) y
 * devuelve su stock y lo retenido por otros pedidos: pendientes con la reserva vigente o con un pago
 * en revisión en MP (puede acreditarse más tarde).
 */
export const lockStock: LockStock = async (tx, variantIds, { now, excludeOrderId }) => {
  if (variantIds.length === 0) return new Map();
  const rows = await tx.$queryRaw<Array<{ id: string; stock: number }>>`
    SELECT id, stock FROM "ProductVariant" WHERE id IN (${Prisma.join(variantIds)}) ORDER BY id FOR UPDATE`;
  const holders = await tx.order.findMany({
    where: {
      status: "pending_payment",
      ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
      OR: [{ reservedUntil: { gt: now } }, { payments: { some: { status: "in_process" } } }],
    },
    select: { items: { select: { variantId: true, qty: true, combo: { select: { items: { select: { variantId: true, qty: true } } } } } } },
  });
  const held = unitsByVariant(holders.flatMap((o) => o.items));
  return new Map(rows.map((r) => [r.id, { stock: r.stock, held: held.get(r.id) ?? 0 }]));
};

export type Shortfall = { kind: "ok" } | { kind: "sold_out" | "held"; variantIds: Set<string> };

/** `sold_out`: no hay stock real. `held`: hay, pero lo está pagando otra persona. */
export function stockShortfall(needed: Map<string, number>, stock: Map<string, VariantStock>): Shortfall {
  const pick = (f: (s: VariantStock) => number) => new Map([...stock].map(([id, s]) => [id, f(s)]));
  const real = checkAvailability(needed, pick((s) => s.stock));
  if (!real.ok) return { kind: "sold_out", variantIds: new Set(real.shortages.map((s) => s.variantId)) };
  const free = checkAvailability(needed, pick((s) => s.stock - s.held));
  if (!free.ok) return { kind: "held", variantIds: new Set(free.shortages.map((s) => s.variantId)) };
  return { kind: "ok" };
}

export function heldMessage(names: string[]): string {
  return `Justo se agotó ${names.join(", ")}: otra persona lo está pagando. Si no completa la compra, vuelve a estar disponible en menos de ${STOCK_HOLD_MINUTES} minutos.`;
}
