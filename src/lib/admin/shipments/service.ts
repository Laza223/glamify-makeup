import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import { canTransition } from "@/lib/orders/state-machine";
import { sendEmail as realSendEmail } from "@/lib/email/resend";
import { shipmentDispatchedEmail } from "@/lib/email/templates";
import { storeWhatsappUrl } from "@/lib/email/whatsapp-url";
import { absoluteUrl } from "@/lib/seo/url";
import { carrierLabel, isCarrier, type CarrierId } from "@/lib/shipping/carriers";
import { toNumber } from "@/lib/catalog/pricing";
import type { Money } from "@/lib/catalog/types";
import type { ShipmentStatus, OrderStatus } from "@prisma/client";

/** Lo que carga la dueña al despachar: empresa (de la lista) y código de seguimiento. */
export interface ShipmentInput {
  carrier: string;
  trackingNumber: string;
  /** Solo pedidos a sucursal: dónde retira la clienta (texto libre, opcional). Va en el mail. */
  pickupBranch?: string;
}

const MAX_TRACKING_LENGTH = 80;
const MAX_PICKUP_BRANCH_LENGTH = 160;

/** Shipment ya guardado (si existe) del pedido. */
interface ExistingShipmentRow {
  carrier: CarrierId;
  trackingNumber: string | null;
}

/** Campos del pedido que necesita el upsert (status + datos para el mail de despacho). */
interface ShipmentOrderRow {
  id: string;
  status: OrderStatus;
  orderNumber: string;
  contactName: string;
  contactEmail: string;
  shippingMethod: string;
  shippingCost: Money;
  shippingAddress: unknown;
  shipment: ExistingShipmentRow | null;
}

export interface ShipmentsDb {
  order: { findUnique: (args: { where: { id: string }; include: { shipment: true } }) => Promise<ShipmentOrderRow | null> };
  $transaction: <T>(fn: (tx: PrismaTransactionClient) => Promise<T>) => Promise<T>;
}

export interface ShipmentsDeps {
  db: ShipmentsDb;
  /** Aviso de despacho a la clienta (inyectable para tests). Best-effort. */
  sendEmail?: typeof realSendEmail;
  /** Link de WhatsApp de la tienda para el mail a la clienta (inyectable para tests). Best-effort. */
  getWhatsappUrl?: (message?: string) => Promise<string | null>;
  now?: Date;
}

export function defaultShipmentsDeps(): ShipmentsDeps {
  return { db: prisma as unknown as ShipmentsDb, sendEmail: realSendEmail, getWhatsappUrl: storeWhatsappUrl };
}

const DIGITAL_ORDER_NO_SHIPPING = "Los pedidos digitales no llevan envío.";

/** Pedidos en los que tiene sentido cargar el seguimiento (ya pagados). */
const TRACKING_ALLOWED_STATUSES: OrderStatus[] = ["paid", "preparing", "shipped", "delivered"];

function addressObject(address: unknown): Record<string, unknown> {
  return address !== null && typeof address === "object" ? (address as Record<string, unknown>) : {};
}

/** Sucursal de retiro guardada en el snapshot de dirección (trackingLastEvent la pisaría el cron de Correo). */
function readPickupBranch(address: unknown): string | null {
  const v = addressObject(address).pickupBranch;
  return typeof v === "string" && v.trim() ? v : null;
}

async function buildDispatchMail(
  order: Pick<ShipmentOrderRow, "id" | "orderNumber" | "contactName" | "shippingMethod">,
  carrier: CarrierId,
  trackingNumber: string,
  pickupBranch: string | null,
  deps: ShipmentsDeps,
) {
  const isSucursal = order.shippingMethod === "sucursal";
  return shipmentDispatchedEmail({
    orderNumber: order.orderNumber,
    contactName: order.contactName,
    carrier: carrierLabel(carrier),
    trackingNumber,
    isSucursal,
    pickupBranch: isSucursal ? pickupBranch : null,
    trackingUrl: absoluteUrl(`/seguimiento/${order.id}`),
    whatsappUrl: deps.getWhatsappUrl ? await deps.getWhatsappUrl(`¡Hola! Tengo una consulta sobre mi pedido ${order.orderNumber}`) : null,
  });
}

/**
 * Despacho manual (ADR 0004): guarda empresa + código de seguimiento del pedido (Order 0..1 Shipment, orderId @unique).
 * - El envío pasa a `dispatched` (si todavía no había salido). Para Correo Argentino los estados siguientes
 *   los actualiza el cron de seguimiento (`src/lib/shipping/tracking-job.ts`); para las otras empresas, la dueña.
 * - El pedido pasa a `shipped` con precondición atómica sobre el status.
 * - La clienta recibe el mail de despacho en el primer despacho (pedido recién pasado a shipped) o cuando
 *   cambia el código o la empresa. Guardar sin cambios no reenvía.
 * - Si cambia el código o la empresa, se borra lo consultado antes.
 * El upsert va en una transacción; el email es best-effort fuera de ella.
 */
