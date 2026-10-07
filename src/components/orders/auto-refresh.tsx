"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-renderiza la página cada `everyMs` hasta `times` veces (esperar al webhook sin que la clienta recargue). */
export function AutoRefresh({ everyMs = 4000, times = 15 }: { everyMs?: number; times?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      router.refresh();
      if (n >= times) clearInterval(id);
    }, everyMs);
    return () => clearInterval(id);
  }, [router, everyMs, times]);
  return null;
}
