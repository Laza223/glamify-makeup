import { describe, it, expect, vi } from "vitest";
import { createCheckout, type CreateCheckoutDeps, type CheckoutLineInput } from "@/lib/orders/checkout-service";
import { CustomerFacingError } from "@/lib/orders/customer-error";
import type { VariantStock } from "@/lib/orders/stock-hold";
import type { CartLine } from "@/lib/cart/types";

// Quien llega primero a "Pagar" retiene la unidad 30 minutos: el chequeo de stock corre dentro de la
// misma tx que crea el pedido (con las variantes bloqueadas), descuenta lo retenido por otros pedidos
// pendientes y la preference de MP vence junto con la reserva.

const line = (over: Partial<CartLine> = {}): CartLine => ({
  id: "ci1", kind: "variant", refId: "v1", unitPrice: 3000, qty: 1, weightGr: 100, productId: "p1", categoryId: "c1", isGiftCard: false, ...over,
});
const lip: CheckoutLineInput = { line: line(), productNameSnapshot: "Labial", variantNameSnapshot: "Rojo", skuSnapshot: "LAB-0001", title: "Labial — Rojo" };
const now = new Date("2026-10-16T12:00:00Z");

function makeDeps(stock: Record<string, VariantStock>, over: Partial<CreateCheckoutDeps> = {}) {
  const calls: string[] = [];
  const tx = {
    order: {
      findMany: vi.fn(async () => []),
      updateMany: vi.fn(async () => ({ count: 1 })),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { calls.push("create"); return { id: "ord-1", ...data, payments: [{ id: "pay-1" }] }; }),
    },
    payment: { update: vi.fn(async () => ({})) },
    coupon: { updateMany: vi.fn(async () => ({ count: 1 })) },
  };
  const lockStock = vi.fn(async (t: unknown) => {
    calls.push(t === tx ? "lock:in-tx" : "lock:outside-tx");
    return new Map(Object.entries(stock));
  });
  const deps: CreateCheckoutDeps = {
    db: {
      coupon: { findUnique: vi.fn(async () => null) },
      couponRedemption: { findUnique: vi.fn(async () => null) },
      $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
    } as unknown as CreateCheckoutDeps["db"],
    nextOrderSeq: vi.fn(async () => 7),
    lockStock,
    createPreference: vi.fn(async () => ({ id: "pref-1", init_point: "https://mp/ip" })),
    quoteShipping: vi.fn(async () => ({ cost: 2500, free: false, zoneId: "z1", source: "zone" as const })),
    appUrl: "https://app.test",
    isSandboxToken: false,
    now,
    ...over,
  };
  return { deps, tx, calls, lockStock };
}

const input = {
  contactName: "Ana", contactEmail: "ana@example.com", contactPhone: "1122334455",
  shippingMethod: "domicilio" as const,
  address: { cp: "1414", province: "CABA", street: "Calle", number: "1", city: "CABA" },
  lines: [lip],
  cartId: "cart-1",
};

describe("createCheckout — reserva de stock", () => {
  it("bloquea y chequea el stock dentro de la tx que crea el pedido, antes de crearlo", async () => {
    const { deps, calls, lockStock } = makeDeps({ v1: { stock: 1, held: 0 } });
    await createCheckout(input, deps);
    expect(calls).toEqual(["lock:in-tx", "create"]);
    expect(lockStock).toHaveBeenCalledWith(expect.anything(), ["v1"], { now });
  });

  it("el pedido retiene la unidad 30 minutos y la preference de MP vence a la misma hora", async () => {
    const { deps, tx } = makeDeps({ v1: { stock: 1, held: 0 } });
    await createCheckout(input, deps);
    const until = new Date("2026-10-16T12:30:00Z");
    expect(tx.order.create.mock.calls[0][0].data).toMatchObject({ reservedUntil: until });
    expect(deps.createPreference).toHaveBeenCalledWith(expect.objectContaining({ expiresAt: until }));
  });

  it("si la última unidad la está pagando otra persona: 'Justo se agotó', sin pedido ni preference", async () => {
    const { deps, tx } = makeDeps({ v1: { stock: 1, held: 1 } });
    const err = await createCheckout(input, deps).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CustomerFacingError);
    expect((err as Error).message).toMatch(/^Justo se agotó Labial — Rojo/);
    expect(tx.order.create).not.toHaveBeenCalled();
    expect(deps.createPreference).not.toHaveBeenCalled();
  });

  it("sin stock real: pide actualizar el carrito", async () => {
    const { deps } = makeDeps({ v1: { stock: 0, held: 0 } });
    await expect(createCheckout(input, deps)).rejects.toThrow(/No hay stock suficiente de Labial — Rojo/);
  });

  it("combos: chequea los componentes y nombra el combo", async () => {
    const kit: CheckoutLineInput = {
      line: line({ kind: "combo", refId: "combo-1", qty: 2, components: [{ variantId: "v9", qty: 1 }] }),
      productNameSnapshot: "Kit Labios", variantNameSnapshot: null, skuSnapshot: null, title: "Kit Labios",
    };
    const { deps, lockStock } = makeDeps({ v9: { stock: 2, held: 1 } });
    await expect(createCheckout({ ...input, lines: [kit] }, deps)).rejects.toThrow(/Justo se agotó Kit Labios/);
    expect(lockStock).toHaveBeenCalledWith(expect.anything(), ["v9"], { now });
  });
});

describe("createCheckout — envío sin cotización", () => {
  it("si no se pudo cotizar el envío no crea el pedido (nunca cobra envío $0 por error)", async () => {
    const { deps, tx } = makeDeps(
      { v1: { stock: 1, held: 0 } },
      { quoteShipping: vi.fn(async () => ({ cost: 0, free: false, zoneId: null, source: "none" as const })) },
    );
    await expect(createCheckout(input, deps)).rejects.toThrow(/No pudimos calcular el envío/);
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it("el envío gratis por umbral sigue valiendo $0", async () => {
    const { deps, tx } = makeDeps(
      { v1: { stock: 1, held: 0 } },
      { quoteShipping: vi.fn(async () => ({ cost: 0, free: true, zoneId: null, source: "free" as const })) },
    );
    await createCheckout(input, deps);
    expect(tx.order.create.mock.calls[0][0].data).toMatchObject({ shippingCost: 0, total: 3000 });
  });
});
