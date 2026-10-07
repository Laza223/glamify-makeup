"use client";

import { usePathname } from "next/navigation";
import { Truck } from "lucide-react";
import { formatPrice } from "@/lib/money";

/** Anuncio fijo de una línea (sin rotar): el umbral de envío gratis viene de Setting, nunca escrito a mano. */
export function AnnouncementBar({ freeShippingThreshold }: { freeShippingThreshold: number }) {
  const pathname = usePathname();
  if (pathname.startsWith("/checkout")) return null;

  return (
    <p className="flex items-center justify-center gap-2 bg-foreground px-4 py-1.5 text-center text-[13px] font-semibold leading-5 text-white">
      <Truck className="size-4 shrink-0 text-[#FF4FA3]" aria-hidden />
      <span>Envío gratis desde {formatPrice(freeShippingThreshold)}</span>
      <span className="hidden sm:inline"> · Despachamos en hasta 3 días hábiles</span>
    </p>
  );
}
