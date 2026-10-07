import { ChevronDown } from "lucide-react";

interface PdpAccordionsProps {
  description?: string | null;
}

const SUMMARY =
  "flex min-h-12 cursor-pointer select-none list-none items-center justify-between text-[16px] font-bold text-foreground [&::-webkit-details-marker]:hidden";

export function PdpAccordions({ description }: PdpAccordionsProps) {
  return (
    <div className="divide-y divide-border border-y border-border">
      <details className="group py-1" open>
        <summary className={SUMMARY}>
          Descripción
          <ChevronDown className="size-5 text-muted-foreground transition-transform duration-300 group-open:rotate-180" aria-hidden />
        </summary>
        <p className="whitespace-pre-line pb-4 text-[16px] leading-relaxed text-muted-foreground">
          {description || "¿Tenés dudas sobre este producto? Escribinos por WhatsApp y te contamos todo."}
        </p>
      </details>
      <details className="group py-1">
        <summary className={SUMMARY}>
          Envíos y medios de pago
          <ChevronDown className="size-5 text-muted-foreground transition-transform duration-300 group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-2 pb-4 text-[16px] leading-relaxed text-muted-foreground">
          <p>
            <strong className="text-foreground">Envío a todo el país:</strong> a domicilio o a sucursal con Correo
            Argentino, con número de seguimiento.
          </p>
          <p>
            <strong className="text-foreground">Medios de pago:</strong> tarjeta de crédito, débito o dinero en cuenta con
            Mercado Pago.
          </p>
        </div>
      </details>
    </div>
  );
}
