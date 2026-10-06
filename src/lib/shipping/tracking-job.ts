import type { ShipmentStatus, OrderStatus } from "@prisma/client";
import type { PrismaTransactionClient } from "@/lib/prisma";
import { canTransitionShipment } from "@/lib/orders/state-machine";
import { getMicorreoTracking, type MicorreoTrackingResult } from "@/lib/shipping/micorreo";
import { deriveShipmentStatus } from "@/lib/shipping/tracking-status";
import {
  shipmentAwaitingPickupEmail,
  shipmentDeliveredEmail,
  shipmentReturnedAlertEmail,
  type EmailContent,
} from "@/lib/email/templates";
import type { sendEmail as realSendEmail } from "@/lib/email/resend";

/** Envío a consultar (con los datos del pedido para los mails). */
export interface TrackingJobShipment {
  id: string;
  trackingNumber: string | null;
  status: ShipmentStatus;
  trackingNotified: string[];
  order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    customerId: string | null;
    contactName: string;
    contactEmail: string;
    contactPhone: string | null;
  };
}

export interface TrackingJobDb {
  shipment: {
    findMany: (args: Record<string, unknown>) => Promise<TrackingJobShipment[]>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
    updateMany: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<{ count: number }>;
  };
  $transaction: <T>(fn: (tx: PrismaTransactionClient) => Promise<T>) => Promise<T>;
}

export interface TrackingJobDeps {
  db: TrackingJobDb;
  now: Date;
  sendEmail: typeof realSendEmail;
  appUrl: string;
  ownerEmail?: string;
  getTracking?: (shippingId: string) => Promise<MicorreoTrackingResult>;
  getWhatsappUrl?: (message?: string) => Promise<string | null>;
  /** No volver a consultar un envío antes de estas horas (default 3). */
  recheckHours?: number;
  /** Dejar de consultar envíos más viejos que estos días (default 60). */
  maxAgeDays?: number;
  /** Tope de consultas por corrida (default 25). */
  batch?: number;
}

export interface TrackingJobResult {
  checked: number;
  updated: number;
  delivered: number;
  notified: number;
  errors: number;
}

type NoticeKey = "awaiting_pickup" | "delivered" | "returned_alert";

/**
 * Consulta en MiCorreo el seguimiento de los pedidos enviados y actualiza solos los estados:
 * envío en camino / entregado / devuelto, y el pedido a `delivered` cuando Correo lo entrega.
 * Avisos (una sola vez cada uno, por `trackingNotified`): clienta cuando el paquete la espera en
 * la sucursal y cuando llega; dueña cuando vuelve al remitente. Un error de Correo o de mail en
 * un envío no corta la corrida.
 */
