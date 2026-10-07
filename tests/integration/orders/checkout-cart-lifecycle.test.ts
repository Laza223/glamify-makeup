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

interface PrevOrder { id: string; payments: Array<{ status: string }> }

/**
 * Fake con estado de la gift card: si el pedido pendiente anterior la usa, arranca reservada
 * (usedCount 1, como en la DB real) y solo vuelve a 0 si alguien la libera.
 */
function makeDeps(opts: { previousPending?: PrevOrder[]; coupon?: CouponRow | null; giftCardReservedByPrevious?: boolean } = {}) {
  const calls: string[] = [];
  const state = { giftCardUsed: opts.giftCardReservedByPrevious ? 1 : 0 };
  const tx = {
    order: {
      findMany: vi.fn(async () => opts.previousPending ?? []),
      updateMany: vi.fn(async ({ where }: { where: { id: string } }) => { calls.push(`cancel:${where.id}`); return { count: 1 }; }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { calls.push("create"); return { id: "ord-new", ...data, payments: [{ id: "pay-1" }] }; }),
    },
    payment: { update: vi.fn(async () => ({})) },
    cart: { update: vi.fn(async () => ({})) },
    coupon: {
      updateMany: vi.fn(async ({ where, data }: { where: { usedCount?: { lt?: number } }; data: { usedCount?: { increment?: number; decrement?: number } } }) => {
        if (data.usedCount?.increment) {
          calls.push("reserve");
          if (state.giftCardUsed >= (where.usedCount?.lt ?? 1)) return { count: 0 };
          state.giftCardUsed++;
          return { count: 1 };
        }
        if (data.usedCount?.decrement) {
          calls.push("release");
          state.giftCardUsed = Math.max(0, state.giftCardUsed - 1);
          return { count: 1 };
        }
        calls.push("deactivate");
        return { count: 0 };
      }),
    },
  };
  const deps: CreateCheckoutDeps = {
    db: {
      coupon: { findUnique: vi.fn(async () => (opts.coupon ? { ...opts.coupon, usedCount: state.giftCardUsed } : null)) },
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
  return { deps, tx, calls, state };
}

const base = {
  contactName: "Ana", contactEmail: "ana@example.com", contactPhone: "1122334455",
  shippingMethod: "domicilio" as const,
  address: { cp: "1414", province: "CABA", street: "Calle", number: "1", city: "CABA" },
  lines: [physical],
  couponCode: null as string | null,
};
const pending = (id: string, paymentStatus = "pending"): PrevOrder => ({ id, payments: [{ status: paymentStatus }] });

describe("createCheckout — ciclo de vida del carrito", () => {
  it("NO marca el carrito como ordered al crear el pedido: lo vincula con cartId", async () => {
    const { deps, tx } = makeDeps();
    await createCheckout({ ...base, cartId: "cart-1" }, deps);
    expect(tx.cart.update).not.toHaveBeenCalled();
    expect(tx.order.create.mock.calls[0][0].data).toMatchObject({ cartId: "cart-1", status: "pending_payment" });
  });

  it("reintento sobre el mismo carrito: cancela el pedido pendiente anterior (con guarda) antes de crear el nuevo", async () => {
    const { deps, tx, calls } = makeDeps({ previousPending: [pending("ord-old")] });
    await createCheckout({ ...base, cartId: "cart-1" }, deps);
    expect(tx.order.findMany).toHaveBeenCalledWith({
      where: { cartId: "cart-1", status: "pending_payment" },
      select: { id: true, payments: { select: { status: true } } },
    });
    expect(tx.order.updateMany).toHaveBeenCalledWith({ where: { id: "ord-old", status: "pending_payment" }, data: { status: "cancelled" } });
    expect(calls.indexOf("cancel:ord-old")).toBeLessThan(calls.indexOf("create"));
  });

  it("reintento con la MISMA gift card que reservó el pedido viejo: la libera antes de validarla y el descuento se aplica", async () => {
    const { deps, tx, state } = makeDeps({ previousPending: [pending("ord-old")], coupon: giftCard, giftCardReservedByPrevious: true });
    await createCheckout({ ...base, cartId: "cart-1", couponCode: "GIFT-AAAA-BBBB" }, deps);
    const data = tx.order.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ couponId: "gc-1", discountTotal: 1000, total: 4500 }); // 3000 − 1000 + 2500
    expect(state.giftCardUsed).toBe(1); // liberada por el viejo, reservada por el nuevo
  });

  it("pago anterior en proceso o aprobado en MP → no cancela ni crea otro pedido (evita doble cobro)", async () => {
    for (const status of ["in_process", "approved"]) {
      const { deps, tx } = makeDeps({ previousPending: [pending("ord-old", status)] });
      await expect(createCheckout({ ...base, cartId: "cart-1" }, deps)).rejects.toThrow(/pago anterior/i);
      expect(tx.order.updateMany).not.toHaveBeenCalled();
      expect(tx.order.create).not.toHaveBeenCalled();
    }
  });

  it("si el pedido viejo ya no estaba pendiente (lo pagó o venció en el medio) no libera nada", async () => {
    const { deps, tx, calls } = makeDeps({ previousPending: [pending("ord-old")] });
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
