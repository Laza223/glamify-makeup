"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleWishlistAction } from "@/app/(storefront)/cuenta/favoritos/actions";

type Notice = "guest" | "error" | null;

export function WishlistHeart({ productId, initial = false, className }: { productId: string; initial?: boolean; className?: string }) {
  const pathname = usePathname();
  const [active, setActive] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [touched, setTouched] = useState(false); // late solo cuando lo marca ella, no al cargar
  const [notice, setNotice] = useState<Notice>(null);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !active;
    setTouched(true);
    setNotice(null);
    setActive(next); // optimista
    startTransition(async () => {
      try {
        const res = await toggleWishlistAction(productId);
        if (res.needsAuth) { setActive(!next); setNotice("guest"); return; }
        if (!res.ok) { setActive(!next); setNotice("error"); return; } // revertir
        if (typeof res.added === "boolean") setActive(res.added);
      } catch {
        setActive(!next);
        setNotice("error");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={active}
        aria-label={active ? "Quitar de favoritos" : "Agregar a favoritos"}
        className={cn("grid size-11 place-items-center rounded-full bg-white/90 text-foreground shadow-[0_2px_6px_-2px_rgb(0_0_0/0.18)] transition hover:bg-white motion-reduce:transition-none", className)}
      >
        <Heart
          key={active ? "on" : "off"}
          className={cn("size-5", active ? cn("fill-primary text-primary", touched && "animate-heart-pop motion-reduce:animate-none") : "text-muted-foreground")}
          aria-hidden
        />
      </button>
      {notice && (
        // Aviso fijo (no depende del contenedor: el corazón vive dentro de tarjetas con overflow oculto).
        <div
          role="status"
          className="fixed inset-x-4 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-toast mx-auto flex max-w-sm items-center gap-1 rounded-2xl bg-foreground py-1 pl-4 pr-1 text-[15px] text-white shadow-lg md:bottom-6"
        >
          <p className="flex-1 py-2">
            {notice === "guest" ? "Ingresá para guardar tus favoritos." : "No pudimos actualizar tus favoritos. Probá de nuevo."}
          </p>
          {notice === "guest" && (
            <Link
              href={`/ingresar?next=${encodeURIComponent(pathname)}`}
              className="inline-flex min-h-11 items-center px-2 font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Ingresar
            </Link>
          )}
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Cerrar aviso"
            className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </>
  );
}
