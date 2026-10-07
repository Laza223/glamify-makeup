"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleWishlistAction } from "@/app/(storefront)/cuenta/favoritos/actions";

export function WishlistHeart({ productId, initial = false, className }: { productId: string; initial?: boolean; className?: string }) {
  const router = useRouter();
  const [active, setActive] = useState(initial);
  const [pending, startTransition] = useTransition();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !active;
    setActive(next); // optimista
    startTransition(async () => {
      const res = await toggleWishlistAction(productId);
      if (res.needsAuth) { router.push("/ingresar"); return; }
      if (!res.ok) { setActive(!next); return; } // revertir
      if (typeof res.added === "boolean") setActive(res.added);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={active}
      aria-label={active ? "Quitar de favoritos" : "Agregar a favoritos"}
      className={cn("grid size-11 place-items-center rounded-full bg-white/90 text-foreground shadow-[0_2px_6px_-2px_rgb(0_0_0/0.18)] transition hover:bg-white", className)}
    >
      <Heart className={cn("size-5", active ? "fill-primary text-primary" : "text-muted-foreground")} aria-hidden />
    </button>
  );
}
