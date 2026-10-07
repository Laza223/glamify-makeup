"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useCartUI } from "@/components/cart/cart-provider";
import { cn } from "@/lib/utils";

export function CartButton({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  const { openCart, cartCount } = useCartUI();
  const displayCount = typeof cartCount === "number" ? cartCount : count;
  // Rebote con masa cada vez que suma (no al restar ni al cargar).
  const prev = useRef(displayCount);
  const [bumps, setBumps] = useState(0);
  useEffect(() => {
    if (displayCount > prev.current) setBumps((n) => n + 1);
    prev.current = displayCount;
  }, [displayCount]);

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={`Carrito${displayCount > 0 ? ` (${displayCount})` : ""}`}
      className={cn(
        "relative grid size-11 place-items-center rounded-full text-foreground transition-colors hover:bg-secondary hover:text-accent",
        className,
      )}
    >
      <ShoppingBag className="size-5" aria-hidden />
      {displayCount > 0 && (
        <span
          key={bumps}
          className={cn(
            "absolute right-1 top-1 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold tabular-nums text-primary-foreground",
            bumps > 0 && "animate-count-bump",
          )}
        >
          {displayCount}
        </span>
      )}
    </button>
  );
}
