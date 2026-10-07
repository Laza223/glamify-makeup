import { cn } from "@/lib/utils";

/**
 * Etiqueta de precio colgante (mundo "cartel de feria"): placa con agujero e hilo, geometría exacta.
 * `swingKey` cambia → la etiqueta se balancea una vez desde el agujero (sin movimiento con reduced-motion).
 */
export function HangingTag({
  children,
  muted = false,
  swingKey,
  className,
}: {
  children: React.ReactNode;
  muted?: boolean;
  swingKey?: number;
  className?: string;
}) {
  return (
    <span className={cn("pointer-events-none absolute left-3 top-0 z-10 flex flex-col items-start", className)}>
      {/* hilo */}
      <span aria-hidden className="ml-[13px] h-3 w-px bg-foreground/60" />
      <span
        key={swingKey}
        className={cn(
          "relative inline-flex origin-[14px_6px] -rotate-3 items-center gap-1.5 rounded-[6px] py-1 pl-6 pr-2.5 text-[15px] font-bold leading-tight tabular-nums shadow-[0_2px_6px_-2px_rgb(110_10_60/0.35)]",
          muted ? "bg-muted text-muted-foreground" : "bg-white text-foreground",
          swingKey ? "animate-tag-swing" : "",
        )}
      >
        {/* agujero */}
        <span aria-hidden className="absolute left-2 top-1/2 size-2 -translate-y-1/2 rounded-full border border-foreground/50 bg-muted" />
        {children}
      </span>
    </span>
  );
}
