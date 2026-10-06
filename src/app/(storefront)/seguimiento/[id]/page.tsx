import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Truck, PackageCheck, MapPin, Undo2, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CORREO_TRACKING_URL } from "@/lib/shipping/tracking";
import { shipmentStatusLabel } from "@/lib/shipping/tracking-status";
import { CopyButton } from "@/components/orders/copy-button";
import { Button } from "@/components/ui/button";

// Link privado que llega por mail: no se indexa.
export const metadata: Metadata = { title: "Seguimiento de tu pedido", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ART = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });

/**
 * Seguimiento del pedido para la clienta, sin iniciar sesión. Correo Argentino no tiene un link
 * directo por envío; ésta muestra lo que el cron de seguimiento guardó. La URL lleva el id interno
 * del pedido (UUID, no adivinable), no el número de pedido.
 */
export default async function SeguimientoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const order = await prisma.order.findUnique({
    where: { id },
    select: { orderNumber: true, contactName: true, shipment: true },
  });
  const s = order?.shipment;
  if (!order || !s?.trackingNumber) notFound();

  const awaitingPickup = s.trackingNotified.includes("awaiting_pickup");
  const label = shipmentStatusLabel(s.status, awaitingPickup);
  const Icon = s.status === "delivered" ? PackageCheck : s.status === "returned" ? Undo2 : awaitingPickup && s.status === "in_transit" ? MapPin : Truck;
  const firstName = order.contactName.split(" ")[0];

  return (
    <div className="mx-auto max-w-lg py-10">
      <p className="text-center text-sm text-muted-foreground">Pedido {order.orderNumber}</p>
      <h1 className="mt-1 text-center font-display text-2xl font-bold">Hola, {firstName}</h1>

      <section className="mt-6 rounded-2xl border border-border p-6 text-center shadow-soft">
        <Icon className="mx-auto size-12 text-primary" aria-hidden />
        <p className="mt-3 font-display text-xl font-semibold">{label}</p>
        {s.trackingLastEvent ? <p className="mt-2 text-sm text-muted-foreground">Último movimiento: {s.trackingLastEvent}</p> : null}
        {awaitingPickup && s.status === "in_transit" ? (
          <p className="mt-2 text-sm text-foreground">Retiralo con tu DNI y el número de seguimiento. Si no se retira a tiempo, Correo lo devuelve.</p>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">
          {s.trackingCheckedAt
            ? `Actualizado con Correo Argentino: ${ART.format(s.trackingCheckedAt)}.`
            : "Todavía no hay movimientos de Correo: se actualiza solo cada pocas horas."}
        </p>
      </section>

      <section className="mt-4 rounded-2xl border border-border p-6">
        <p className="text-sm text-muted-foreground">Número de seguimiento de Correo Argentino</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-lg font-semibold tracking-wide text-primary">{s.trackingNumber}</span>
          <CopyButton text={s.trackingNumber} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Para ver cada movimiento en detalle, copiá el número y pegalo en la página de Correo Argentino.
        </p>
        <Button asChild variant="outline" className="mt-3 w-full gap-1.5">
          <a href={CORREO_TRACKING_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" aria-hidden /> Ver en Correo Argentino
          </a>
        </Button>
      </section>

      <p className="mt-6 text-center text-sm">
        <Link href="/tienda" className="text-primary hover:underline">Seguir comprando</Link>
      </p>
    </div>
  );
}
