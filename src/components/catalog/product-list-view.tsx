import { ProductGrid } from "@/components/catalog/product-grid";
import { SortSelect } from "@/components/catalog/sort-select";
import { FilterSheet } from "@/components/catalog/filter-sheet";
import { ActiveFilterChips } from "@/components/catalog/active-filter-chips";
import { CatalogPagination } from "@/components/catalog/catalog-pagination";
import { CategoryChipsNav } from "@/components/catalog/category-chips-nav";
import { ListEmptyState } from "@/components/catalog/list-empty-state";
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
        <div className="min-w-0">
          <h1 className="break-words font-display text-[32px] font-normal leading-tight text-foreground md:text-[44px]">
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
        <ListEmptyState />
      )}
    </section>
  );
}
