// Módulo puro (sin prisma): lo importan también el form del admin (client) y las páginas de seguimiento.
import { CORREO_TRACKING_URL } from "@/lib/shipping/tracking";

export type CarrierId = "correo_argentino" | "andreani" | "oca" | "via_cargo";

/**
 * Empresas con las que despacha la dueña. El link es la página oficial de seguimiento:
 * ninguna tiene un link público con el código adentro (Correo Argentino pide captcha),
 * así que la clienta pega el código que le llega en el mail.
 */
export const CARRIERS: ReadonlyArray<{ id: CarrierId; name: string; trackingUrl: string }> = [
  { id: "correo_argentino", name: "Correo Argentino", trackingUrl: CORREO_TRACKING_URL },
  { id: "andreani", name: "Andreani", trackingUrl: "https://www.andreani.com/" },
  { id: "oca", name: "OCA", trackingUrl: "https://www.oca.com.ar/Busquedas/Seguimientos" },
  { id: "via_cargo", name: "Vía Cargo", trackingUrl: "https://viacargo.com.ar/seguimiento-de-envio/" },
];

export function isCarrier(x: unknown): x is CarrierId {
  return CARRIERS.some((c) => c.id === x);
}

export function carrierLabel(id: CarrierId): string {
  return CARRIERS.find((c) => c.id === id)?.name ?? id;
}

export function carrierTrackingUrl(id: CarrierId): string {
  return CARRIERS.find((c) => c.id === id)?.trackingUrl ?? CORREO_TRACKING_URL;
}