export async function upsertShipment(
  orderId: string,
  input: ShipmentInput,
  deps: ShipmentsDeps,
): Promise<{ id: string }> {
  if (!isCarrier(input.carrier)) throw new Error("Elegí la empresa de envío.");
  const carrier = input.carrier;
  const trackingNumber = input.trackingNumber.trim();
  if (!trackingNumber) throw new Error("Cargá el número de seguimiento.");
  if (trackingNumber.length > MAX_TRACKING_LENGTH) throw new Error("El código de seguimiento es demasiado largo.");
  const branchInput = (input.pickupBranch ?? "").trim();
  if (branchInput.length > MAX_PICKUP_BRANCH_LENGTH) throw new Error("La sucursal de retiro es demasiado larga.");

  const order = await deps.db.order.findUnique({ where: { id: orderId }, include: { shipment: true } });
  if (!order) throw new Error("El pedido no existe.");
  if (order.shippingMethod === "digital") throw new Error(DIGITAL_ORDER_NO_SHIPPING);
  if (!TRACKING_ALLOWED_STATUSES.includes(order.status)) {
    throw new Error("El pedido todavía no está pagado.");
  }

  const isSucursal = order.shippingMethod === "sucursal";
  const prev = order.shipment;
  const changed = !prev || prev.trackingNumber !== trackingNumber || prev.carrier !== carrier;
  let movedToShipped = false;
  await deps.db.$transaction(async (tx) => {
    const existing = await tx.shipment.findUnique({ where: { orderId } });
    if (existing) {
      const notYetOut = existing.status === "pending" || existing.status === "ready";
      const changedInTx = existing.trackingNumber !== trackingNumber || existing.carrier !== carrier;
      await tx.shipment.update({
        where: { orderId },
        data: {
          carrier,
          trackingNumber,
          ...(notYetOut ? { status: "dispatched" as ShipmentStatus } : {}),
          ...(changedInTx ? { trackingLastEvent: null, trackingCheckedAt: null } : {}),
        },
      });
    } else {
      // Pedido marcado pagado a mano (sin fila de Shipment del webhook): se crea acá.
      await tx.shipment.create({
        data: { orderId, carrier, trackingNumber, status: "dispatched", cost: toNumber(order.shippingCost) },
      });
    }
    if (isSucursal) {
      const rest = { ...addressObject(order.shippingAddress) };
      delete rest.pickupBranch;
      await tx.order.update({
        where: { id: orderId },
        data: { shippingAddress: (branchInput ? { ...rest, pickupBranch: branchInput } : rest) as object },
      });
    }
    if (order.status !== "shipped" && canTransition(order.status, "shipped")) {
      // Precondición atómica sobre el status (igual que el webhook, webhook-service.ts): si otra
      // llamada concurrente ya movió el pedido a shipped, ésta pierde la carrera (count 0) y NO
      // re-dispara el mail "tu pedido salió" a la clienta.
      const res = await tx.order.updateMany({ where: { id: orderId, status: order.status }, data: { status: "shipped" } });
      movedToShipped = res.count === 1;
    }
  });

  // Aviso a la clienta. Best-effort: si el mail falla, el envío ya se guardó igual (hay botón de reenvío).
  const alreadyOut = order.status === "shipped" || order.status === "delivered";
  if ((movedToShipped || (alreadyOut && changed)) && deps.sendEmail) {
    try {
      const mail = await buildDispatchMail(order, carrier, trackingNumber, branchInput || null, deps);
      await deps.sendEmail({ to: order.contactEmail, subject: mail.subject, html: mail.html, text: mail.text });
    } catch (e) {
      console.error(`[shipment] no pude avisar a la clienta del pedido ${order.orderNumber}:`, e instanceof Error ? e.message : e);
    }
  }

  return { id: orderId };
}

/**
 * Reenvía el mail de despacho con los datos ya guardados (cuando el primer envío falló).
 * A diferencia del alta, acá el fallo de Resend SÍ se propaga: la dueña lo pidió a mano.
 */
export async function resendDispatchEmail(orderId: string, deps: ShipmentsDeps): Promise<{ id: string }> {
  const order = await deps.db.order.findUnique({ where: { id: orderId }, include: { shipment: true } });
  if (!order) throw new Error("El pedido no existe.");
  const sh = order.shipment;
  if (order.status !== "shipped" || !sh?.trackingNumber || !deps.sendEmail) {
    throw new Error("El pedido no tiene un despacho cargado para reenviar.");
  }
  try {
    const mail = await buildDispatchMail(order, sh.carrier, sh.trackingNumber, readPickupBranch(order.shippingAddress), deps);
    await deps.sendEmail({ to: order.contactEmail, subject: mail.subject, html: mail.html, text: mail.text });
  } catch (e) {
    console.error(`[shipment] no pude reenviar el mail de despacho del pedido ${order.orderNumber}:`, e instanceof Error ? e.message : e);
    throw new Error("No se pudo enviar el mail. Probá de nuevo en un rato.");
  }
  return { id: orderId };
}
