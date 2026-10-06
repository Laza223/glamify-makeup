import { describe, it, expect } from "vitest";
import { deriveShipmentStatus } from "@/lib/shipping/tracking-status";
import type { TrackingEvent } from "@/lib/shipping/micorreo";

const ev = (event: string, status: string | null, facility: string | null, date: string | null): TrackingEvent => ({ event, status, facility, date });

// Historial real de un envío de la cuenta (MiCorreo → Mis envíos → Seguimiento), del más nuevo al más viejo.
const real: TrackingEvent[] = [
  ev("INTENTO DE ENTREGA", "ENTREGA EN SUCURSAL", "OAM VILLA BALLESTER", "11-05-2026 10:10"),
  ev("INTENTO DE ENTREGA", "EN ESPERA EN SUCURSAL", "OAM VILLA BALLESTER", "06-05-2026 13:56"),
  ev("LLEGADA AL CENTRO DE PROCESAMIENTO", null, "OAM VILLA BALLESTER", "06-05-2026 13:56"),
  ev("EN PROCESO DE CLASIFICACIÓN", null, "PAQUETERIA VICENTE LOPEZ", "06-05-2026 09:23"),
  ev("INGRESO AL CORREO", null, "LUJAN", "04-05-2026 12:43"),
  ev("PREIMPOSICION", null, "CORREO ARGENTINO", "27-04-2026 18:14"),
];

describe("deriveShipmentStatus", () => {
  it("historial real con intento de entrega: en camino, esperando en sucursal (NO entregado)", () => {
    expect(deriveShipmentStatus(real)).toEqual({
      status: "in_transit",
      awaitingPickup: true,
      pickupFacility: "OAM VILLA BALLESTER",
      lastEvent: "INTENTO DE ENTREGA · ENTREGA EN SUCURSAL · OAM VILLA BALLESTER · 11-05-2026 10:10",
    });
  });

  it("movimientos sin intento de entrega → en camino", () => {
    const r = deriveShipmentStatus(real.slice(2));
    expect(r.status).toBe("in_transit");
    expect(r.awaitingPickup).toBe(false);
  });

  it("sólo preimposición (todavía no lo despacharon) → sin cambio", () => {
    expect(deriveShipmentStatus(real.slice(-1)).status).toBeNull();
    expect(deriveShipmentStatus([]).status).toBeNull();
  });

  it("entregado → delivered, sin importar el orden de los eventos", () => {
    const delivered = [...real].reverse().concat(ev("ENTREGADO", "ENTREGADO AL DESTINATARIO", "OAM VILLA BALLESTER", "12-05-2026 11:00"));
    const r = deriveShipmentStatus(delivered);
    expect(r.status).toBe("delivered");
    expect(r.lastEvent).toContain("12-05-2026 11:00");
  });

  it("'NO ENTREGADO' no cuenta como entregado", () => {
    expect(deriveShipmentStatus([ev("VISITA", "NO ENTREGADO - AUSENTE", "LUJAN", "05-05-2026 10:00")]).status).toBe("in_transit");
  });

  it("devolución al remitente → returned", () => {
    expect(deriveShipmentStatus([...real, ev("DEVOLUCIÓN AL REMITENTE", null, "OAM VILLA BALLESTER", "20-05-2026 09:00")]).status).toBe("returned");
  });
});
