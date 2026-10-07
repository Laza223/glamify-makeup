import { prisma } from "@/lib/prisma";
import { sendEmail as realSendEmail } from "@/lib/email/resend";
import { giftCardEmail } from "@/lib/email/templates";
import { storeWhatsappUrl } from "@/lib/email/whatsapp-url";
import { toNumber } from "@/lib/catalog/pricing";
import { giftCardStatus } from "@/lib/coupons/gift-card";
import type { Money } from "@/lib/catalog/types";

interface GiftCardOrderRow {
  orderNumber: string;
  contactName: string;
  contactEmail: string;
}
interface GiftCardRow {
  code: string;
  value: Money;
  active: boolean;
  usedCount: number;
  maxUses: number | null;
  validTo: Date | null;
}

export interface GiftCardMailDb {
  order: { findUnique: (args: { where: { id: string } }) => Promise<GiftCardOrderRow | null> };
  coupon: { findMany: (args: { where: { sourceOrderId: string }; orderBy: { code: "asc" } }) => Promise<GiftCardRow[]> };
}
export interface GiftCardMailDeps {
  db: GiftCardMailDb;
  sendEmail: typeof realSendEmail;
  getWhatsappUrl?: (message?: string) => Promise<string | null>;
  now?: Date;
}

export function defaultGiftCardMailDeps(): GiftCardMailDeps {
  return { db: prisma as unknown as GiftCardMailDb, sendEmail: realSendEmail, getWhatsappUrl: storeWhatsappUrl };
}

/**
 * Reenvía al `contactEmail` del pedido el mail con sus gift cards todavía utilizables (sin usar,
 * sin anular y sin vencer). Lanza con mensaje claro si no hay ninguna o si el envío falla.
 */
export async function resendGiftCardEmail(orderId: string, deps: GiftCardMailDeps): Promise<{ sent: number }> {
  const order = await deps.db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("El pedido no existe.");
  const now = deps.now ?? new Date();
  const rows = await deps.db.coupon.findMany({ where: { sourceOrderId: orderId }, orderBy: { code: "asc" } });
  const cards = rows
    .filter((c) => c.validTo != null && giftCardStatus(c, now) === "unused")
    .map((c) => ({ code: c.code, amount: toNumber(c.value), validTo: c.validTo as Date }));
  if (cards.length === 0) throw new Error("Este pedido no tiene gift cards sin usar para reenviar.");

  const whatsappUrl = deps.getWhatsappUrl ? await deps.getWhatsappUrl(`¡Hola! Tengo una consulta sobre mi pedido ${order.orderNumber}`).catch(() => null) : null;
  const mail = giftCardEmail({ orderNumber: order.orderNumber, contactName: order.contactName, cards, whatsappUrl });
  await deps.sendEmail({ to: order.contactEmail, subject: mail.subject, html: mail.html, text: mail.text });
  return { sent: cards.length };
}
