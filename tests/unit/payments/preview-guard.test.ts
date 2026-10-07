import { describe, it, expect, afterEach } from "vitest";
import { createCheckoutAction, retryPaymentAction } from "@/app/(storefront)/actions";

// Los previews de Vercel comparten DB (y pueden compartir credenciales de MP) con prod:
// un "Pagar" desde un preview crearía un pedido real. El guard corta antes de cualquier I/O.
describe("pagos desactivados en previews de Vercel", () => {
  const prev = process.env.VERCEL_ENV;
  afterEach(() => {
    if (prev === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prev;
  });

  const input = {
    contactName: "Ana",
    contactEmail: "ana@example.com",
    contactPhone: "1122334455",
    shippingMethod: "domicilio" as const,
    address: { cp: "6700" },
  };

  it("createCheckoutAction no crea el pedido en preview", async () => {
    process.env.VERCEL_ENV = "preview";
    const r = await createCheckoutAction(input);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/vista previa/i);
  });

  it("retryPaymentAction tampoco reintenta el pago en preview", async () => {
    process.env.VERCEL_ENV = "preview";
    const r = await retryPaymentAction("00000000-0000-0000-0000-000000000000");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/vista previa/i);
  });
});
