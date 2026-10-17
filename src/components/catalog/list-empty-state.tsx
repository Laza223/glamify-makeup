"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SearchX } from "lucide-react";
import { activeFilterKeys } from "@/lib/catalog/filters";

const CTA =
  "inline-flex h-12 items-center rounded-2xl bg-foreground px-7 text-[15px] font-semibold text-white transition hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/** Listado vacío: distingue una búsqueda/filtro sin resultados de una categoría que todavía no tiene productos. */
export function ListEmptyState() {
  const params = useSearchParams();
  const pathname = usePathname();
  const filtered = Boolean(params.get("q")) || activeFilterKeys((k) => params.get(k)).length > 0;

  return (
    <div className="flex flex-col items-center gap-4 rounded-[20px] bg-secondary px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-white text-primary shadow-sm">
        <SearchX className="size-6" aria-hidden />
      </span>
      {filtered ? (
        <>
          <div className="space-y-1">
            <p className="font-display text-[24px] text-foreground">
              Uy, no encontramos <em className="font-medium text-primary">nada</em>
            </p>
            <p className="text-[15px] text-muted-foreground">Probá con otra palabra o sacá algún filtro.</p>
          </div>
          <Link href={pathname} className={CTA}>
            Limpiar filtros
          </Link>
        </>
      ) : (
        <>
          <div className="space-y-1">
            <p className="font-display text-[24px] text-foreground">
              Esta categoría todavía <em className="font-medium text-primary">está vacía</em>
            </p>
            <p className="text-[15px] text-muted-foreground">Mientras tanto, mirá el resto de la tienda.</p>
          </div>
          <Link href="/tienda" className={CTA}>
            Ver toda la tienda
          </Link>
        </>
      )}
    </div>
  );
}
