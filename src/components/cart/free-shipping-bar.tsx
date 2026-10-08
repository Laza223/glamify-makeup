import { formatPrice } from "@/lib/money";
import { Truck, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

/** Progreso real hacia el envío gratis (umbral de Setting). */
export function FreeShippingBar({ subtotal, threshold }: { subtotal: number; threshold: number }) {
  if (threshold <= 0) return null;
  const remaining = Math.max(0, threshold - subtotal);
  const pct = Math.min(100, Math.round((subtotal / threshold) * 100));
  const hasFree = remaining <= 0;

  return (
    <div className={cn("rounded-[18px] p-4", hasFree ? "bg-success/10" : "bg-secondary")}>
      <p className="mb-2.5 flex items-center gap-2 text-[15px] text-foreground">
        {hasFree ? (
          <PartyPopper className="size-5 shrink-0 text-success" aria-hidden />
        ) : (
          <Truck className="size-5 shrink-0 text-primary" aria-hidden />
        )}
        <span>
          {hasFree ? (
            <>
              ¡Listo! Tu envío es <strong>gratis</strong>
            </>
          ) : (
            <>
              Te faltan <strong className="tabular-nums text-accent">{formatPrice(remaining)}</strong> para el envío gratis
            </>
          )}
        </span>
      </p>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-white"
        role="progressbar"
        aria-label="Progreso hacia el envío gratis"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out", hasFree ? "bg-success" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
