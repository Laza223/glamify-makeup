import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Gift, Truck } from "lucide-react";
import { requireCustomer } from "@/lib/customer/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { OrderStatusPill } from "@/components/orders/order-status-pill";
import { RetryPaymentButton } from "@/components/orders/retry-payment-button";
import { CORREO_TRACKING_URL } from "@/lib/shipping/tracking";

/** Estado del envío según Correo (lo actualiza solo el cron de seguimiento). */
const SHIPMENT_LABEL: Partial<Record<string, string>> = {
  dispatched: "Despachado", in_transit: "En camino", delivered: "Entregado", returned: "Devuelto",
};

export default async function PedidoDetallePage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const customer = await requireCustomer();
  const order = await prisma.order.findFirst({
    where: { orderNumber, customerId: customer.id },
    include: {
      items: { include: { variant: { include: { product: { select: { slug: true } } } } } },
      shipment: true,
    },
  });
  if (!order) notFound();
  const isDigital = order.shippingMethod === "digital";

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/cuenta/pedidos"
        className="inline-flex min-h-11 items-center gap-2 rounded-[10px] text-[15px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Mis pedidos
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[28px] leading-tight tabular-nums">{order.orderNumber}</h2>
          <p className="text-[14px] text-muted-foreground">
            {order.createdAt.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" })}
          </p>
        </div>
        <OrderStatusPill status={order.status} />
      </div>

      {order.status === "pending_payment" && (
        <div className="space-y-3 rounded-[20px] bg-[#FFF4D6]/60 p-5">
          <p className="text-[15px] leading-relaxed text-foreground">
            Este pedido todavía no tiene el pago acreditado. Podés pagarlo ahora; si no, se cancela solo a las 24 horas.
          </p>
          <RetryPaymentButton orderId={order.id} />
        </div>
      )}

      {order.shipment?.trackingNumber && (
        <div className="flex items-start gap-4 rounded-[20px] bg-secondary p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-primary">
            <Truck className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 text-[15px] leading-relaxed">
            {SHIPMENT_LABEL[order.shipment.status] && (
              <p className="font-semibold text-foreground">
                {SHIPMENT_LABEL[order.shipment.status]}
                {order.shipment.trackingLastEvent ? <span className="font-normal text-muted-foreground"> · {order.shipment.trackingLastEvent}</span> : null}
              </p>
            )}
            <p className="text-muted-foreground">
              Seguimiento: <strong className="font-semibold text-foreground tabular-nums">{order.shipment.trackingNumber}</strong>
            </p>
            <a
              href={CORREO_TRACKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex min-h-11 items-center gap-1 rounded-[10px] font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Rastrear en Correo Argentino
              <ArrowUpRight className="size-4" aria-hidden />
            </a>
          </div>
        </div>
      )}

      {isDigital && order.status !== "pending_payment" && (
        <p className="flex items-center gap-3 rounded-[20px] bg-secondary p-5 text-[15px] text-foreground">
          <Gift className="size-5 shrink-0 text-primary" aria-hidden />
          Te mandamos la gift card por mail.
        </p>
      )}

      <div className="rounded-[20px] border border-border p-5">
        <ul className="divide-y divide-border">
          {order.items.map((it) => {
            const slug = it.variant?.product.slug;
            return (
              <li key={it.id} className="flex items-start justify-between gap-4 py-3 text-[15px] first:pt-0">
                <span className="min-w-0">
                  {slug ? (
                    <Link href={`/producto/${slug}`} className="font-semibold text-foreground hover:text-accent hover:underline">
                      {it.productNameSnapshot}
                    </Link>
                  ) : (
                    <span className="font-semibold">{it.productNameSnapshot}</span>
                  )}
                  <span className="block text-[14px] text-muted-foreground">
                    {it.variantNameSnapshot ? `${it.variantNameSnapshot} · ` : ""}× {it.qty}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{formatPrice(Number(it.lineTotal))}</span>
              </li>
            );
          })}
        </ul>
        <dl className="mt-3 space-y-2 border-t border-border pt-4 text-[15px]">
          <div className="flex justify-between text-muted-foreground"><dt>Subtotal</dt><dd className="tabular-nums">{formatPrice(Number(order.subtotal))}</dd></div>
          {Number(order.discountTotal) > 0 && (
            <div className="flex justify-between text-muted-foreground"><dt>Descuento</dt><dd className="tabular-nums">−{formatPrice(Number(order.discountTotal))}</dd></div>
          )}
          {!isDigital && (
            <div className="flex justify-between text-muted-foreground"><dt>Envío</dt><dd className="tabular-nums">{Number(order.shippingCost) === 0 ? "Gratis" : formatPrice(Number(order.shippingCost))}</dd></div>
          )}
          <div className="flex justify-between pt-1 text-[17px] font-bold"><dt>Total</dt><dd className="tabular-nums">{formatPrice(Number(order.total))}</dd></div>
        </dl>
      </div>
    </div>
  );
}
