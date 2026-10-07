import { describe, it, expect, vi } from "vitest";
import { createCheckout, type CreateCheckoutDeps, type CheckoutLineInput, type CouponRow } from "@/lib/orders/checkout-service";
import type { CartLine } from "@/lib/cart/types";

// El carrito sigue activo hasta que el pago se aprueba (lo marca `ordered` el webhook). Si la clienta
// vuelve de MP sin pagar y reintenta, el pedido pendiente anterior del mismo carrito se cancela: nunca
// quedan dos pedidos pendientes por carrito ni una gift card atrapada en el viejo.

const line = (over: Partial<CartLine> = {}): CartLine => ({
  id: "ci1", kind: "variant", refId: "v1", unitPrice: 3000, qty: 1, weightGr: 100, productId: "p1", categoryId: "c1", isGiftCard: false, ...over,
});
const physical: CheckoutLineInput = { line: line(), productNameSnapshot: "Labial", variantNameSnapshot: "V", skuSnapshot: "S", title: "T" };
const giftCard: CouponRow = {
  id: "gc-1", code: "GIFT-AAAA-BBBB", type: "fixed", value: 1000, scope: "all", scopeId: null, active: true, minSubtotal: null,
  validFrom: null, validTo: null, maxUses: 1, usedCount: 0, perCustomerLimit: null, sourceOrderId: "ord-src",
};

function makeDeps(opts: { previousPending?: string[]; coupon?: CouponRow | null } = {}) {
  const calls: string[] = [];
  const tx = {
    order: {
      findMany: vi.fn(async () => (opts.previousPending ?? []).map((id) => ({ id }))),
      updateMany: vi.fn(async ({ where }: { where: { id: string } }) => { calls.push(`cancel:${where.id}`); return { count: 1 }; }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "ord-new", ...data, payments: [{ id: "pay-1" }] })),
    },
    payment: { update: vi.fn(async () => ({})) },
    cart: { update: vi.fn(async () => ({})) },
    coupon: {
      updateMany: vi.fn(async ({ data }: { data: { usedCount?: { increment?: number; decrement?: number } } }) => {
        calls.push(data.usedCount?.increment ? "reserve" : data.usedCount?.decrement ? "release" : "deactivate");
        return { count: 1 };
      }),
    },
  };
  const deps: CreateCheckoutDeps = {
    db: {
      coupon: { findUnique: vi.fn(async () => opts.coupon ?? null) },
      couponRedemption: { findUnique: vi.fn(async () => null) },
      $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
    } as unknown as CreateCheckoutDeps["db"],
    nextOrderSeq: vi.fn(async () => 2),
    getVariantStock: vi.fn(async (ids: string[]) => new Map(ids.map((id) => [id, 99]))),
    createPreference: vi.fn(async () => ({ id: "pref-1", init_point: "https://mp/ip", sandbox_init_point: "https://mp/sbx" })),
    quoteShipping: vi.fn(async () => ({ cost: 2500, free: false, zoneId: "z1", source: "zone" as const })),
    appUrl: "https://app.test",
    isSandboxToken: true,
    now: new Date("2026-10-07T12:00:00Z"),
  };
  return { deps, tx, calls };
}

const base = {
  contactName: "Ana", contactEmail: "ana@example.com", contactPhone: "1122334455",
  shippingMethod: "domicilio" as const,
  address: { cp: "1414", province: "CABA", street: "Calle", number: "1", city: "CABA" },
  lines: [physical],
  couponCode: null as string | null,
};

describe("createCheckout — ciclo de vida del carrito", () => {
  it("NO marca el carrito como ordered al crear el pedido: lo vincula con cartId", async () => {
    const { deps, tx } = makeDeps();
    await createCheckout({ ...base, cartId: "cart-1" }, deps);
    expect(tx.cart.update).not.toHaveBeenCalled();
    expect(tx.order.create.mock.calls[0][0].data).toMatchObject({ cartId: "cart-1", status: "pending_payment" });
  });

  it("reintento sobre el mismo carrito: cancela el pedido pendiente anterior (con guarda) antes de crear el nuevo", async () => {
    const { deps, tx } = makeDeps({ previousPending: ["ord-old"] });
    await createCheckout({ ...base, cartId: "cart-1" }, deps);
    expect(tx.order.findMany).toHaveBeenCalledWith({ where: { cartId: "cart-1", status: "pending_payment" }, select: { id: true } });
    expect(tx.order.updateMany).toHaveBeenCalledWith({ where: { id: "ord-old", status: "pending_payment" }, data: { status: "cancelled" } });
    expect(tx.order.create).toHaveBeenCalledTimes(1);
  });

  it("libera la gift card del pedido viejo ANTES de reservarla para el nuevo (si no, 'ya fue usada')", async () => {
    const { deps, calls } = makeDeps({ previousPending: ["ord-old"], coupon: giftCard });
    await createCheckout({ ...base, cartId: "cart-1", couponCode: "GIFT-AAAA-BBBB" }, deps);
    expect(calls).toEqual(["cancel:ord-old", "release", "deactivate", "reserve"]);
  });

  it("si el pedido viejo ya no estaba pendiente (lo pagó o venció en el medio) no libera nada", async () => {
    const { deps, tx, calls } = makeDeps({ previousPending: ["ord-old"] });
    tx.order.updateMany.mockResolvedValueOnce({ count: 0 });
    await createCheckout({ ...base, cartId: "cart-1" }, deps);
    expect(calls).not.toContain("release");
    expect(tx.order.create).toHaveBeenCalledTimes(1);
  });

  it("sin carrito (cartId null) no busca pedidos previos", async () => {
    const { deps, tx } = makeDeps();
    await createCheckout({ ...base, cartId: null }, deps);
    expect(tx.order.findMany).not.toHaveBeenCalled();
    expect(tx.order.create.mock.calls[0][0].data).toMatchObject({ cartId: null });
  });
});
