// NOTA: sin `import "server-only"` — lo importa scripts/simulate-mp-webhook.ts (node). Server por importar prisma.
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import { round2 } from "@/lib/money";
import { cartSubtotal, lineTotal, physicalSubtotal, isDigitalOnly } from "@/lib/cart/totals";
import { validateShippingAddress, sanitizeAddress } from "@/lib/shipping/address";
import { releaseGiftCardReservation } from "@/lib/coupons/gift-card-service";
import { validateCoupon, applyCoupon } from "@/lib/coupons/apply";
import { loadCustomerRedemptions } from "@/lib/coupons/redemptions";
import { formatOrderNumber } from "@/lib/orders/order-number";
import { createPreference as realCreatePreference } from "@/lib/payments/mercadopago";
import { quoteShipping as realQuoteShipping, type ShippingQuote } from "@/lib/shipping/index";
import { orderWeightGr } from "@/lib/shipping/quote";
import { getShippingZonesForQuote, getFreeShippingThreshold, getShippingSurcharge } from "@/lib/orders/checkout-data";
import type { CartLine } from "@/lib/cart/types";
import { computeStockDecrements } from "@/lib/orders/stock";
import { lockStock, stockShortfall, holdExpiry, payDeadline, heldMessage, type LockStock } from "@/lib/orders/stock-hold";
import { CouponRejectedError, CustomerFacingError } from "@/lib/orders/customer-error";

export interface CheckoutLineInput {
  line: CartLine;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  skuSnapshot: string | null;
  title: string;
}
export interface CheckoutAddress {
  cp: string;
  province?: string | null;
  street?: string;
  number?: string;
  floorApt?: string | null;
  city?: string;
  notes?: string | null;
  /** DNI de quien recibe (lo pide la empresa de envío). Obligatorio para pedidos con envío físico. */
  dni?: string;
}
export interface CreateCheckoutInput {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  /** Lo que eligió la clienta. Si el carrito es solo gift cards el server lo ignora (pedido `digital`). */
  shippingMethod: "domicilio" | "sucursal";
  address: CheckoutAddress;
  lines: CheckoutLineInput[];
  couponCode?: string | null;
  customerId?: string | null;
  cartId?: string | null;
}

/** Interfaz mínima de coupon row necesaria para validar y aplicar. */
export interface CouponRow {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free_shipping";
  value: number | string;
  scope: "all" | "category" | "product";
  scopeId: string | null;
  active: boolean;
  minSubtotal: number | string | null;
  validFrom: Date | null;
  validTo: Date | null;
  maxUses: number | null;
  usedCount: number;
  perCustomerLimit: number | null;
  /** != null → es una gift card (emitida por ese pedido): se reserva al crear el pedido. */
  sourceOrderId?: string | null;
}

/** Superficie mínima de DB que necesita el servicio (para inyectar fakes en tests). */
export interface CheckoutDb {
  coupon: { findUnique: (args: { where: { code: string } }) => Promise<CouponRow | null> };
  couponRedemption: {
    findUnique: (args: { where: { customerId_couponId: { customerId: string; couponId: string } } }) => Promise<{ redeemedCount: number } | null>;
  };
  $transaction: <T>(fn: (tx: PrismaTransactionClient) => Promise<T>) => Promise<T>;
}
export interface CreateCheckoutDeps {
  db: CheckoutDb;
  nextOrderSeq: (tx: PrismaTransactionClient) => Promise<number>;
  /** Bloquea las variantes en la tx de creación y devuelve stock y unidades retenidas por otros pedidos. */
  lockStock: LockStock;
  createPreference: typeof realCreatePreference;
  quoteShipping: (input: Parameters<typeof realQuoteShipping>[0]) => Promise<ShippingQuote>;
  appUrl: string;
  /** true si MP_ACCESS_TOKEN es de sandbox (TEST-...) — decide qué init_point devolver. */
  isSandboxToken: boolean;
  now?: Date;
}
export interface CreateCheckoutResult {
  orderId: string;
  orderNumber: string;
  initPoint: string;
}

