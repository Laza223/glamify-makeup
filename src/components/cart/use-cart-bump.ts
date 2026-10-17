"use client";

import { useEffect, useRef, useState } from "react";
import { useCartUI } from "@/components/cart/cart-provider";

/** Salida del drawer (`sheet.tsx`, duration-300): el rebote espera a que termine de irse. */
const AFTER_DRAWER_MS = 320;

/**
 * Rebotes del contador del carrito: uno cada vez que sube (no al restar ni al cargar).
 * Agregar desde la ficha abre el drawer, que tapa el contador: ahí el rebote espera a que se cierre.
 */
export function useCartBump(count: number): number {
  const { open } = useCartUI();
  const prevCount = useRef(count);
  const wasOpen = useRef(open);
  const pending = useRef(false);
  const [bumps, setBumps] = useState(0);
  useEffect(() => {
    if (count > prevCount.current) pending.current = true;
    prevCount.current = count;
    const justClosed = wasOpen.current && !open;
    wasOpen.current = open;
    if (!pending.current || open) return;
    const t = setTimeout(
      () => {
        pending.current = false;
        setBumps((n) => n + 1);
      },
      justClosed ? AFTER_DRAWER_MS : 0,
    );
    return () => clearTimeout(t);
  }, [count, open]);
  return bumps;
}
