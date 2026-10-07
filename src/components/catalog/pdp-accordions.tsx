import { Sparkles, Truck, ChevronDown } from "lucide-react";

interface PdpAccordionsProps {
  description?: string | null;
}

export function PdpAccordions({ description }: PdpAccordionsProps) {
  return (
    <div className="divide-y divide-border/80 border-y border-border/80 text-sm">
      {/* 1. Descripción */}
      <details className="group py-3.5" open>
        <summary className="flex cursor-pointer select-none list-none items-center justify-between font-sans text-sm font-semibold text-foreground">
          <span className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span>Descripción</span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="mt-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          <p className="whitespace-pre-line">
            {description ||
              "Si tenés dudas sobre este producto, escribinos por WhatsApp."}
          </p>
        </div>
      </details>

      {/* 2. Envíos y Medios de Pago */}
      <details className="group py-3.5">
        <summary className="flex cursor-pointer select-none list-none items-center justify-between font-sans text-sm font-semibold text-foreground">
          <span className="flex items-center gap-2">
            <Truck className="size-4 text-primary" />
            <span>Envíos & Medios de Pago</span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          <p>
            <strong>Envío a todo el país:</strong> Envíos a domicilio y a
            sucursal vía Correo Argentino, con número de seguimiento.
          </p>
          <p>
            <strong>Medios de pago:</strong> Tarjetas de crédito, débito y
            dinero en cuenta a través de Mercado Pago.
          </p>
        </div>
      </details>
    </div>
  );
}
