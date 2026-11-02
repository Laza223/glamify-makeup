import type { Metadata } from "next";
import type { ProductListParams } from "@/lib/catalog/filters";

/**
 * Canonical + robots de un listado (tienda, categoría, subcategoría), a partir de los mismos params parseados
 * que usa la vista (`parseProductListParams`): cualquier otra clave de la URL (utm, srsltid, igshid…) se ignora.
 * - Búsqueda → `noindex, follow` sin canonical (no mezclar noindex con un canonical a otra URL).
 * - Filtros u orden → canonical a la ruta limpia: mismo catálogo, Google consolida en la página sin filtros.
 * - Paginación sola (N > 1) → indexable, canonical a sí misma.
 * Limitación conocida: `?page=` mayor a la última página no se detecta acá (la vista lo recorta a la última).
 */
export function listingSeo(path: string, params: ProductListParams): Pick<Metadata, "alternates" | "robots"> {
  if (params.search) return { alternates: { canonical: null }, robots: { index: false, follow: true } };
  const filtered =
    params.minPrice !== undefined ||
    params.maxPrice !== undefined ||
    params.onSale ||
    params.inStockOnly ||
    params.sort !== "relevancia";
  if (!filtered && params.page > 1) return { alternates: { canonical: `${path}?page=${params.page}` } };
  return { alternates: { canonical: path } };
}
