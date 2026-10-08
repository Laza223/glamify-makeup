import Link from "next/link";
import { SearchX } from "lucide-react";
import { ProductGrid } from "@/components/catalog/product-grid";
import { SortSelect } from "@/components/catalog/sort-select";
import { FilterSheet } from "@/components/catalog/filter-sheet";
import { ActiveFilterChips } from "@/components/catalog/active-filter-chips";
import { CatalogPagination } from "@/components/catalog/catalog-pagination";
import { CategoryChipsNav } from "@/components/catalog/category-chips-nav";
import type { ProductListResult } from "@/lib/catalog/queries";
import type { CategoryNode } from "@/lib/catalog/categories";

/**
 * Listado del catálogo (tienda, categoría, subcategoría, búsqueda, regalos).
 * Título con la voz de la home: Playfair y, si hay `accent`, una palabra en itálica rosa.
 */
export function ProductListView({
  title,
  accent,
  result,
  categories,
  activeSlug,
}: {
  title: string;
  accent?: string;
  result: ProductListResult;
  categories?: CategoryNode[];
  activeSlug?: string;
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="font-display text-[32px] font-normal leading-tight text-foreground md:text-[44px]">
            {title}
            {accent && (
              <>
                {" "}
                <em className="font-medium text-primary">{accent}</em>
              </>
            )}
          </h1>
          <p className="mt-1 text-[15px] text-muted-foreground" aria-live="polite">
            {result.total === 1 ? "1 producto" : `${result.total} productos`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FilterSheet />
          <SortSelect />
        </div>
      </div>

      {/* En desktop las categorías ya están en la segunda fila del header. */}
      {categories && categories.length > 0 && (
        <CategoryChipsNav categories={categories} activeSlug={activeSlug} className="md:hidden" />
      )}

      <ActiveFilterChips />

      {result.items.length > 0 ? (
        <>
          <ProductGrid products={result.items} />
          <CatalogPagination page={result.page} totalPages={result.totalPages} />
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-[20px] bg-secondary px-6 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-white text-primary shadow-sm">
            <SearchX className="size-6" aria-hidden />
          </span>
          <div className="space-y-1">
            <p className="font-display text-[24px] text-foreground">
              Uy, no encontramos <em className="font-medium text-primary">nada</em>
            </p>
            <p className="text-[15px] text-muted-foreground">Probá con otra palabra o sacá algún filtro.</p>
          </div>
          <Link
            href="/tienda"
            className="inline-flex h-12 items-center rounded-2xl bg-foreground px-7 text-[15px] font-semibold text-white transition hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Ver toda la tienda
          </Link>
        </div>
      )}
    </section>
  );
}
