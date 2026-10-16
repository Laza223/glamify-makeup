import { describe, it, expect } from "vitest";
import { CARRIERS, carrierLabel, carrierTrackingUrl, isCarrier } from "@/lib/shipping/carriers";
import { CORREO_TRACKING_URL } from "@/lib/shipping/tracking";

describe("carriers", () => {
  it("tiene las cuatro empresas de la dueña", () => {
    expect(CARRIERS.map((c) => c.id)).toEqual(["correo_argentino", "andreani", "oca", "via_cargo"]);
  });
  it("isCarrier valida contra la lista", () => {
    expect(isCarrier("andreani")).toBe(true);
    expect(isCarrier("fedex")).toBe(false);
    expect(isCarrier(undefined)).toBe(false);
  });
  it("etiqueta y link por empresa; Correo usa el link de tracking.ts", () => {
    expect(carrierLabel("via_cargo")).toBe("Vía Cargo");
    expect(carrierTrackingUrl("correo_argentino")).toBe(CORREO_TRACKING_URL);
    expect(carrierTrackingUrl("oca")).toBe("https://www.oca.com.ar/Busquedas/Seguimientos");
  });
});
