// NOTA: sin `import "server-only"` — lo importa scripts/simulate-mp-webhook.ts (node). Server por importar prisma.
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import { round2 } from "@/lib/money";
import { cartSubtotal, lineTotal, physicalSubtotal, isDigitalOnly } from "@/lib/cart/totals";
import { validateShippingAddress } from "@/lib/shipping/address";
import { releaseGiftCardReservation } from "@/lib/coupons/gift-card-service";
import { validateCoupon, applyCoupon } from "@/lib/coupons/apply";
import { formatOrderNumber } from "@/lib/orders/order-number";
import { createPreference as realCreatePreference } from "@/lib/payments/mercadopago";
import { quoteShipping as realQuoteShipping, type ShippingQuote } from "@/lib/shipping/index";
import { orderWeightGr } from "@/lib/shipping/quote";
import { getShippingZonesForQuote, getFreeShippingThreshold } from "@/lib/orders/checkout-data";
import type { CartLine } from "@/lib/cart/types";

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
  /** Sólo método sucursal: código y etiqueta de la sucursal de MiCorreo elegida. */
  agencyCode?: string | null;
  agencyLabel?: string | null;
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
    createPreference: realCreatePreference,
    quoteShipping: (input) => realQuoteShipping(input, { getZones: getShippingZonesForQuote, getThreshold: getFreeShippingThreshold }),
    appUrl,
    isSandboxToken: process.env.MP_ACCESS_TOKEN?.startsWith("TEST-") ?? false,
  };
}

export async function createCheckout(input: CreateCheckoutInput, deps: CreateCheckoutDeps): Promise<CreateCheckoutResult> {
  if (input.lines.length === 0) throw new Error("El carrito está vacío.");
  const now = deps.now ?? new Date();
  const cartLines = input.lines.map((l) => l.line);
  const subtotal = cartSubtotal(cartLines);
  // El server decide si el pedido es digital (solo gift cards): nunca se confía en el cliente.
  const digitalOnly = isDigitalOnly(cartLines);
  const shippingMethod = digitalOnly ? "digital" : input.shippingMethod;
  if (!digitalOnly) {
    const addressError = validateShippingAddress(input.shippingMethod, input.address);
    if (addressError) throw new Error(addressError);
  }

  // --- Cupón (revalidado en server) --- Un pedido digital ignora cualquier cupón (no hay a qué descontarle).
  let discount = 0;
  let freeShippingByCoupon = false;
  let couponId: string | null = null;
  let giftCardCoupon: CouponRow | null = null;
  if (input.couponCode && !digitalOnly) {
    const coupon = await deps.db.coupon.findUnique({ where: { code: input.couponCode } });
    if (coupon) {
      let customerRedemptions = 0;
      if (input.customerId && coupon.perCustomerLimit != null) {
        const r = await deps.db.couponRedemption.findUnique({
          where: { customerId_couponId: { customerId: input.customerId, couponId: coupon.id } },
        });
        customerRedemptions = r?.redeemedCount ?? 0;
      }
      // El mínimo se mide sobre lo físico: las gift cards no cuentan para cupones.
      const v = validateCoupon(coupon, { subtotal: physicalSubtotal(cartLines), now, customerRedemptions });
      if (v.ok) {
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
    }
  }

  // --- Envío --- (pedido digital: sin cotizar, sin dirección)
  const quote = digitalOnly
    ? { cost: 0, zoneId: null }
    : await deps.quoteShipping({
        cp: input.address.cp, province: input.address.province ?? null, city: input.address.city ?? null,
        method: input.shippingMethod, lines: cartLines,
        subtotal: physicalSubtotal(cartLines), // las gift cards no cuentan para el envío gratis
      });
  const shippingCost = freeShippingByCoupon ? 0 : quote.cost;
  const total = round2(subtotal - discount + shippingCost);
  if (total <= 0) throw new Error("El total no puede ser $0.");

  // --- Persistencia (tx) ---
  const order = await deps.db.$transaction(async (tx) => {
    if (giftCardCoupon) {
      // Reserva atómica: dos pedidos que compiten por la misma gift card → solo uno obtiene count 1.
      // El webhook NO la vuelve a incrementar; se libera si el pedido se cancela sin pagarse.
      const res = await tx.coupon.updateMany({
        where: { id: giftCardCoupon.id, active: true, usedCount: { lt: giftCardCoupon.maxUses ?? 1 } },
        data: { usedCount: { increment: 1 } },
      });
      if (res.count !== 1) throw new Error("Esta gift card ya fue usada.");
    }
    const seq = await deps.nextOrderSeq(tx);
    const orderNumber = formatOrderNumber(seq);
    const created = await tx.order.create({
      data: {
        orderNumber,
        customerId: input.customerId ?? null,
        contactName: input.contactName, contactEmail: input.contactEmail, contactPhone: input.contactPhone,
        shippingAddress: (digitalOnly ? {} : input.address) as unknown as object,
        shippingMethod,
        shippingZoneId: quote.zoneId,
        weightGr: orderWeightGr(cartLines), // snapshot para el envío automático a MiCorreo
        subtotal, shippingCost, discountTotal: discount, total,
        couponId,
        status: "pending_payment",
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
    if (input.cartId) await tx.cart.update({ where: { id: input.cartId }, data: { status: "ordered" } });
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
    });
  } catch (e) {
    // Sin preference la clienta no puede pagar: el pedido queda huérfano. Se cancela (con la misma
    // guarda de estado que el expiry job), se libera la gift card que reservó y el carrito vuelve a
    // estar activo para que reintente. Best-effort: el error original es el que se propaga.
    try {
      await deps.db.$transaction(async (tx) => {
        const res = await tx.order.updateMany({ where: { id: order.id, status: "pending_payment" }, data: { status: "cancelled" } });
        if (res.count !== 1) return;
        await releaseGiftCardReservation(tx, order.id);
        if (input.cartId) await tx.cart.update({ where: { id: input.cartId }, data: { status: "active" } });
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
