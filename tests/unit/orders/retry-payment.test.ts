import { describe, it, expect, vi } from "vitest";
import { retryOrderPayment, type RetryPaymentDeps } from "@/lib/orders/retry-payment";

const order = (over: Record<string, unknown> = {}) => ({
  id: "ord-1", orderNumber: "GLM-000002", status: "pending_payment", contactEmail: "ana@example.com",
  shippingCost: 1500, discountTotal: 0, total: 1700,
  items: [{ productNameSnapshot: "Eduardo", variantNameSnapshot: null, unitPriceSnapshot: 200, qty: 1 }],
  ...over,
});

function makeDeps(row: unknown, over: Partial<RetryPaymentDeps> = {}) {
  const updateMany = vi.fn(async () => ({}));
  const createPreference = vi.fn(async () => ({ id: "pref-2", init_point: "https://mp/ip", sandbox_init_point: "https://mp/sbx" }));
  const deps: RetryPaymentDeps = {
    db: { order: { findUnique: vi.fn(async () => row) }, payment: { updateMany } } as unknown as RetryPaymentDeps["db"],
    createPreference, appUrl: "https://app.test", isSandboxToken: false, ...over,
  };
  return { deps, updateMany, createPreference };
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
