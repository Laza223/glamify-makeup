import { describe, it, expect } from "vitest";
import { chromeFor } from "@/lib/routes/chrome";

describe("chromeFor", () => {
  it("tienda: todo el chrome, sin barra de compra", () => {
    expect(chromeFor("/tienda")).toEqual({
      header: "full",
      backToCart: false,
      bottomNav: true,
      footer: "full",
      whatsappFab: true,
      exitIntent: true,
      cookieBanner: true,
      buyBar: "none",
    });
  });

  it("checkout: header mínimo con vuelta al carrito y sin popups ni barras", () => {
    const c = chromeFor("/checkout");
    expect(c).toMatchObject({ header: "checkout", backToCart: true, bottomNav: false, footer: "minimal" });
    expect(c.whatsappFab || c.exitIntent || c.cookieBanner).toBe(false);
  });

  it("confirmación de compra: header mínimo sin 'Volver al carrito'", () => {
    expect(chromeFor("/checkout/gracias")).toMatchObject({ header: "checkout", backToCart: false, exitIntent: false });
  });

  it("una ruta que solo empieza con 'checkout' no es el checkout", () => {
    expect(chromeFor("/checkoutx").header).toBe("full");
  });

  it("ficha: barra de compra mobile y sin WhatsApp flotante", () => {
    expect(chromeFor("/producto/gloss-tei")).toMatchObject({ buyBar: "mobile", whatsappFab: false, bottomNav: true });
  });

  it("armá tu kit: barra de compra siempre y sin WhatsApp flotante", () => {
    expect(chromeFor("/arma-tu-kit")).toMatchObject({ buyBar: "always", whatsappFab: false });
  });
});
