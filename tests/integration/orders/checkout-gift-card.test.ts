import { describe, it, expect, vi } from "vitest";
import { createCheckout, type CreateCheckoutDeps, type CheckoutLineInput, type CouponRow } from "@/lib/orders/checkout-service";
import type { CartLine } from "@/lib/cart/types";

const cartLine = (over: Partial<CartLine> = {}): CartLine => ({
  id: "ci1", kind: "variant", refId: "v1", unitPrice: 3000, qty: 1, weightGr: 100, productId: "p1", categoryId: "c1", isGiftCard: false, ...over,
});
const checkoutLine = (line: CartLine): CheckoutLineInput => ({
  line, productNameSnapshot: line.isGiftCard ? "Gift Card Glamify" : "Labial", variantNameSnapshot: "V", skuSnapshot: "S", title: "T",
});
const physical = checkoutLine(cartLine());
const gift20k = checkoutLine(cartLine({ id: "g1", refId: "gv1", unitPrice: 20000, weightGr: 0, isGiftCard: true }));

const giftCardCoupon = (over: Partial<CouponRow> = {}): CouponRow => ({
  id: "gc-1", code: "GIFT-AAAA-BBBB", type: "fixed", value: 5000, scope: "all", scopeId: null, active: true, minSubtotal: null,
  validFrom: null, validTo: new Date("2027-04-07T00:00:00Z"), maxUses: 1, usedCount: 0, perCustomerLimit: null, sourceOrderId: "ord-src", ...over,
});

function makeDeps(opts: { coupon?: CouponRow | null; reserveCount?: number } = {}) {
  const tx = {
    order: { create: vi.fn(async ({ data }: any) => ({ id: "ord-1", ...data, payments: [{ id: "pay-1" }] })) },
    payment: { update: vi.fn(async () => ({})) },
    cart: { update: vi.fn(async () => ({})) },
    coupon: { updateMany: vi.fn(async () => ({ count: opts.reserveCount ?? 1 })) },
  };
  const quoteShipping = vi.fn(async (_input: { subtotal: number }) => ({ cost: 2500, free: false, zoneId: "z1", source: "zone" as const }));
  const deps: CreateCheckoutDeps = {
    db: {
      coupon: { findUnique: vi.fn(async () => opts.coupon ?? null) },
      couponRedemption: { findUnique: vi.fn(async () => null) },
      $transaction: vi.fn(async (fn: any) => fn(tx)),
    } as any,
    nextOrderSeq: vi.fn(async () => 1),
    getVariantStock: vi.fn(async (ids: string[]) => new Map(ids.map((id) => [id, 99]))),
    createPreference: vi.fn(async () => ({ id: "pref-1", init_point: "https://mp/ip", sandbox_init_point: "https://mp/sbx" })),
    quoteShipping,
    appUrl: "https://app.test",
    isSandboxToken: true,
    now: new Date("2026-10-07T12:00:00Z"),
  };
  return { deps, tx, quoteShipping };
}

const base = {
  contactName: "Ana", contactEmail: "ana@example.com", contactPhone: "1122334455",
  shippingMethod: "domicilio" as const,
  address: { cp: "1414", province: "CABA", street: "Calle", number: "1", city: "CABA" },
  couponCode: null as string | null,
};

