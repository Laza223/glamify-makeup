import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { whatsappLink } from "@/lib/whatsapp";
import { RetryPaymentButton } from "@/components/orders/retry-payment-button";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { AutoRefresh } from "@/components/orders/auto-refresh";
import { paymentReturnView } from "@/lib/payments/return-view";

export const metadata: Metadata = { title: "¡Gracias por tu compra!" };

export default async function GraciasPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const orderId = sp["external_reference"] ?? sp["external_reference[]"];
  const order = orderId ? await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } }) : null;

  const view = order ? paymentReturnView(order.status, sp["collection_status"] ?? sp["status"]) : null;
  const paid = view === "paid";
  const waiting = view === "approved_pending" || view === "confirming";
  const setting = await prisma.setting.findUnique({ where: { id: "default" }, select: { whatsappNumber: true } });
  const waHref = whatsappLink(
    setting?.whatsappNumber,
    order ? `¡Hola! Tengo una consulta sobre mi pedido ${order.orderNumber}` : undefined,
  );

  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      {paid && order && (
        <TrackOnMount
          event="purchase"
          onceKey={order.orderNumber}
          props={{ orderNumber: order.orderNumber, total: Number(order.total) }}
        />
      )}
      <span
        className={`mx-auto grid size-20 place-items-center rounded-full ${paid ? "bg-primary text-primary-foreground animate-in zoom-in-50 duration-500" : "bg-secondary text-muted-foreground"}`}
      >
        {paid ? <CheckCircle2 className="size-10" aria-hidden /> : <Clock className="size-10" aria-hidden />}
      </span>
      <h1 className="mt-6 font-display text-[34px] font-normal leading-tight md:text-[40px]">
        {paid
          ? <>¡Gracias, <em className="font-medium text-primary">reina</em>!</>
          : view === "approved_pending"
            ? "¡Recibimos tu pago!"
            : view === "closed"
              ? "Este pedido se canceló"
              : "Estamos confirmando tu pago"}
      </h1>
      {waiting && <AutoRefresh />}

      {order ? (
        <>
          <p className="mt-3 text-[16px] text-muted-foreground">
            {paid && "Ya lo recibimos y te avisamos por mail cuando sale. "}
            Pedido <strong className="text-foreground">{order.orderNumber}</strong>
            {waiting && " — lo estamos acreditando; esta página se actualiza sola y te llega el email de confirmación."}
            {view === "closed" && " — no se cobró. Si querés, armalo de nuevo desde la tienda."}
          </p>
          {paid && order.shippingMethod === "digital" && (
            <p className="mt-2 text-[15px] text-muted-foreground">
              Te mandamos la gift card por mail en unos minutos (revisá spam).
            </p>
          )}
          {view === "retry" && (
            <div className="mx-auto mt-5 max-w-sm space-y-2">
              <p className="text-[15px] text-muted-foreground">
                Si el pago no se completó (por ejemplo, no tenías saldo), podés volver a intentarlo. Si ya pagaste, esperá unos minutos.
              </p>
              <div className="flex justify-center"><RetryPaymentButton orderId={order.id} /></div>
            </div>
          )}
          <div className="mx-auto mt-8 max-w-sm rounded-[20px] bg-secondary p-5 text-left text-[15px]">
            <ul className="space-y-1">
              {order.items.map((it) => (
                <li key={it.id} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{it.productNameSnapshot}{it.variantNameSnapshot ? ` — ${it.variantNameSnapshot}` : ""} × {it.qty}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatPrice(Number(it.lineTotal))}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-border pt-3 text-[17px] font-bold">
              <span>Total</span><span className="tabular-nums">{formatPrice(Number(order.total))}</span>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-3 text-[16px] text-muted-foreground">Si completaste el pago, te mandamos la confirmación por email.</p>
      )}

      <div className="mt-8 flex flex-col items-center gap-3">
        <Link
          href="/tienda"
          className="inline-flex h-12 items-center rounded-2xl bg-foreground px-7 text-[16px] font-semibold text-white transition hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Seguir mirando
        </Link>
        {waHref && (
          <a href={waHref} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-accent hover:underline" target="_blank" rel="noopener noreferrer">
            ¿Dudas? Escribinos por WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
