import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatARS } from "@/lib/money";
import { whatsappLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
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
      {paid ? <CheckCircle2 className="mx-auto size-14 text-primary" /> : <Clock className="mx-auto size-14 text-muted-foreground" />}
      <h1 className="mt-4 font-display text-2xl font-bold">
        {paid
          ? "¡Gracias por tu compra!"
          : view === "approved_pending"
            ? "¡Recibimos tu pago!"
            : view === "closed"
              ? "Este pedido se canceló"
              : view === "retry"
                ? "Tu pago no se completó"
                : "Estamos confirmando tu pago"}
      </h1>
      {waiting && <AutoRefresh />}

      {order ? (
        <>
          <p className="mt-2 text-muted-foreground">
            Pedido <strong className="text-foreground">{order.orderNumber}</strong>
            {waiting && " — lo estamos acreditando; esta página se actualiza sola y te llega el email de confirmación."}
            {view === "closed" && " — no se cobró. Si querés, armalo de nuevo desde la tienda."}
          </p>
          {paid && order.shippingMethod === "digital" && (
            <p className="mt-2 text-sm text-muted-foreground">
              Te mandamos la gift card por mail en unos minutos (revisá spam).
            </p>
          )}
          {view === "retry" && (
            <div className="mx-auto mt-5 max-w-sm space-y-2">
              <p className="text-sm text-muted-foreground">
                Podés volver a intentarlo (por ejemplo, con otra tarjeta). Tu carrito sigue guardado. Si ya pagaste, esperá unos minutos.
              </p>
              <div className="flex justify-center"><RetryPaymentButton orderId={order.id} /></div>
            </div>
          )}
          <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-border p-5 text-left text-sm">
            <ul className="space-y-1">
              {order.items.map((it) => (
                <li key={it.id} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{it.productNameSnapshot}{it.variantNameSnapshot ? ` — ${it.variantNameSnapshot}` : ""} × {it.qty}</span>
                  <span className="tabular-nums">{formatARS(Number(it.lineTotal))}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-border pt-3 font-bold">
              <span>Total</span><span className="tabular-nums">{formatARS(Number(order.total))}</span>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-2 text-muted-foreground">Si completaste el pago, te enviaremos la confirmación por email.</p>
      )}

      <div className="mt-8 flex flex-col items-center gap-3">
        <Button asChild><Link href="/tienda">Seguir comprando</Link></Button>
        {waHref && (
          <a href={waHref} className="text-sm text-primary hover:underline" target="_blank" rel="noopener noreferrer">
            ¿Dudas? Escribinos por WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
