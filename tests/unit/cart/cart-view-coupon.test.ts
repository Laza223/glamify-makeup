import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CartLine } from "@/lib/cart/types";

const line: CartLine = { id: "i1", kind: "variant", refId: "v1", unitPrice: 5000, qty: 1, weightGr: 50, productId: "p1", categoryId: "c1", isGiftCard: false };

const state = vi.hoisted(() => ({ redeemed: 0, customer: { id: "u1" } as { id: string } | null }));

vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));
vi.mock("@/lib/cart/cart-service", () => ({ loadCurrentCart: vi.fn(async () => ({ cart: null, lines: [line] })) }));
vi.mock("@/lib/cart/cart-cookie", () => ({ getCouponCodeFromCookie: vi.fn(async () => "RECOMPRA") }));
vi.mock("@/lib/orders/checkout-data", () => ({ getFreeShippingThreshold: vi.fn(async () => 47500) }));
vi.mock("@/lib/customer/auth", () => ({ getCustomer: vi.fn(async () => state.customer) }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    coupon: {
      findUnique: vi.fn(async () => ({
        id: "cpn1", code: "RECOMPRA", type: "percentage", value: 10, scope: "all", scopeId: null,
        active: true, minSubtotal: null, validFrom: null, validTo: null, maxUses: null, usedCount: 0, perCustomerLimit: 1, sourceOrderId: null,
      })),
    },
    couponRedemption: { findUnique: vi.fn(async () => (state.redeemed > 0 ? { redeemedCount: state.redeemed } : null)) },
  },
}));

import { getCartView } from "@/lib/cart/cart-view";

describe("getCartView — cupón con límite por clienta", () => {
  beforeEach(() => {
    state.redeemed = 0;
    state.customer = { id: "u1" };
  });

  it("no muestra el descuento si la clienta ya agotó su perCustomerLimit (igual que el checkout)", async () => {
    state.redeemed = 1;
    const view = await getCartView();
    expect(view.coupon).toBeNull();
  });

  it("muestra el descuento si todavía le queda uso", async () => {
    const view = await getCartView();
    expect(view.coupon).toMatchObject({ code: "RECOMPRA", discount: 500 });
  });
});
