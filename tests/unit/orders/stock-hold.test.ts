import { describe, it, expect, vi } from "vitest";
import { holdExpiry, payDeadline, unitsByVariant, stockShortfall, lockStock } from "@/lib/orders/stock-hold";
import type { PrismaTransactionClient } from "@/lib/prisma";

// Reserva blanda: el stock se sigue descontando en el webhook al aprobarse el pago; mientras tanto,
// cada pedido pendiente "retiene" sus unidades 30 minutos para que nadie más pueda pagarlas.

describe("payDeadline / holdExpiry", () => {
  it("se puede pagar 30 minutos; la reserva dura 5 más para que llegue el webhook de un pago de último momento", () => {
    const now = new Date("2026-10-16T12:00:00Z");
    expect(payDeadline(now).toISOString()).toBe("2026-10-16T12:30:00.000Z");
    expect(holdExpiry(now).toISOString()).toBe("2026-10-16T12:35:00.000Z");
  });
});

describe("unitsByVariant", () => {
  it("suma variantes sueltas y expande combos por su cantidad", () => {
    const m = unitsByVariant([
      { variantId: "a", qty: 2, combo: null },
      { variantId: null, qty: 2, combo: { items: [{ variantId: "a", qty: 1 }, { variantId: "b", qty: 3 }] } },
    ]);
    expect(Object.fromEntries(m)).toEqual({ a: 4, b: 6 });
  });
});

describe("stockShortfall", () => {
  const need = new Map([["a", 1]]);
  it("alcanza si el stock menos lo retenido cubre lo pedido", () => {
    expect(stockShortfall(need, new Map([["a", { stock: 2, held: 1 }]]))).toEqual({ kind: "ok" });
  });
  it("held: hay stock pero lo está pagando otra persona", () => {
    expect(stockShortfall(need, new Map([["a", { stock: 1, held: 1 }]]))).toEqual({ kind: "held", variantIds: new Set(["a"]) });
  });
  it("sold_out: no hay stock real (gana sobre held)", () => {
    const r = stockShortfall(new Map([["a", 1], ["b", 1]]), new Map([["a", { stock: 0, held: 0 }], ["b", { stock: 1, held: 1 }]]));
    expect(r).toEqual({ kind: "sold_out", variantIds: new Set(["a"]) });
  });
  it("una variante que no existe cuenta como agotada", () => {
    expect(stockShortfall(need, new Map())).toEqual({ kind: "sold_out", variantIds: new Set(["a"]) });
  });
});

describe("lockStock", () => {
  const now = new Date("2026-10-16T12:00:00Z");
  function fakeTx(holders: Array<{ items: Array<{ variantId: string | null; qty: number; combo: { items: Array<{ variantId: string; qty: number }> } | null }> }>) {
    const tx = {
      $queryRaw: vi.fn(async () => [{ id: "a", stock: 3 }, { id: "b", stock: 1 }]),
      order: { findMany: vi.fn(async () => holders) },
    };
    return tx;
  }

  it("bloquea las variantes (FOR UPDATE, en orden) y descuenta lo retenido por otros pedidos", async () => {
    const tx = fakeTx([
      { items: [{ variantId: "a", qty: 2, combo: null }, { variantId: "zz", qty: 9, combo: null }] },
      { items: [{ variantId: null, qty: 1, combo: { items: [{ variantId: "b", qty: 1 }] } }] },
    ]);
    const r = await lockStock(tx as unknown as PrismaTransactionClient, ["a", "b"], { now });
    expect(Object.fromEntries(r)).toEqual({ a: { stock: 3, held: 2 }, b: { stock: 1, held: 1 } });
    const sql = (tx.$queryRaw.mock.calls[0] as unknown as [TemplateStringsArray])[0].join("?");
    expect(sql).toMatch(/FROM "ProductVariant"/);
    expect(sql).toMatch(/ORDER BY id FOR UPDATE/);
  });

  it("retienen los pendientes con reserva vigente o con un pago en revisión, menos el propio pedido", async () => {
    const tx = fakeTx([]);
    await lockStock(tx as unknown as PrismaTransactionClient, ["a"], { now, excludeOrderId: "ord-1" });
    expect(tx.order.findMany).toHaveBeenCalledWith({
      where: {
        status: "pending_payment",
        id: { not: "ord-1" },
        OR: [{ reservedUntil: { gt: now } }, { payments: { some: { status: "in_process" } } }],
      },
      select: { items: { select: { variantId: true, qty: true, combo: { select: { items: { select: { variantId: true, qty: true } } } } } } },
    });
  });

  it("sin variantes no consulta nada", async () => {
    const tx = fakeTx([]);
    expect((await lockStock(tx as unknown as PrismaTransactionClient, [], { now })).size).toBe(0);
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
});
