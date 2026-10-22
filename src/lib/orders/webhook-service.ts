// NOTA: sin `import "server-only"` — lo importa scripts/simulate-mp-webhook.ts (node). Server por importar prisma.
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import { verifyMpSignature } from "@/lib/payments/signature";
import { getPayment as realGetPayment, mpStatusToPaymentStatus } from "@/lib/payments/mercadopago";
import { decideWebhookEffects, paymentStatusAdvances } from "@/lib/payments/webhook-effects";
import { applyPaidEffects, restockItems } from "@/lib/orders/stock-effects";
import { sendEmail as realSendEmail } from "@/lib/email/resend";
import { orderConfirmationEmail, newOrderAlertEmail, giftCardEmail, giftCardRefundedUsedEmail, approvedOnClosedOrderEmail, type OrderEmailData } from "@/lib/email/templates";
import { issueGiftCards, voidUnusedGiftCards, releaseGiftCardReservation, type IssuedGiftCard } from "@/lib/coupons/gift-card-service";
import { storeWhatsappUrl } from "@/lib/email/whatsapp-url";
import { toNumber } from "@/lib/catalog/pricing";
import type { OrderStatus } from "@prisma/client";
import type { Money } from "@/lib/catalog/types";

export interface ProcessWebhookInput {
  dataId: string;
  xSignature: string | null;
  xRequestId: string | null;
}
/** Interfaz mínima de la DB necesaria para el webhook (para inyectar fakes en tests). */
export interface WebhookDb {
  order: { findFirst: (args: Record<string, unknown>) => Promise<WebhookOrder | null> };
  payment: { findFirst: (args: Record<string, unknown>) => Promise<{ id: string } | null> };
  $transaction: <T>(fn: (tx: PrismaTransactionClient) => Promise<T>) => Promise<T>;
}

/** Shape mínimo de pedido para el webhook (incluye items + combo). */
export interface WebhookOrderItem {
  id: string;
  variantId: string | null;
  comboId: string | null;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  skuSnapshot: string | null;
  unitPriceSnapshot: Money;
  qty: number;
  lineTotal: Money;
  isGiftCard: boolean;
  combo: { items: Array<{ variantId: string; qty: number }> } | null;
}
export interface WebhookOrder {
  id: string;
  customerId: string | null;
  /** Carrito de origen (null en pedidos anteriores al vínculo): se marca `ordered` al pagarse. */
  cartId: string | null;
  orderNumber: string;
  status: OrderStatus;
  couponId: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  shippingMethod: string;
  shippingAddress: unknown;
  weightGr: number;
  subtotal: Money;
  shippingCost: Money;
  discountTotal: Money;
  total: Money;
  items: WebhookOrderItem[];
}

export interface ProcessWebhookDeps {
  db: WebhookDb;
  getPayment: typeof realGetPayment;
  sendEmail: typeof realSendEmail;
  verifySignature: (input: { xSignature: string | null; xRequestId: string | null; dataId: string; secret: string }) => Promise<boolean>;
  secret: string;
  ownerEmail?: string;
  /** Link de WhatsApp de la tienda para el mail a la clienta (inyectable para tests). Best-effort. */
  getWhatsappUrl?: (message?: string) => Promise<string | null>;
  now?: Date;
}
export interface ProcessWebhookResult {
  status: 200 | 401;
  detail: string;
}

export function defaultWebhookDeps(): ProcessWebhookDeps {
  return {
    db: prisma as unknown as WebhookDb,
    getPayment: realGetPayment,
    sendEmail: realSendEmail,
    verifySignature: verifyMpSignature,
    secret: process.env.MP_WEBHOOK_SECRET ?? "",
    ownerEmail: process.env.RESEND_OWNER_EMAIL ?? "",
    getWhatsappUrl: storeWhatsappUrl,
  };
}

/** Mail a la dueña, best-effort: un fallo de Resend no voltea el webhook (el estado ya está guardado). */
async function notifyOwner(deps: ProcessWebhookDeps, mail: { subject: string; html: string; text: string }): Promise<void> {
  if (!deps.ownerEmail) return;
  try {
    await deps.sendEmail({ to: deps.ownerEmail, subject: mail.subject, html: mail.html, text: mail.text });
  } catch (e) {
    console.error(`[webhook] no pude avisar a la dueña (${mail.subject}):`, e instanceof Error ? e.message : String(e));
  }
}