export async function runShipmentTrackingJob(deps: TrackingJobDeps): Promise<TrackingJobResult> {
  const now = deps.now;
  const getTracking = deps.getTracking ?? ((id: string) => getMicorreoTracking(id));
  const recheckBefore = new Date(now.getTime() - (deps.recheckHours ?? 3) * 3_600_000);
  const oldest = new Date(now.getTime() - (deps.maxAgeDays ?? 60) * 86_400_000);

  const shipments = await deps.db.shipment.findMany({
    where: {
      trackingNumber: { not: null },
      status: { in: ["dispatched", "in_transit"] },
      createdAt: { gte: oldest },
      order: { status: "shipped" },
      OR: [{ trackingCheckedAt: null }, { trackingCheckedAt: { lt: recheckBefore } }],
    },
    orderBy: { trackingCheckedAt: { sort: "asc", nulls: "first" } },
    take: deps.batch ?? 25,
    select: {
      id: true,
      trackingNumber: true,
      status: true,
      trackingNotified: true,
      order: {
        select: { id: true, orderNumber: true, status: true, customerId: true, contactName: true, contactEmail: true, contactPhone: true },
      },
    },
  });

  const result: TrackingJobResult = { checked: 0, updated: 0, delivered: 0, notified: 0, errors: 0 };

  for (const s of shipments) {
    if (!s.trackingNumber) continue;
    result.checked++;
    const { order } = s;
    try {
      // Por número de seguimiento; si MiCorreo no lo encuentra, por el extOrderId de la precarga (= número de pedido).
      let tracking = await getTracking(s.trackingNumber);
      if (!tracking.ok && tracking.notFound) {
        const byOrder = await getTracking(order.orderNumber);
        if (byOrder.ok) tracking = byOrder;
      }
      if (!tracking.ok) {
        result.errors++;
        console.warn(`[tracking] ${order.orderNumber}: ${tracking.error}`);
        await deps.db.shipment.update({ where: { id: s.id }, data: { trackingCheckedAt: now } });
        continue;
      }

      const d = deriveShipmentStatus(tracking.events);
      const next = d.status && canTransitionShipment(s.status, d.status) ? d.status : s.status;
      await deps.db.$transaction(async (tx) => {
        await tx.shipment.update({
          where: { id: s.id },
          data: { status: next, trackingCheckedAt: now, ...(d.lastEvent ? { trackingLastEvent: d.lastEvent } : {}) },
        });
        if (next === "delivered") {
          // Precondición atómica: si la dueña ya lo marcó a mano, no se pisa.
          const res = await tx.order.updateMany({ where: { id: order.id, status: "shipped" }, data: { status: "delivered" } });
          if (res.count === 1) result.delivered++;
        }
      });
      if (next !== s.status) result.updated++;

      const whatsapp = async () =>
        deps.getWhatsappUrl ? deps.getWhatsappUrl(`¡Hola! Tengo una consulta sobre mi pedido ${order.orderNumber}`) : null;

      if (next === "delivered") {
        const mail = shipmentDeliveredEmail({
          orderNumber: order.orderNumber,
          contactName: order.contactName,
          reviewUrl: order.customerId ? `${deps.appUrl}/cuenta/pedidos/${order.orderNumber}` : null,
          whatsappUrl: await whatsapp(),
        });
        if (await notifyOnce(deps, s.id, "delivered", order.contactEmail, mail)) result.notified++;
      } else if (next === "returned" && deps.ownerEmail) {
        const mail = shipmentReturnedAlertEmail({
          orderNumber: order.orderNumber,
          contactName: order.contactName,
          contactEmail: order.contactEmail,
          contactPhone: order.contactPhone,
          trackingNumber: s.trackingNumber,
          lastEvent: d.lastEvent,
        });
        if (await notifyOnce(deps, s.id, "returned_alert", deps.ownerEmail, mail)) result.notified++;
      } else if (next === "in_transit" && d.awaitingPickup) {
        const mail = shipmentAwaitingPickupEmail({
          orderNumber: order.orderNumber,
          contactName: order.contactName,
          trackingNumber: s.trackingNumber,
          facility: d.pickupFacility,
          whatsappUrl: await whatsapp(),
        });
        if (await notifyOnce(deps, s.id, "awaiting_pickup", order.contactEmail, mail)) result.notified++;
      }
    } catch (e) {
      result.errors++;
      console.error(`[tracking] ${order.orderNumber}:`, e instanceof Error ? e.message : e);
    }
  }
  return result;
}

/**
 * Manda un aviso como máximo una vez: primero reclama la marca de forma atómica (sólo gana si
 * todavía no estaba) y recién ahí envía. Si el mail falla, se pierde ese aviso (se loguea) en vez
 * de arriesgar mails repetidos a la clienta.
 */
async function notifyOnce(deps: TrackingJobDeps, shipmentId: string, key: NoticeKey, to: string, mail: EmailContent): Promise<boolean> {
  const claim = await deps.db.shipment.updateMany({
    where: { id: shipmentId, NOT: { trackingNotified: { has: key } } },
    data: { trackingNotified: { push: key } },
  });
  if (claim.count !== 1) return false;
  try {
    await deps.sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text });
    return true;
  } catch (e) {
    console.error(`[tracking] aviso ${key} no enviado (envío ${shipmentId}):`, e instanceof Error ? e.message : e);
    return false;
  }
}