/** Lee la secuencia order_number_seq dentro de la tx (default real). */
async function defaultNextOrderSeq(tx: PrismaTransactionClient): Promise<number> {
  const rows = (await tx.$queryRawUnsafe("SELECT nextval('order_number_seq') AS seq")) as Array<{ seq: bigint | number }>;
  return Number(rows[0].seq);
}

export function defaultCheckoutDeps(appUrl: string): CreateCheckoutDeps {
  return {
    db: prisma as unknown as CheckoutDb,
    nextOrderSeq: defaultNextOrderSeq,
    lockStock,
    createPreference: realCreatePreference,
    quoteShipping: (input) => realQuoteShipping(input, { getZones: getShippingZonesForQuote, getThreshold: getFreeShippingThreshold, getSurcharge: getShippingSurcharge }),
    appUrl,
    isSandboxToken: process.env.MP_ACCESS_TOKEN?.startsWith("TEST-") ?? false,
  };
}

/** Un pago que MP está procesando o ya aprobó puede acreditarse: cancelar ese pedido cobraría dos veces. */
const PAYMENT_IN_FLIGHT = new Set(["in_process", "approved"]);

/**
 * Cancela los pedidos pendientes anteriores del carrito y, en la misma tx, re-chequea el stock: si no
 * alcanza, el rollback deshace la cancelación y la clienta no pierde la reserva que ya tenía.
 */
async function supersedePendingOrders(db: CheckoutDb, cartId: string, assertInStock: (tx: PrismaTransactionClient) => Promise<void>): Promise<void> {
  await db.$transaction(async (tx) => {
    const previous = await tx.order.findMany({
      where: { cartId, status: "pending_payment" },
      select: { id: true, payments: { select: { status: true } } },
    });
    if (previous.some((o) => o.payments.some((p) => PAYMENT_IN_FLIGHT.has(p.status)))) {
      throw new CustomerFacingError("Tu pago anterior se está procesando en Mercado Pago. Esperá el email de confirmación antes de volver a pagar.");
    }
    for (const prev of previous) {
      const res = await tx.order.updateMany({ where: { id: prev.id, status: "pending_payment" }, data: { status: "cancelled" } });
      if (res.count === 1) await releaseGiftCardReservation(tx, prev.id);
    }
    // Las variantes se bloquean DESPUÉS de las filas de Order: mismo orden que el webhook (sin ciclos).
    if (previous.length > 0) await assertInStock(tx);
  });
}

