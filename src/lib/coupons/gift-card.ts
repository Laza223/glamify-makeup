/** Vigencia de una gift card desde que se emite. */
export const GIFT_CARD_VALID_MONTHS = 6;

/** Suma meses en UTC; si el día no existe en el mes destino (31 ago + 6 → feb) cae al último día de ese mes. */
export function addMonthsUtc(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/** dd/mm/aaaa en hora de Argentina (para mails y admin). */
export function formatGiftCardDate(d: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(d);
}

export type GiftCardStatus = "unused" | "used" | "voided" | "expired";

export const GIFT_CARD_STATUS_LABELS: Record<GiftCardStatus, string> = {
  unused: "Sin usar",
  used: "Usada",
  voided: "Anulada",
  expired: "Vencida",
};

/** Estado de una gift card (cupón con `sourceOrderId`). "Usada" gana: una usada nunca se anula. */
export function giftCardStatus(
  c: { active: boolean; usedCount: number; maxUses: number | null; validTo: Date | null },
  now: Date,
): GiftCardStatus {
  if (c.usedCount >= (c.maxUses ?? 1)) return "used";
  if (!c.active) return "voided";
  if (c.validTo && now > c.validTo) return "expired";
  return "unused";
}
