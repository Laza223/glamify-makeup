"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Header fijo que publica su alto real en `--header-h` (cambia con el anuncio, las categorías,
 * la búsqueda mobile y el header mínimo del checkout). Lo usan los paneles sticky y el scroll a anclas.
 */
export function StickyHeader({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => root.style.setProperty("--header-h", `${el.offsetHeight}px`));
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--header-h");
    };
  }, []);
  return (
    <header ref={ref} data-site-header className="sticky top-0 z-sticky">
      {children}
    </header>
  );
}
