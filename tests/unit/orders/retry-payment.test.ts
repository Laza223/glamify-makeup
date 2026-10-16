import { describe, it, expect, vi } from "vitest";
import { retryOrderPayment, type RetryPaymentDeps } from "@/lib/orders/retry-payment";
import type { VariantStock } from "@/lib/orders/stock-hold";

const order = (over: Record<string, unknown> = {}) => ({
  id: "ord-1", orderNumber: "GLM-000002", status: "pending_payment", contactEmail: "ana@example.com",
  shippingCost: 1500, discountTotal: 0, total: 1700,
  items: [{ productNameSnapshot: "Eduardo", variantNameSnapshot: null, unitPriceSnapshot: 200, qty: 1, variantId: "v1", combo: null }],
  ...over,
});
const now = new Date("2026-10-16T12:00:00Z");

function makeDeps(row: unknown, over: Partial<RetryPaymentDeps> = {}, stock: Record<string, VariantStock> = { v1: { stock: 5, held: 0 } }) {
  const updateMany = vi.fn(async () => ({}));
  const tx = { order: { updateMany: vi.fn(async () => ({ count: 1 })) } };
  const createPreference = vi.fn(async () => ({ id: "pref-2", init_point: "https://mp/ip", sandbox_init_point: "https://mp/sbx" }));
  const lockStock = vi.fn(async () => new Map(Object.entries(stock)));
  const deps: RetryPaymentDeps = {
    db: {
      order: { findUnique: vi.fn(async () => row) },
      payment: { updateMany },
      $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
    } as unknown as RetryPaymentDeps["db"],
    lockStock, createPreference, appUrl: "https://app.test", isSandboxToken: false, now, ...over,
  };
  return { deps, updateMany, createPreference, lockStock, tx };
}

describe("retryOrderPayment", () => {
  it("crea una preference nueva con ítems + envío que suman el total, y guarda su id", async () => {
    const { deps, updateMany, createPreference } = makeDeps(order());
    const r = await retryOrderPayment("ord-1", deps);
    expect(r.initPoint).toBe("https://mp/ip");
    const arg = (createPreference.mock.calls[0] as unknown[])[0] as { items: Array<{ quantity: number; unit_price: number }>; orderId: string };
    expect(arg.orderId).toBe("ord-1");
    expect(arg.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)).toBe(1700);
    expect(updateMany).toHaveBeenCalledWith({ where: { orderId: "ord-1", status: "pending" }, data: { mpPreferenceId: "pref-2" } });
  });

  it("con descuento manda una sola línea por el total", async () => {
    const { deps, createPreference } = makeDeps(order({ discountTotal: 100, total: 1600 }));
    await retryOrderPayment("ord-1", deps);
    const arg = (createPreference.mock.calls[0] as unknown[])[0] as { items: unknown[] };
    expect(arg.items).toEqual([{ title: "Glamify Makeup · Pedido GLM-000002", quantity: 1, unit_price: 1600 }]);
  });

  it("usa el sandbox_init_point solo con token de prueba", async () => {
    const { deps } = makeDeps(order(), { isSandboxToken: true });
    expect((await retryOrderPayment("ord-1", deps)).initPoint).toBe("https://mp/sbx");
  });

  it("rechaza pedidos que ya no están pendientes o que no existen", async () => {
    await expect(retryOrderPayment("ord-1", makeDeps(order({ status: "paid" })).deps)).rejects.toThrow(/ya no está pendiente/);
    await expect(retryOrderPayment("x", makeDeps(null).deps)).rejects.toThrow(/No encontramos/);
  });
});

describe("retryOrderPayment — reserva de stock", () => {
  it("re-chequea el stock sin contar su propia reserva, la renueva 30 min y la preference vence a esa hora", async () => {
    const { deps, lockStock, tx, createPreference } = makeDeps(order());
    await retryOrderPayment("ord-1", deps);
    const until = new Date("2026-10-16T12:30:00Z");
    expect(lockStock).toHaveBeenCalledWith(tx, ["v1"], { now, excludeOrderId: "ord-1" });
    expect(tx.order.updateMany).toHaveBeenCalledWith({ where: { id: "ord-1", status: "pending_payment" }, data: { reservedUntil: until } });
    expect(createPreference).toHaveBeenCalledWith(expect.objectContaining({ expiresAt: until }));
  });

  it("expande los combos del pedido a sus componentes", async () => {
    const kit = { productNameSnapshot: "Kit", variantNameSnapshot: null, unitPriceSnapshot: 200, qty: 2, variantId: null, combo: { items: [{ variantId: "v9", qty: 1 }] } };
    const { deps, lockStock, tx } = makeDeps(order({ items: [kit] }), {}, { v9: { stock: 2, held: 0 } });
    await retryOrderPayment("ord-1", deps);
    expect(lockStock).toHaveBeenCalledWith(tx, ["v9"], { now, excludeOrderId: "ord-1" });
  });

  it("si otra persona está pagando la última unidad: 'Justo se agotó' y no crea preference", async () => {
    const { deps, createPreference, tx } = makeDeps(order(), {}, { v1: { stock: 1, held: 1 } });
    await expect(retryOrderPayment("ord-1", deps)).rejects.toThrow(/^Justo se agotó Eduardo/);
    expect(tx.order.updateMany).not.toHaveBeenCalled();
    expect(createPreference).not.toHaveBeenCalled();
  });

  it("sin stock real: avisa que ya no queda y no crea preference", async () => {
    const { deps, createPreference } = makeDeps(order(), {}, { v1: { stock: 0, held: 0 } });
    await expect(retryOrderPayment("ord-1", deps)).rejects.toThrow(/Ya no queda stock de Eduardo/);
    expect(createPreference).not.toHaveBeenCalled();
  });

  it("si el pedido dejó de estar pendiente en el medio (lo pagó o venció), no crea preference", async () => {
    const { deps, createPreference, tx } = makeDeps(order());
    tx.order.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(retryOrderPayment("ord-1", deps)).rejects.toThrow(/ya no está pendiente/);
    expect(createPreference).not.toHaveBeenCalled();
  });
});
