"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { formatPrice } from "@/lib/money";

const LABELS: Record<string, (v: string) => string> = {
  min: (v) => `Desde ${formatPrice(Number(v))}`,
  max: (v) => `Hasta ${formatPrice(Number(v))}`,
  oferta: () => "Con descuento",
  disponible: () => "En stock",
};

export function ActiveFilterChips() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const active = Object.keys(LABELS).filter((k) => params.get(k));
  if (active.length === 0) return null;

  const remove = (key: string) => {
    const next = new URLSearchParams(params.toString());
    next.delete(key);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <ul className="flex flex-wrap gap-2">
      {active.map((k) => (
        <li key={k}>
          <button
            type="button"
            onClick={() => remove(k)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-secondary px-4 text-[15px] font-semibold text-foreground transition-colors hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {LABELS[k](params.get(k) as string)}
            <X className="size-4" aria-hidden />
            <span className="sr-only">Quitar filtro</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
