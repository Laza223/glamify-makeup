"use client";

import { usePathname } from "next/navigation";
import { formatPrice } from "@/lib/money";

/** Anuncio fijo de una línea (sin rotar): el umbral de envío gratis viene de Setting, nunca escrito a mano. */
export function AnnouncementBar({ freeShippingThreshold }: { freeShippingThreshold: number }) {
  const pathname = usePathname();
  if (pathname.startsWith("/checkout")) return null;

  return (
    <p className="bg-primary px-4 py-1.5 text-center text-[13px] font-semibold leading-5 text-primary-foreground">
      Envío gratis desde {formatPrice(freeShippingThreshold)}
      <span className="hidden sm:inline"> · Despachamos en hasta 3 días hábiles</span>
    </p>
  );
}
