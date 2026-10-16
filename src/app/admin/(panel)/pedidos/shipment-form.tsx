"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Truck, Send, Mail, AlertCircle, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { upsertShipmentAction, resendDispatchEmailAction } from "./actions";
import { CARRIERS, carrierLabel, carrierTrackingUrl, isCarrier, type CarrierId } from "@/lib/shipping/carriers";
import type { ShipmentStatus } from "@prisma/client";

const fieldClass =
  "h-11 rounded-xl border border-input bg-background px-3 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm";

/** Estado del envío en palabras de la dueña (solo Correo: lo actualiza el cron de seguimiento). */
const SHIPMENT_LABELS: Record<ShipmentStatus, string> = {
  pending: "Todavía no salió",
  ready: "Todavía no salió",
  dispatched: "Despachado (esperando el primer movimiento de Correo)",
  in_transit: "En camino",
  delivered: "Entregado",
  returned: "Devuelto al remitente",
};

export interface ShipmentDefaults {
  carrier: CarrierId;
  trackingNumber: string;
  status: ShipmentStatus;
  /** Pedido a sucursal: se muestra el campo opcional de sucursal de retiro. */
  isSucursal: boolean;
  /** Sucursal de retiro ya cargada (texto libre). */
  pickupBranch: string;
  /** El pedido ya está Enviado: se puede reenviar el mail de despacho. */
  canResend: boolean;
  /** Último movimiento informado por Correo, legible (solo se consulta para Correo Argentino). */
  lastEvent: string | null;
  /** Cuándo se consultó Correo por última vez (texto ya formateado en ART). */
  checkedAt: string | null;
  /** Correo dejó el paquete en la sucursal para que la clienta lo retire. */
  awaitingPickup: boolean;
}

export function ShipmentForm({ orderId, defaults }: { orderId: string; defaults: ShipmentDefaults }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resending, startResend] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [carrier, setCarrier] = useState<string>(defaults.carrier);
  const hasTracking = Boolean(defaults.trackingNumber);
  const isCorreo = defaults.carrier === "correo_argentino";

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setOk(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await upsertShipmentAction(orderId, {
        carrier,
        trackingNumber: String(fd.get("trackingNumber") ?? ""),
        pickupBranch: String(fd.get("pickupBranch") ?? ""),
      });
      if (!r.ok) setError(r.error ?? "No se pudo guardar el despacho.");
      else {
        setOk("Despacho guardado.");
        router.refresh();
      }
    });
  };

  const resend = () => {
    setError(null);
    setOk(null);
    startResend(async () => {
      const r = await resendDispatchEmailAction(orderId);
      if (!r.ok) setError(r.error ?? "No se pudo reenviar el mail.");
      else setOk("Mail reenviado.");
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="carrier">Empresa</Label>
        <select id="carrier" name="carrier" required value={carrier} onChange={(e) => setCarrier(e.target.value)} className={fieldClass}>
          {CARRIERS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {isCarrier(carrier) ? (
          <p className="text-xs text-muted-foreground">Link para la clienta: {carrierTrackingUrl(carrier)}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="trackingNumber">Código de seguimiento</Label>
        <input
          id="trackingNumber"
          name="trackingNumber"
          required
          maxLength={80}
          defaultValue={defaults.trackingNumber}
          placeholder="El código que te da la empresa al despachar"
          className={fieldClass}
        />
        <p className="text-xs text-muted-foreground">
          Al guardarlo, el pedido pasa a &quot;Enviado&quot; y la clienta recibe el mail con la empresa y el código. Para
          Correo Argentino los estados se actualizan solos; con las otras empresas los cambiás vos.
        </p>
      </div>

      {defaults.isSucursal ? (
        <div className="grid gap-2">
          <Label htmlFor="pickupBranch">Sucursal de retiro (si aplica)</Label>
          <input
            id="pickupBranch"
            name="pickupBranch"
            maxLength={160}
            defaultValue={defaults.pickupBranch}
            placeholder="Ej: Sucursal Luján, Mitre 123"
            className={fieldClass}
          />
          <p className="text-xs text-muted-foreground">
            Opcional. Si la completás, va en el mail; si no, el mail le avisa que le contás dónde retirarlo.
          </p>
        </div>
      ) : null}

      {hasTracking ? (
        <div className="rounded-xl border border-border/70 bg-surface-alt/40 p-4 text-sm">
          <p className="font-semibold text-foreground">
            {isCorreo
              ? defaults.awaitingPickup && defaults.status === "in_transit"
                ? "Esperando que la clienta lo retire en la sucursal"
                : SHIPMENT_LABELS[defaults.status]
              : `Despachado con ${carrierLabel(defaults.carrier)}`}
          </p>
          {isCorreo ? (
            <>
              {defaults.lastEvent ? <p className="mt-1 text-muted-foreground">{defaults.lastEvent}</p> : null}
              <p className="mt-1 text-xs text-muted-foreground">
                {defaults.checkedAt
                  ? `Consultado en Correo: ${defaults.checkedAt}. Se vuelve a consultar cada pocas horas.`
                  : "Todavía no se consultó en Correo: se hace solo dentro de la próxima hora."}
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Con esta empresa no hay seguimiento automático: marcá el pedido como Entregado a mano.
            </p>
          )}
        </div>
      ) : null}

      {error ? (
        <p className="flex items-center gap-1.5 text-sm font-medium text-destructive" role="alert">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="flex items-center gap-1.5 text-sm font-medium text-success">
          <CircleCheck className="size-4 shrink-0" aria-hidden />
          {ok}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending || resending}>
          {pending ? (
            <>
              <Truck className="size-4 animate-pulse" aria-hidden />
              Guardando…
            </>
          ) : (
            <>
              <Send className="size-4" aria-hidden />
              {defaults.canResend ? "Guardar cambios" : "Marcar despachado"}
            </>
          )}
        </Button>
        {defaults.canResend && hasTracking ? (
          <Button type="button" variant="outline" onClick={resend} disabled={pending || resending}>
            <Mail className="size-4" aria-hidden />
            {resending ? "Reenviando…" : "Reenviar mail de despacho"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
