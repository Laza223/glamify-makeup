"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Truck, Send, AlertCircle, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { upsertShipmentAction } from "./actions";
import type { ShipmentStatus } from "@prisma/client";

const fieldClass =
  "h-11 rounded-xl border border-input bg-background px-3 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm";

/** Estado del envío en palabras de la dueña. Lo actualiza solo el cron de seguimiento. */
const SHIPMENT_LABELS: Record<ShipmentStatus, string> = {
  pending: "Todavía no salió",
  ready: "Todavía no salió",
  dispatched: "Despachado (esperando el primer movimiento de Correo)",
  in_transit: "En camino",
  delivered: "Entregado",
  returned: "Devuelto al remitente",
};

export interface ShipmentDefaults {
  trackingNumber: string;
  status: ShipmentStatus;
  /** Último movimiento informado por Correo, legible. */
  lastEvent: string | null;
  /** Cuándo se consultó Correo por última vez (texto ya formateado en ART). */
  checkedAt: string | null;
  /** Correo dejó el paquete en la sucursal para que la clienta lo retire. */
  awaitingPickup: boolean;
}

export function ShipmentForm({ orderId, defaults }: { orderId: string; defaults: ShipmentDefaults }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const hasTracking = Boolean(defaults.trackingNumber);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setOk(false);
    const trackingNumber = String(new FormData(e.currentTarget).get("trackingNumber") ?? "");
    startTransition(async () => {
      const r = await upsertShipmentAction(orderId, trackingNumber);
      if (!r.ok) setError(r.error ?? "No se pudo guardar el seguimiento.");
      else {
        setOk(true);
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="trackingNumber">Número de seguimiento</Label>
        <input
          id="trackingNumber"
          name="trackingNumber"
          required
          defaultValue={defaults.trackingNumber}
          placeholder="Lo copiás de MiCorreo al despachar"
          className={fieldClass}
        />
        <p className="text-xs text-muted-foreground">
          Al guardarlo, el pedido pasa a &quot;Enviado&quot; y la clienta recibe el mail con el seguimiento. Después los
          estados (en camino, en sucursal, entregado) se actualizan solos con lo que informa Correo.
        </p>
      </div>

      {hasTracking ? (
        <div className="rounded-xl border border-border/70 bg-surface-alt/40 p-4 text-sm">
          <p className="font-semibold text-foreground">
            {defaults.awaitingPickup && defaults.status === "in_transit"
              ? "Esperando que la clienta lo retire en la sucursal"
              : SHIPMENT_LABELS[defaults.status]}
          </p>
          {defaults.lastEvent ? <p className="mt-1 text-muted-foreground">{defaults.lastEvent}</p> : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {defaults.checkedAt
              ? `Consultado en Correo: ${defaults.checkedAt}. Se vuelve a consultar cada pocas horas.`
              : "Todavía no se consultó en Correo: se hace solo dentro de la próxima hora."}
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="flex items-center gap-1.5 text-sm font-medium text-success">
          <CircleCheck className="size-4 shrink-0" aria-hidden />
          Seguimiento guardado.
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Truck className="size-4 animate-pulse" aria-hidden />
            Guardando…
          </>
        ) : (
          <>
            <Send className="size-4" aria-hidden />
            {hasTracking ? "Corregir número" : "Guardar y avisar a la clienta"}
          </>
        )}
      </Button>
    </form>
  );
}
