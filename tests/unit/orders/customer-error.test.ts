import { describe, it, expect, vi } from "vitest";
import { CustomerFacingError, customerErrorMessage, paymentErrorMessage } from "@/lib/orders/customer-error";

describe("paymentErrorMessage", () => {
  it("muestra tal cual los mensajes escritos para la clienta", () => {
    expect(paymentErrorMessage(new CustomerFacingError("Justo se agotó Labial."), "checkout")).toBe("Justo se agotó Labial.");
  });

  it("un timeout de MP se traduce a un mensaje de conexión", () => {
    expect(paymentErrorMessage(new DOMException("timed out", "TimeoutError"), "checkout")).toMatch(/No pudimos conectar con Mercado Pago/);
  });

  it("nunca muestra errores técnicos (MP, Prisma): los loguea y devuelve uno genérico", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const raw = new Error('MP createPreference falló: 400 {"message":"invalid token"}');
    const msg = paymentErrorMessage(raw, "checkout");
    expect(msg).toBe("No pudimos iniciar el pago. Probá de nuevo en unos segundos.");
    expect(msg).not.toMatch(/MP createPreference/);
    expect(log).toHaveBeenCalledWith("[checkout]", raw);
    log.mockRestore();
  });
});

describe("customerErrorMessage", () => {
  it("muestra tal cual los mensajes escritos para la clienta, sin loguear", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(customerErrorMessage(new CustomerFacingError("Variante no disponible."), "add-to-cart", "No pudimos sumarlo.")).toBe("Variante no disponible.");
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("nunca muestra errores técnicos (Prisma, runtime): los loguea y devuelve el fallback", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const raw = new Error("Invalid `prisma.cartItem.update()` invocation: connection pool timeout");
    const msg = customerErrorMessage(raw, "add-to-cart", "No pudimos sumarlo al carrito. Probá de nuevo.");
    expect(msg).toBe("No pudimos sumarlo al carrito. Probá de nuevo.");
    expect(msg).not.toMatch(/prisma/i);
    expect(log).toHaveBeenCalledWith("[add-to-cart]", raw);
    log.mockRestore();
  });

  it("un valor que no es Error también cae al fallback", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(customerErrorMessage("boom", "ctx", "Fallback.")).toBe("Fallback.");
    log.mockRestore();
  });
});
