import type { ShipmentStatus } from "@prisma/client";
import type { TrackingEvent } from "@/lib/shipping/micorreo";

export interface DerivedTracking {
  /** Estado del envío según Correo; `null` = todavía no hay movimientos reales (sólo preimposición). */
  status: Extract<ShipmentStatus, "in_transit" | "delivered" | "returned"> | null;
  /** Intento de entrega fallido y el paquete quedó en la sucursal para retirar. */
  awaitingPickup: boolean;
  /** Sucursal donde espera el paquete (si `awaitingPickup`). */
  pickupFacility: string | null;
  /** Último movimiento, legible para el panel y Mis pedidos. */
  lastEvent: string | null;
}

const norm = (s: string | null | undefined): string =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

// Cadenas tomadas de la tabla "Movimientos del envío" de MiCorreo. Las de entregado y
// devuelto todavía no se vieron en un envío real: se matchean conservador y lo que no se
// reconoce queda "en camino" (nunca se marca entregado por adivinar).
// "ENTREGA EN SUCURSAL" (estado de un INTENTO DE ENTREGA) NO es entregado.
const isDelivered = (t: string) => /\bENTREGAD[OA]\b/.test(t) && !/\bNO ENTREGAD/.test(t) || t.includes("ENTREGA EFECTIVA");
const isReturned = (t: string) => /DEVOL|DEVUELT|RETORNO AL REMITENTE/.test(t);
const isAwaitingPickup = (e: TrackingEvent) => norm(e.event).includes("INTENTO DE ENTREGA") && norm(e.status).includes("SUCURSAL");
const isPreimposicion = (e: TrackingEvent) => norm(e.event).includes("PREIMPOSICION");

/** "11-05-2026 10:10" | ISO → epoch ms; NaN si no se puede leer. */
function eventTime(date: string | null): number {
  if (!date) return NaN;
  const m = date.match(/^(\d{2})[-/](\d{2})[-/](\d{4})(?:[ T](\d{2}):(\d{2}))?/);
  if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1], +(m[4] ?? 0), +(m[5] ?? 0));
  return Date.parse(date);
}

function formatEvent(e: TrackingEvent): string {
  return [e.event, e.status, e.facility, e.date].filter((x) => x && x.trim()).join(" · ");
}

/**
 * Deriva el estado del envío del historial de Correo. No depende del orden en que vengan
 * los eventos: los terminales (entregado / devuelto) cuentan si aparecen en cualquier fila.
 */
export function deriveShipmentStatus(events: TrackingEvent[]): DerivedTracking {
  if (events.length === 0) return { status: null, awaitingPickup: false, pickupFacility: null, lastEvent: null };

  // Último movimiento: el de fecha más nueva; si no hay fechas legibles, el primero (MiCorreo lista del más nuevo al más viejo).
  const latest = events.reduce((a, b) => (eventTime(b.date) > eventTime(a.date) ? b : a), events[0]);
  const lastEvent = formatEvent(latest);
  const texts = events.map((e) => `${norm(e.event)} ${norm(e.status)}`);

  if (texts.some(isDelivered)) return { status: "delivered", awaitingPickup: false, pickupFacility: null, lastEvent };
  if (texts.some(isReturned)) return { status: "returned", awaitingPickup: false, pickupFacility: null, lastEvent };
  if (events.every(isPreimposicion)) return { status: null, awaitingPickup: false, pickupFacility: null, lastEvent };
  const pickup = events.find(isAwaitingPickup);
  return { status: "in_transit", awaitingPickup: Boolean(pickup), pickupFacility: pickup?.facility ?? null, lastEvent };
}
