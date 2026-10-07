import { describe, it, expect } from "vitest";
import { paymentReturnView } from "@/lib/payments/return-view";

describe("paymentReturnView (vuelta de Mercado Pago a /checkout/gracias)", () => {
  it("pedido ya pagado → paid, diga lo que diga MP", () => {
    for (const s of ["paid", "preparing", "shipped", "delivered"]) expect(paymentReturnView(s, "rejected")).toBe("paid");
  });

  it("MP aprobó pero el webhook todavía no llegó → approved_pending: NO ofrecer reintentar (doble pago)", () => {
    expect(paymentReturnView("pending_payment", "approved")).toBe("approved_pending");
  });

  it("pago en proceso → confirming, sin reintento", () => {
    expect(paymentReturnView("pending_payment", "in_process")).toBe("confirming");
    expect(paymentReturnView("pending_payment", "pending")).toBe("confirming");
  });

  it("rechazado, abandonado en MP o visita directa → retry", () => {
    expect(paymentReturnView("pending_payment", "rejected")).toBe("retry");
    expect(paymentReturnView("pending_payment", "null")).toBe("retry");
    expect(paymentReturnView("pending_payment", undefined)).toBe("retry");
  });

  it("pedido cancelado o reembolsado → closed (sin botón de pago)", () => {
    expect(paymentReturnView("cancelled", undefined)).toBe("closed");
    expect(paymentReturnView("refunded", "approved")).toBe("closed");
  });
});