export async function createCheckout(input: CreateCheckoutInput, deps: CreateCheckoutDeps): Promise<CreateCheckoutResult> {
  if (input.lines.length === 0) throw new CustomerFacingError("El carrito está vacío.");
  const now = deps.now ?? new Date();
  const cartLines = input.lines.map((l) => l.line);
  const decrements = computeStockDecrements(cartLines);

  const subtotal = cartSubtotal(cartLines);
  // El server decide si el pedido es digital (solo gift cards): nunca se confía en el cliente.
  const digitalOnly = isDigitalOnly(cartLines);
  const shippingMethod = digitalOnly ? "digital" : input.shippingMethod;
  if (!digitalOnly) {
    const addressError = validateShippingAddress(input.shippingMethod, input.address);
    if (addressError) throw new CustomerFacingError(addressError);
  }

  // --- Envío --- (pedido digital: sin cotizar, sin dirección). Va antes de cancelar el pedido anterior:
  // es una llamada de red y, mientras dura, la reserva anterior de la clienta tiene que seguir vigente.
  const quote = digitalOnly
    ? { cost: 0, zoneId: null }
    : await deps.quoteShipping({
        cp: input.address.cp, province: input.address.province ?? null, city: input.address.city ?? null,
        method: input.shippingMethod, lines: cartLines,
        subtotal: physicalSubtotal(cartLines), // las gift cards no cuentan para el envío gratis
      });
  // Sin cotización en vivo ni zonas cargadas: nunca cobrar envío $0 por error.
  if ("source" in quote && quote.source === "none") {
    throw new CustomerFacingError("No pudimos calcular el envío a ese código postal. Escribinos por WhatsApp y lo resolvemos.");
  }

  // Stock: con las variantes bloqueadas (hasta el fin de la tx), descontando lo que retienen otros
  // pedidos pendientes. Quien llega primero retiene las unidades hasta `reservedUntil`; el siguiente
  // ve que se agotaron. El webhook las descuenta al aprobarse el pago (y avisa a la dueña si faltara).
  const assertInStock = async (tx: PrismaTransactionClient) => {
    const shortfall = stockShortfall(decrements, await deps.lockStock(tx, [...decrements.keys()], { now }));
    if (shortfall.kind === "ok") return;
    const touches = (l: CartLine) => (l.kind === "variant" ? [l.refId] : (l.components ?? []).map((c) => c.variantId));
    const names = input.lines.filter((l) => touches(l.line).some((id) => shortfall.variantIds.has(id))).map((l) => l.title);
    throw new CustomerFacingError(
      shortfall.kind === "held" ? heldMessage(names) : `No hay stock suficiente de ${names.join(", ")}. Actualizá tu carrito y probá de nuevo.`,
    );
  };

  // --- Pedido pendiente anterior del mismo carrito ---
  // El carrito sigue activo hasta que se aprueba el pago. Si la clienta vuelve de MP sin pagar y
  // reintenta, el pedido pendiente anterior se cancela (misma guarda que el expiry job) y libera su
  // gift card ANTES de validar el cupón: si no, la misma gift card figura usada y el descuento se pierde.
  if (input.cartId) await supersedePendingOrders(deps.db, input.cartId, assertInStock);

  // --- Cupón (revalidado en server) --- Un pedido digital ignora cualquier cupón (no hay a qué descontarle).
  let discount = 0;
  let freeShippingByCoupon = false;
  let couponId: string | null = null;
  let giftCardCoupon: CouponRow | null = null;
  if (input.couponCode && !digitalOnly) {
    const coupon = await deps.db.coupon.findUnique({ where: { code: input.couponCode } });
    // Si dejó de valer (se agotó, venció) no se cobra sin él en silencio: la clienta vio otro total.
    const gone = (reason: string) =>
      new CouponRejectedError("El cupón ya no está disponible: " + reason + " Lo quitamos de tu carrito; revisá el total y probá de nuevo.");
    if (!coupon) throw gone("no existe.");
    const customerRedemptions = await loadCustomerRedemptions(deps.db, input.customerId, coupon);
    // El mínimo se mide sobre lo físico: las gift cards no cuentan para cupones.
    const v = validateCoupon(coupon, { subtotal: physicalSubtotal(cartLines), now, customerRedemptions });
    if (!v.ok) throw gone(v.reason);
    const res = applyCoupon(coupon, cartLines);
    // Una gift card que no descuenta nada (ej. carrito solo de gift cards) no se aplica: se quemaría gratis.
    const isGiftCardCoupon = coupon.sourceOrderId != null;
    if (!isGiftCardCoupon || res.discount > 0) {
      discount = res.discount;
      freeShippingByCoupon = res.freeShipping;
      couponId = coupon.id;
      if (isGiftCardCoupon) giftCardCoupon = coupon;
    }
  }

  const shippingCost = freeShippingByCoupon ? 0 : quote.cost;
  const total = round2(subtotal - discount + shippingCost);
  if (total <= 0) throw new CustomerFacingError("El total no puede ser $0.");

  // --- Persistencia (tx) --- El stock se vuelve a chequear con las variantes bloqueadas hasta crear el pedido.
  const reservedUntil = holdExpiry(now);
  const order = await deps.db.$transaction(async (tx) => {
    await assertInStock(tx);
    if (giftCardCoupon) {
      // Reserva atómica: dos pedidos que compiten por la misma gift card → solo uno obtiene count 1.
      // El webhook NO la vuelve a incrementar; se libera si el pedido se cancela sin pagarse.
      const res = await tx.coupon.updateMany({
        where: { id: giftCardCoupon.id, active: true, usedCount: { lt: giftCardCoupon.maxUses ?? 1 } },
        data: { usedCount: { increment: 1 } },
      });
      if (res.count !== 1) throw new CustomerFacingError("Esta gift card ya fue usada.");
    }
    const seq = await deps.nextOrderSeq(tx);
    const orderNumber = formatOrderNumber(seq);
    const created = await tx.order.create({
      data: {
        orderNumber,
        customerId: input.customerId ?? null,
        cartId: input.cartId ?? null,
        contactName: input.contactName, contactEmail: input.contactEmail, contactPhone: input.contactPhone,
        shippingAddress: (digitalOnly ? {} : sanitizeAddress(input.address)) as unknown as object,
        shippingMethod,
        shippingZoneId: quote.zoneId,
        weightGr: orderWeightGr(cartLines), // snapshot del peso del pedido
        subtotal, shippingCost, discountTotal: discount, total,
        couponId,
        status: "pending_payment",
        reservedUntil,
        items: {
          create: input.lines.map((l) => ({
            variantId: l.line.kind === "variant" ? l.line.refId : null,
            comboId: l.line.kind === "combo" ? l.line.refId : null,
            productNameSnapshot: l.productNameSnapshot,
            variantNameSnapshot: l.variantNameSnapshot,
            skuSnapshot: l.skuSnapshot,
            unitPriceSnapshot: l.line.unitPrice,
            qty: l.line.qty,
            lineTotal: lineTotal(l.line),
            isGiftCard: l.line.isGiftCard,
          })),
        },
        payments: { create: { provider: "mercadopago", status: "pending", amount: total } },
      },
      include: { payments: true },
    });
    return created;
  });

  // --- Preference MP ---
  // CRÍTICO: los ítems enviados a MP DEBEN sumar exactamente `total` (lo que MP le cobra a la clienta).
  // Sin descuento: ítems de producto + línea de envío (todo positivo → suma = subtotal + envío = total).
  // Con descuento: una sola línea consolidada = total (MP no acepta líneas de precio negativo de forma confiable).
  const mpItems =
    discount > 0
      ? [{ title: `Glamify Makeup · Pedido ${order.orderNumber}`, quantity: 1, unit_price: total }]
      : [
          ...input.lines.map((l) => ({ title: l.title, quantity: l.line.qty, unit_price: l.line.unitPrice })),
          ...(shippingCost > 0 ? [{ title: "Envío", quantity: 1, unit_price: shippingCost }] : []),
        ];
  let preference: Awaited<ReturnType<typeof deps.createPreference>>;
  try {
    preference = await deps.createPreference({
      orderId: order.id, orderNumber: order.orderNumber,
      items: mpItems,
      payerEmail: input.contactEmail,
      appUrl: deps.appUrl,
      notificationUrl: `${deps.appUrl}/api/webhooks/mercadopago`,
      expiresAt: payDeadline(now),
    });
  } catch (e) {
    // Sin preference la clienta no puede pagar: el pedido queda huérfano. Se cancela (con la misma
    // guarda de estado que el expiry job) y se libera la gift card que reservó; el carrito nunca dejó
    // de estar activo, así que puede reintentar. Best-effort: el error original es el que se propaga.
    try {
      await deps.db.$transaction(async (tx) => {
        const res = await tx.order.updateMany({ where: { id: order.id, status: "pending_payment" }, data: { status: "cancelled" } });
        if (res.count !== 1) return;
        await releaseGiftCardReservation(tx, order.id);
      });
    } catch (rollbackError) {
      console.error(`[checkout] no pude cancelar el pedido ${order.orderNumber} tras fallar la preference:`, rollbackError instanceof Error ? rollbackError.message : rollbackError);
    }
    throw e;
  }

  await deps.db.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: order.payments[0].id }, data: { mpPreferenceId: preference.id } });
  });

  const initPoint = deps.isSandboxToken && preference.sandbox_init_point
    ? preference.sandbox_init_point
    : preference.init_point;

  return { orderId: order.id, orderNumber: order.orderNumber, initPoint };
}
