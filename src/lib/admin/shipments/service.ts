import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import { canTransition, canTransitionShipment } from "@/lib/orders/state-machine";
import { sendEmail as realSendEmail } from "@/lib/email/resend";
import { shipmentDispatchedEmail } from "@/lib/email/templates";
import { storeWhatsappUrl } from "@/lib/email/whatsapp-url";
import type { ShipmentStatus, ShipmentCarrier, OrderStatus } from "@prisma/client";

/** Datos de envío que carga la admin en el detalle del pedido. */
export interface ShipmentInput {
  service: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  cost: number;
  status: ShipmentStatus;
  carrier?: ShipmentCarrier;
}

/** Campos del pedido que necesita el upsert (status + datos para el mail de despacho). */
interface ShipmentOrderRow {
  id: string;
  status: OrderStatus;
  orderNumber: string;
  contactName: string;
  contactEmail: string;
}

export interface ShipmentsDb {
  order: { findUnique: (args: { where: { id: string } }) => Promise<ShipmentOrderRow | null> };
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

/**
 * Crea o actualiza el Shipment del pedido (Order 0..1 Shipment, orderId @unique).
 * Si se carga trackingNumber y la transición a `shipped` es válida, mueve el pedido a `shipped`
 * y le avisa a la clienta por email (una sola vez: reguardar un pedido ya `shipped` no re-dispara).
 * El upsert va en una transacción; el email es best-effort fuera de ella.
 */
export async function upsertShipment(
  orderId: string,
  input: ShipmentInput,
  deps: ShipmentsDeps,
): Promise<{ id: string }> {
  const order = await deps.db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("El pedido no existe.");

  const data = {
    carrier: input.carrier ?? ("correo_argentino" as ShipmentCarrier),
    service: input.service,
    trackingNumber: input.trackingNumber,
    labelUrl: input.labelUrl,
    cost: input.cost,
    status: input.status,
  };

  let movedToShipped = false;
  await deps.db.$transaction(async (tx) => {
    const existing = await tx.shipment.findUnique({ where: { orderId } });
    if (existing) {
      if (!canTransitionShipment(existing.status, input.status)) {
        throw new Error(`No se puede pasar el envío de "${existing.status}" a "${input.status}" directamente.`);
      }
      await tx.shipment.update({ where: { orderId }, data });
    } else {
      await tx.shipment.create({ data: { orderId, ...data } });
    }
    // Cargar tracking mueve el pedido a shipped (guardado por la máquina de estados).
    if (
      input.trackingNumber &&
      order.status !== "shipped" &&
      canTransition(order.status, "shipped")
    ) {
      // Precondición atómica sobre el status (igual que el webhook, webhook-service.ts): si otra
      // llamada concurrente ya movió el pedido a shipped, ésta pierde la carrera (count 0) y NO
      // re-dispara el mail "tu pedido salió" a la clienta.
      const res = await tx.order.updateMany({ where: { id: orderId, status: order.status }, data: { status: "shipped" } });
      movedToShipped = res.count === 1;
    }
  });

  // Aviso a la clienta: "tu pedido salió" con el número de seguimiento. Best-effort: si el mail
  // falla, el envío ya se guardó igual. Solo cuando el pedido RECIÉN pasó a shipped en esta llamada.
  if (movedToShipped && input.trackingNumber && deps.sendEmail) {
    try {
      const mail = shipmentDispatchedEmail({
        orderNumber: order.orderNumber,
        contactName: order.contactName,
        trackingNumber: input.trackingNumber,
        service: input.service,
        whatsappUrl: deps.getWhatsappUrl ? await deps.getWhatsappUrl(`¡Hola! Tengo una consulta sobre mi pedido ${order.orderNumber}`) : null,
      });
      await deps.sendEmail({ to: order.contactEmail, subject: mail.subject, html: mail.html, text: mail.text });
    } catch (e) {
      console.error(`[shipment] no pude avisar a la clienta del pedido ${order.orderNumber}:`, e instanceof Error ? e.message : e);
    }
  }

  return { id: orderId };
}