describe("createCheckout — gift cards", () => {
  it("solo gift cards → método digital, envío 0, dirección vacía, peso 0 y sin cotizar (aunque el cliente mande otra cosa)", async () => {
    const { deps, tx, quoteShipping } = makeDeps();
    await createCheckout({ ...base, shippingMethod: "sucursal", address: { cp: "" }, lines: [gift20k] }, deps);
    const data = tx.order.create.mock.calls[0][0].data;
    expect(quoteShipping).not.toHaveBeenCalled();
    expect(data).toMatchObject({ shippingMethod: "digital", shippingAddress: {}, shippingCost: 0, weightGr: 0, subtotal: 20000, total: 20000 });
    expect(data.items.create[0]).toMatchObject({ isGiftCard: true });
  });

  it("carrito mixto → cotiza con peso sin gift cards y subtotal físico (no cuenta para envío gratis)", async () => {
    const { deps, tx, quoteShipping } = makeDeps();
    await createCheckout({ ...base, lines: [physical, gift20k] }, deps);
    const q = quoteShipping.mock.calls[0][0];
    expect(q.subtotal).toBe(3000); // sin los $20.000 de la gift card
    const data = tx.order.create.mock.calls[0][0].data;
    expect(data.shippingMethod).toBe("domicilio");
    expect(data.weightGr).toBe(100); // la gift card no pesa
    expect(data.shippingCost).toBe(2500);
    expect(data.total).toBe(25500); // 23000 + 2500
    expect(data.items.create.map((i: any) => i.isGiftCard)).toEqual([false, true]);
  });

  it("carrito físico con dirección incompleta → error claro (validación server)", async () => {
    const { deps } = makeDeps();
    await expect(createCheckout({ ...base, address: { cp: "1414", city: "CABA" }, lines: [physical] }, deps)).rejects.toThrow(/calle y número/i);
    await expect(createCheckout({ ...base, address: { cp: "14", city: "CABA", street: "a", number: "1" }, lines: [physical] }, deps)).rejects.toThrow(/código postal/i);
  });

  it("total 0 → error", async () => {
    const { deps } = makeDeps();
    deps.quoteShipping = vi.fn(async () => ({ cost: 0, free: true, zoneId: null, source: "free" as const }));
    const free = checkoutLine(cartLine({ unitPrice: 0 }));
    await expect(createCheckout({ ...base, lines: [free] }, deps)).rejects.toThrow("El total no puede ser $0.");
  });

  describe("pedido digital ignora cupones", () => {
    const pctCoupon = (over: Partial<CouponRow> = {}): CouponRow =>
      giftCardCoupon({ id: "c-9", code: "GLAM10", sourceOrderId: null, type: "percentage", value: 10, maxUses: 100, ...over });

    it("cupón común en carrito solo de gift cards: sin couponId, sin descuento y no falla", async () => {
      const { deps, tx } = makeDeps({ coupon: pctCoupon() });
      await createCheckout({ ...base, lines: [gift20k], couponCode: "GLAM10" }, deps);
      const data = tx.order.create.mock.calls[0][0].data;
      expect(data.couponId).toBeNull();
      expect(data.discountTotal).toBe(0);
      expect(data.total).toBe(20000);
      expect(deps.db.coupon.findUnique).not.toHaveBeenCalled();
    });

    it("cupón de envío gratis en carrito digital: tampoco se aplica", async () => {
      const { deps, tx } = makeDeps({ coupon: pctCoupon({ type: "free_shipping", value: 0 }) });
      await createCheckout({ ...base, lines: [gift20k], couponCode: "GLAM10" }, deps);
      expect(tx.order.create.mock.calls[0][0].data.couponId).toBeNull();
    });

    it("gift card en carrito digital: no reserva ni falla", async () => {
      const { deps, tx } = makeDeps({ coupon: giftCardCoupon(), reserveCount: 0 });
      await expect(createCheckout({ ...base, lines: [gift20k], couponCode: "GIFT-AAAA-BBBB" }, deps)).resolves.toBeDefined();
      expect(tx.coupon.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("falla la preference de MP", () => {
    function withFailingPreference(opts: Parameters<typeof makeDeps>[0] = {}) {
      const made = makeDeps(opts);
      made.deps.createPreference = vi.fn(async () => {
        throw new Error("MP caído");
      });
      const rollbackTx = {
        order: { updateMany: vi.fn(async () => ({ count: 1 })) },
        coupon: { updateMany: vi.fn(async () => ({ count: 1 })) },
        cart: { update: vi.fn(async () => ({})) },
      };
      // 1ª tx = creación del pedido; 2ª = rollback.
      (made.deps.db.$transaction as unknown) = vi
        .fn()
        .mockImplementationOnce(async (fn: (t: unknown) => unknown) => fn(made.tx))
        .mockImplementationOnce(async (fn: (t: unknown) => unknown) => fn(rollbackTx));
      return { ...made, rollbackTx };
    }

    it("cancela el pedido (con precondición pending_payment), libera la gift card, reactiva el carrito y relanza el error", async () => {
      const { deps, rollbackTx } = withFailingPreference({ coupon: giftCardCoupon() });
      await expect(createCheckout({ ...base, lines: [physical], couponCode: "GIFT-AAAA-BBBB", cartId: "cart-1" }, deps)).rejects.toThrow("MP caído");
      expect(rollbackTx.order.updateMany).toHaveBeenCalledWith({ where: { id: "ord-1", status: "pending_payment" }, data: { status: "cancelled" } });
      expect(rollbackTx.coupon.updateMany).toHaveBeenCalledWith({
        where: { sourceOrderId: { not: null }, orders: { some: { id: "ord-1" } }, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
      expect(rollbackTx.cart.update).toHaveBeenCalledWith({ where: { id: "cart-1" }, data: { status: "active" } });
    });

    it("si el pedido ya no estaba pending_payment (count 0) no libera ni toca el carrito", async () => {
      const { deps, rollbackTx } = withFailingPreference();
      rollbackTx.order.updateMany.mockResolvedValue({ count: 0 });
      await expect(createCheckout({ ...base, lines: [physical], cartId: "cart-1" }, deps)).rejects.toThrow("MP caído");
      expect(rollbackTx.coupon.updateMany).not.toHaveBeenCalled();
      expect(rollbackTx.cart.update).not.toHaveBeenCalled();
    });

    it("si el rollback también falla, igual se propaga el error original de MP", async () => {
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      const made = makeDeps();
      made.deps.createPreference = vi.fn(async () => {
        throw new Error("MP caído");
      });
      (made.deps.db.$transaction as unknown) = vi
        .fn()
        .mockImplementationOnce(async (fn: (t: unknown) => unknown) => fn(made.tx))
        .mockRejectedValueOnce(new Error("db caída"));
      await expect(createCheckout({ ...base, lines: [physical] }, made.deps)).rejects.toThrow("MP caído");
      err.mockRestore();
    });
  });

  describe("cupón gift card", () => {
    it("descuenta solo lo físico (tope: base física), no el envío, y se reserva en la tx", async () => {
      const { deps, tx } = makeDeps({ coupon: giftCardCoupon() });
      await createCheckout({ ...base, lines: [physical, gift20k], couponCode: "GIFT-AAAA-BBBB" }, deps);
      const data = tx.order.create.mock.calls[0][0].data;
      expect(data.discountTotal).toBe(3000); // tope = 3000 físicos, no 5000
      expect(data.total).toBe(22500); // 23000 - 3000 + 2500 envío
      expect(data.couponId).toBe("gc-1");
      expect(tx.coupon.updateMany).toHaveBeenCalledWith({ where: { id: "gc-1", active: true, usedCount: { lt: 1 } }, data: { usedCount: { increment: 1 } } });
    });

    it("ya usada (perdió la carrera: count 0) → error y no se crea el pedido", async () => {
      const { deps, tx } = makeDeps({ coupon: giftCardCoupon(), reserveCount: 0 });
      await expect(createCheckout({ ...base, lines: [physical], couponCode: "GIFT-AAAA-BBBB" }, deps)).rejects.toThrow("Esta gift card ya fue usada.");
      expect(tx.order.create).not.toHaveBeenCalled();
      expect((deps.createPreference as any)).not.toHaveBeenCalled();
    });

    it("ya consumida (usedCount = maxUses) se ignora como cualquier cupón inválido: sin descuento ni reserva", async () => {
      const { deps, tx } = makeDeps({ coupon: giftCardCoupon({ usedCount: 1 }) });
      await createCheckout({ ...base, lines: [physical], couponCode: "GIFT-AAAA-BBBB" }, deps);
      expect(tx.order.create.mock.calls[0][0].data.couponId).toBeNull();
      expect(tx.coupon.updateMany).not.toHaveBeenCalled();
    });

    it("en un carrito solo de gift cards no descuenta nada → no se aplica ni se reserva (no se quema gratis)", async () => {
      const { deps, tx } = makeDeps({ coupon: giftCardCoupon() });
      await createCheckout({ ...base, lines: [gift20k], couponCode: "GIFT-AAAA-BBBB" }, deps);
      const data = tx.order.create.mock.calls[0][0].data;
      expect(data.couponId).toBeNull();
      expect(data.discountTotal).toBe(0);
      expect(tx.coupon.updateMany).not.toHaveBeenCalled();
    });

    it("un cupón común NO se reserva en el checkout (se cuenta en el webhook)", async () => {
      const { deps, tx } = makeDeps({ coupon: giftCardCoupon({ id: "c-1", code: "GLAM10", sourceOrderId: null, type: "percentage", value: 10, maxUses: 100 }) });
      await createCheckout({ ...base, lines: [physical, gift20k], couponCode: "GLAM10" }, deps);
      const data = tx.order.create.mock.calls[0][0].data;
      expect(data.discountTotal).toBe(300); // 10% de lo físico solamente
      expect(tx.coupon.updateMany).not.toHaveBeenCalled();
    });
  });
});
