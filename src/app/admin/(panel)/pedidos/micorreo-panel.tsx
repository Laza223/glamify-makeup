"use client";

import { useState } from "react";
import { PackageCheck, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const MICORREO_URL = "https://www.correoargentino.com.ar/MiCorreo/public/";

export interface MicorreoPanelProps {
  orderNumber: string;
  /** true si el pedido ya tiene número de seguimiento (ya despachado). */
  trackingLoaded: boolean;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  isSucursal: boolean;
  /** Dirección tal cual la cargó la clienta en el checkout. */
  address: {
    street?: string;
    number?: string;
    floorApt?: string | null;
    city?: string;
    province?: string | null;
    cp?: string;
    notes?: string | null;
    agencyLabel?: string | null;
  };
  weightGr: number;
  /** Medidas del paquete, ej. "12 × 5 × 5 cm". */
  dimensions: string;
  declaredValue: number;
}

interface Row {
  label: string;
  value: string;
}

/** Fila de dato del bloque "datos del envío". */
function DataRow({ label, value }: Row) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function MicorreoPanel(props: MicorreoPanelProps) {
  const { orderNumber, trackingLoaded, address: a } = props;
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mismos campos que pide el formulario de envío de MiCorreo, en su orden. Lo que la clienta
  // no completó (piso, notas) no se muestra.
  const rows: Row[] = [
    { label: "Pedido", value: orderNumber },
    { label: "Destinatario", value: props.recipientName },
    { label: "Email", value: props.recipientEmail },
    { label: "Teléfono", value: props.recipientPhone },
    { label: "Tipo de entrega", value: props.isSucursal ? "Sucursal" : "Domicilio" },
    ...(props.isSucursal
      ? [{ label: "Sucursal", value: a.agencyLabel || "No guardada" }]
      : [
          { label: "Calle", value: a.street ?? "" },
          { label: "Altura", value: a.number ?? "" },
          { label: "Piso / Dpto", value: a.floorApt ?? "" },
        ]),
    { label: "Localidad", value: a.city ?? "" },
    { label: "Provincia", value: a.province ?? "" },
    { label: "Código postal", value: a.cp ?? "" },
    { label: "Observaciones", value: a.notes ?? "" },
    { label: "Peso", value: `${props.weightGr} g` },
    { label: "Medidas", value: props.dimensions },
    { label: "Valor declarado", value: `$${props.declaredValue.toLocaleString("es-AR")}` },
  ].filter((r) => r.value.trim() !== "");

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(rows.map((r) => `${r.label}: ${r.value}`).join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("No pude copiar. Copialos a mano.");
    }
  };

  const pasos = [
    "Entrá a MiCorreo con tu cuenta.",
    'Tocá "Nuevo envío" y cargá los datos de abajo (podés copiarlos con el botón).',
    "Pagá el envío con tu saldo de MiCorreo.",
    "Imprimí el rótulo (etiqueta) y pegalo en el paquete.",
    "Despachá el paquete (llevalo o pedí retiro).",
    'Copiá el número de seguimiento y pegalo abajo en "Envío y seguimiento". Eso le avisa a la clienta.',
  ];

  return (
    <section className="rounded-2xl border border-border/70 bg-card shadow-soft">
      <header className="flex items-center gap-2.5 rounded-t-2xl bg-primary/10 px-5 py-3.5">
        <span className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary" aria-hidden>
          <PackageCheck className="size-[18px]" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Cómo despachar en MiCorreo</h2>
          <p className="text-xs text-muted-foreground">
            {trackingLoaded
              ? "Este pedido ya está despachado (tiene seguimiento). Los pasos quedan de referencia."
              : "Cargá este envío a mano en MiCorreo con los datos de abajo."}
          </p>
        </div>
      </header>

      <div className="space-y-4 p-5">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-foreground">
          {pasos.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ol>

        <div className="rounded-xl border border-border/70 bg-surface-alt/40 p-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Datos del envío</span>
            <Button type="button" variant="ghost" size="sm" onClick={copiar} className="gap-1.5">
              {copied ? <Check className="size-4 text-primary" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <dl className="divide-y divide-border/50">
            {rows.map((r) => (
              <DataRow key={r.label} {...r} />
            ))}
          </dl>
        </div>

        {error ? (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button asChild variant="outline" className="gap-1.5">
          <a href={MICORREO_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" aria-hidden /> Abrir MiCorreo
          </a>
        </Button>
      </div>
    </section>
  );
}