export async function processWebhook(input: ProcessWebhookInput, deps: ProcessWebhookDeps): Promise<ProcessWebhookResult> {
  // 1. Verificar firma (origen).
  const valid = await deps.verifySignature({ xSignature: input.xSignature, xRequestId: input.xRequestId, dataId: input.dataId, secret: deps.secret });
  if (!valid) return { status: 401, detail: "Firma inválida." };

  // 2. Consultar el pago a MP (fuente de verdad).
  const mpPayment = await deps.getPayment(input.dataId);
  const paymentStatus = mpStatusToPaymentStatus(mpPayment.status);
  const orderId = mpPayment.external_reference;
  if (!orderId) return { status: 200, detail: "Sin external_reference." };

  // 3. Cargar el pedido con items (+ combo items para stock).
  const order = await deps.db.order.findFirst({
    where: { id: orderId },
    include: { items: { include: { combo: { include: { items: true } } } } },
  });
  if (!order) return { status: 200, detail: "Pedido inexistente (ack)." };

  // 4. Decidir efectos (idempotente por Order.status). Si otro intento de pago del pedido ya está
  // aprobado (el retry crea otra preferencia), un cancelled/refunded de ESTE pago no revierte el pedido.
  const otherApproved = paymentStatus === "cancelled" || paymentStatus === "refunded"
    ? await deps.db.payment.findFirst({ where: { orderId: order.id, status: "approved", mpPaymentId: { not: String(mpPayment.id) } }, select: { id: true } })
    : null;
  const effects = decideWebhookEffects({ currentOrderStatus: order.status, mpStatus: paymentStatus, hasCoupon: Boolean(order.couponId), otherApprovedPaymentExists: otherApproved != null });

  let oversoldLines: Array<{ name: string }> = [];
  // Solo UN webhook gana la transición pending_payment → paid (guarda atómica dentro de la tx).
  // Los efectos "una sola vez" (stock, cupón, shipment, emails) se gatean por esto, no por el
  // estado leído antes de la tx — así MP entregando el mismo aviso en paralelo no doble-descuenta.
  let wonPaidTransition = false;
  // Pedido solo de gift cards: sin envío; queda `delivered` al pagarse (los cupones se emiten en la tx).
  const isDigital = order.shippingMethod === "digital";
  let issuedGiftCards: IssuedGiftCard[] = [];
  // Cupón común que ya no tenía usos al confirmarse el pago: NO se revierte el pago, se avisa a la dueña.
  let couponOverLimit: string | null = null;
  // Pedido reembolsado/cancelado que había emitido gift cards ya usadas (no se pueden anular).
  let giftCardsUsedOnClose = 0;
  // MP aprobó un pago sobre un pedido cancelado/reembolsado: la plata entró y el pedido no se activa solo.
  let approvedOnClosedOrder: "cancelled" | "refunded" | null = null;
  const closedStatus = (s: OrderStatus): "cancelled" | "refunded" | null => (s === "cancelled" || s === "refunded" ? s : null);

  // 5. Aplicar en tx.
  await deps.db.$transaction(async (tx: PrismaTransactionClient) => {
    // Reconciliar el Payment: reusar la fila creada en el checkout (mpPaymentId aún null) o la ya
    // vinculada a este pago; nunca dejar un huérfano "pending" extra. Idempotente por mpPaymentId.
    const mpId = String(mpPayment.id);
    const amount = mpPayment.transaction_amount ?? toNumber(order.total);
    const existingPayment = await tx.payment.findFirst({
      where: { orderId: order.id, OR: [{ mpPaymentId: mpId }, { mpPaymentId: null }] },
      orderBy: { createdAt: "asc" },
    });
    // Dedupe del aviso "aprobado sobre pedido cerrado": MP puede mandar varios avisos del mismo pago.
    const alreadyApproved = existingPayment?.status === "approved";
    if (existingPayment) {
      // Monotonía: un webhook reordenado (ej. "in_process" viejo reintentado después de que ya
      // llegó "approved") no debe hacer retroceder el status — solo se pisa si avanza o iguala.
      const nextStatus = paymentStatusAdvances(existingPayment.status, effects.updatePaymentTo)
        ? effects.updatePaymentTo
        : existingPayment.status;
      await tx.payment.update({ where: { id: existingPayment.id }, data: { mpPaymentId: mpId, status: nextStatus, amount, rawPayload: mpPayment as unknown as object } });
    } else {
      await tx.payment.create({ data: { orderId: order.id, provider: "mercadopago", mpPaymentId: mpId, status: effects.updatePaymentTo, amount, rawPayload: mpPayment as unknown as object } });
    }

    if (effects.setOrderStatusTo === "paid") {
      // Guarda ATÓMICA: updateMany con precondición de estado. READ COMMITTED no serializa dos
      // findFirst previos, pero sí esta escritura condicional → solo una invocación obtiene count 1.
      const res = await tx.order.updateMany({ where: { id: order.id, status: "pending_payment" }, data: { status: "paid" } });
      wonPaidTransition = res.count === 1;
      if (!wonPaidTransition && !alreadyApproved) {
        // Perdió la guarda: ¿otro webhook ganó (paid) o el pedido se cerró entre la lectura y acá?
        const fresh = await tx.order.findFirst({ where: { id: order.id }, select: { status: true } });
        approvedOnClosedOrder = fresh ? closedStatus(fresh.status) : null;
      }
    } else if (effects.setOrderStatusTo) {
      // Misma guarda atómica que la transición a "paid": precondición sobre el status con el que
      // se calcularon los `effects` (order.status, leído fuera de la tx). Si otra invocación ya
      // movió el pedido a otro estado mientras tanto, esta escritura pierde la carrera (count 0)
      // en vez de pisar ciegamente — evita que un webhook "cancelled"/"refunded" desactualizado
      // sobrescriba un pedido que ya está "paid".
      const res = await tx.order.updateMany({ where: { id: order.id, status: order.status }, data: { status: effects.setOrderStatusTo } });
      if (res.count !== 1) {
        // MP no reintenta ante un 200: si el admin movió el pedido justo antes, este cambio (y su reposición) se pierde.
        console.warn(`[webhook] pedido ${order.id}: no se pudo pasar a ${effects.setOrderStatusTo}, el estado cambió mientras tanto (${order.status}); revisalo a mano`);
      } else {
        // Reembolso/contracargo sobre un pedido que ya descontó stock: se repone en la misma tx (el estado
        // es terminal, nadie más lo repondría). En shipped/delivered no: la mercadería ya salió y la dueña
        // la suma a mano cuando vuelve (state-machine.ts).
        if ((effects.setOrderStatusTo === "refunded" || effects.setOrderStatusTo === "cancelled") && (order.status === "paid" || order.status === "preparing")) {
          await restockItems(tx, order.items);
        }
        // Las gift cards emitidas por un pedido reembolsado/cancelado se anulan (las ya usadas quedan).
        if (effects.setOrderStatusTo === "refunded" || effects.setOrderStatusTo === "cancelled") {
          giftCardsUsedOnClose = (await voidUnusedGiftCards(tx, order.id)).used;
        }
        // Pedido que nunca se pagó y reservó una gift card: se libera.
        if (effects.setOrderStatusTo === "cancelled" && order.status === "pending_payment") await releaseGiftCardReservation(tx, order.id);
      }
    }

    // approved pero el pedido ya estaba cancelado/reembolsado: no hay transición posible.
    if (paymentStatus === "approved" && !effects.setOrderStatusTo && !alreadyApproved) approvedOnClosedOrder = closedStatus(order.status);

    // Efectos de una sola vez: SOLO si este webhook ganó la transición a paid.
    if (wonPaidTransition) {
      // El carrito recién se cierra con el pago aprobado (hasta acá la clienta podía reintentar).
      // Guarda status active: un carrito ya fusionado/abandonado no se toca.
      if (order.cartId) await tx.cart.updateMany({ where: { id: order.cartId, status: "active" }, data: { status: "ordered" } });
      const { oversoldVariantIds, couponOverLimit: overLimit } = await applyPaidEffects(tx, order, deps.now ?? new Date());
      couponOverLimit = overLimit;
      if (overLimit) console.warn(`[webhook] pedido ${order.orderNumber}: el cupón ${overLimit} superó su límite de usos (el pago se mantiene)`);
      if (oversoldVariantIds.length > 0) {
        oversoldLines = order.items
          .filter((it) =>
            it.variantId
              ? oversoldVariantIds.includes(it.variantId)
              : // línea de combo: matchea si algún componente está en falta
                (it.combo?.items.some((ci) => oversoldVariantIds.includes(ci.variantId)) ?? false),
          )
          .map((it) => ({ name: it.variantNameSnapshot ? `${it.productNameSnapshot} (${it.variantNameSnapshot})` : it.productNameSnapshot }));
      }
      issuedGiftCards = await issueGiftCards(tx, order, deps.now ?? new Date());

      // Pedido digital: no hay nada que despachar → queda entregado en la misma tx que lo pagó.
      if (isDigital) await tx.order.updateMany({ where: { id: order.id, status: "paid" }, data: { status: "delivered" } });
    }
  });

  // 6. Efectos externos (fuera de tx) — solo si ganamos la transición a paid (una sola vez).
  if (wonPaidTransition) {
    // 6. Emails (el envío se despacha a mano desde el panel, ADR 0004: no hay precarga en MiCorreo).
    // Best-effort: el pago YA está confirmado en DB — un fallo de Resend
    // acá no debe voltear el webhook (si no, MP reintenta indefinidamente sobre un pago que ya
    // es idempotente, en vez de cerrar con 200).
    let whatsappUrl: string | null = null;
    try {
      whatsappUrl = deps.getWhatsappUrl ? await deps.getWhatsappUrl(`¡Hola! Tengo una consulta sobre mi pedido ${order.orderNumber}`) : null;
    } catch {
      // Sin link de WhatsApp los mails salen igual.
    }

    // Gift cards: mail aparte y primero (es lo que la clienta pagó). Si falla, los códigos ya
    // están en la DB y la dueña puede reenviarlos desde el detalle del pedido.
    if (issuedGiftCards.length > 0) {
      try {
        const gift = giftCardEmail({ orderNumber: order.orderNumber, contactName: order.contactName, cards: issuedGiftCards, whatsappUrl });
        await deps.sendEmail({ to: order.contactEmail, subject: gift.subject, html: gift.html, text: gift.text });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[webhook] envío del mail de gift card falló (pedido ${order.orderNumber}):`, msg);
      }
    }

    // Cada mail va en su propio try: si falla el de la clienta, el de la dueña (única señal de
    // oversell / monto distinto / cupón sobre el límite) tiene que salir igual.
    const logEmailFailure = (which: string, e: unknown) =>
      console.error(`[webhook] mail ${which} falló (pedido ${order.orderNumber}):`, e instanceof Error ? e.message : String(e));
    let emailData: OrderEmailData | null = null;
    try {
      emailData = {
        orderNumber: order.orderNumber, contactName: order.contactName, contactEmail: order.contactEmail,
        items: order.items.map((it) => ({ name: it.productNameSnapshot, variantName: it.variantNameSnapshot, qty: it.qty, lineTotal: toNumber(it.lineTotal) })),
        subtotal: toNumber(order.subtotal), shippingCost: toNumber(order.shippingCost), discountTotal: toNumber(order.discountTotal), total: toNumber(order.total),
        shippingMethod: order.shippingMethod,
        // Defensa: monto realmente acreditado por MP → la alerta a la dueña flaggea si no coincide con el total.
        amountPaid: mpPayment.transaction_amount ?? undefined,
        couponOverLimit: couponOverLimit ?? undefined,
      };
    } catch (e) {
      logEmailFailure("(datos)", e);
    }
    if (emailData) {
      try {
        const customer = orderConfirmationEmail({ ...emailData, whatsappUrl });
        await deps.sendEmail({ to: order.contactEmail, subject: customer.subject, html: customer.html, text: customer.text });
      } catch (e) {
        logEmailFailure("a la clienta", e);
      }
      if (deps.ownerEmail) {
        try {
          const owner = newOrderAlertEmail({ ...emailData, oversoldLines: oversoldLines.length ? oversoldLines : undefined });
          await deps.sendEmail({ to: deps.ownerEmail, subject: owner.subject, html: owner.html, text: owner.text });
        } catch (e) {
          logEmailFailure("a la dueña", e);
        }
      } else {
        console.error(`[webhook] RESEND_OWNER_EMAIL no configurada: la dueña no recibió el aviso del pedido ${order.orderNumber}`);
      }
    }
  }

  // Avisos a la dueña (best-effort, como los demás mails: el estado ya quedó persistido).
  if (giftCardsUsedOnClose > 0) {
    console.warn(`[webhook] pedido ${order.orderNumber} ${effects.setOrderStatusTo}: ${giftCardsUsedOnClose} gift card(s) ya usadas no se pudieron anular`);
    await notifyOwner(deps, giftCardRefundedUsedEmail({ orderNumber: order.orderNumber, used: giftCardsUsedOnClose }));
  }
  if (approvedOnClosedOrder) {
    console.error(`[webhook] pago aprobado en pedido ${approvedOnClosedOrder === "cancelled" ? "cancelado" : "reembolsado"} ${order.orderNumber} (MP pago ${mpPayment.id}): revisar a mano`);
    await notifyOwner(deps, approvedOnClosedOrderEmail({ orderNumber: order.orderNumber, orderStatus: approvedOnClosedOrder, amount: mpPayment.transaction_amount ?? toNumber(order.total) }));
  }

  return { status: 200, detail: wonPaidTransition ? "paid" : (effects.setOrderStatusTo === "paid" ? "ya pagado (idempotente)" : (effects.setOrderStatusTo ?? "sin cambio")) };
}
