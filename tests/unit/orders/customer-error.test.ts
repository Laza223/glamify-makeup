import { describe, it, expect, vi } from "vitest";
import { CustomerFacingError, paymentErrorMessage } from "@/lib/orders/customer-error";

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
