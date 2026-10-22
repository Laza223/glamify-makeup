import { describe, it, expect, vi, beforeEach } from "vitest";
import { CouponRejectedError, CustomerFacingError } from "@/lib/orders/customer-error";

const setCouponCodeCookie = vi.fn();
const revalidatePath = vi.fn();
const createCheckout = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/cart/cart-cookie", () => ({
  getCartIdFromCookie: vi.fn(),
  setCartIdCookie: vi.fn(),
  getCouponCodeFromCookie: vi.fn(async () => "RECOMPRA"),
  setCouponCodeCookie: (...a: unknown[]) => setCouponCodeCookie(...a),
}));
vi.mock("@/lib/cart/cart-service", () => ({
  loadCart: vi.fn(),
  loadCurrentCart: vi.fn(async () => ({ cart: { items: [{ id: "i1" }] }, cartId: "c1" })),
  createCart: vi.fn(),
  addItem: vi.fn(),
  updateItem: vi.fn(),
  removeItem: vi.fn(),
  cartToCheckoutLines: vi.fn(() => []),
}));
vi.mock("@/lib/customer/auth", () => ({ getCustomer: vi.fn(async () => null) }));
vi.mock("@/lib/orders/checkout-service", () => ({
  createCheckout: (...a: unknown[]) => createCheckout(...a),
  defaultCheckoutDeps: vi.fn(() => ({})),
}));

const { createCheckoutAction } = await import("@/app/(storefront)/actions");

const input = {
  contactName: "Ana",
  contactEmail: "ana@example.com",
  contactPhone: "1122334455",
  shippingMethod: "domicilio" as const,
  address: { cp: "6700" },
};

describe("createCheckoutAction con un cupón que dejó de valer", () => {
  beforeEach(() => {
    setCouponCodeCookie.mockReset();
    revalidatePath.mockReset();
    createCheckout.mockReset();
  });

  it("quita el cupón del carrito y le muestra el motivo a la clienta", async () => {
    createCheckout.mockRejectedValue(new CouponRejectedError("El cupón ya no está disponible: se agotó. Lo quitamos de tu carrito."));
    const r = await createCheckoutAction(input);
    expect(r).toEqual({ ok: false, error: "El cupón ya no está disponible: se agotó. Lo quitamos de tu carrito." });
    expect(setCouponCodeCookie).toHaveBeenCalledWith(null);
    expect(revalidatePath).toHaveBeenCalledWith("/carrito");
    expect(revalidatePath).toHaveBeenCalledWith("/checkout");
  });

  it("otros errores para la clienta no tocan el cupón", async () => {
    createCheckout.mockRejectedValue(new CustomerFacingError("El carrito está vacío."));
    const r = await createCheckoutAction(input);
    expect(r).toEqual({ ok: false, error: "El carrito está vacío." });
    expect(setCouponCodeCookie).not.toHaveBeenCalled();
  });
});
