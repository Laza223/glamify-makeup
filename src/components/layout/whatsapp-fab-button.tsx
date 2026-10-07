"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

export function WhatsAppFabButton({ href }: { href: string }) {
  const pathname = usePathname();

  // Ocultar en PDP (donde está la sticky buy bar en mobile) y en checkout (para no tapar inputs ni botones)
  if (pathname.startsWith("/checkout") || pathname.startsWith("/producto/")) {
    return null;
  }

  // Mobile: a la izquierda, para no tapar el + ni el corazón de las tarjetas (están a la derecha de cada foto).
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Consultar por WhatsApp"
      className="fixed bottom-20 left-4 z-30 md:left-auto md:right-6 flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-[#0E7A50] text-white shadow-[0_4px_12px_-4px_rgb(0_0_0/0.35)] transition-colors hover:bg-[#0B6542] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:bottom-6 md:h-12 md:w-auto md:px-5"
    >
      <MessageCircle className="size-6" aria-hidden />
      <span className="hidden text-[15px] font-semibold md:inline">Escribinos</span>
    </a>
  );
}
