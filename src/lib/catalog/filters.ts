import type { Prisma } from "@prisma/client";

export const PAGE_SIZE = 30; // múltiplo de 2, 3 y 5: la última fila cierra en 2/3/5 columnas

export type SortKey = "relevancia" | "precio_asc" | "precio_desc" | "novedades";
export const SORT_KEYS: SortKey[] = ["relevancia", "precio_asc", "precio_desc", "novedades"];

export interface ProductListParams {
  categorySlug?: string;
  subcategorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  onSale: boolean;
  inStockOnly: boolean;
  sort: SortKey;
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;

function firstStr(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
function toNonNegInt(v: string | undefined): number | undefined {
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

/**
 * Precio de la URL o del formulario de filtros: solo dígitos (entero ≥ 0, finito) o undefined.
 * Único lugar donde se valida: el server, los chips y el sheet lo usan, así un `?min=abc` se ignora igual en todos.
 */
export function parsePriceParam(v: string | null | undefined): number | undefined {
  if (v == null || !/^\d+$/.test(v)) return undefined;
  const n = Number(v);
  return Number.isSafeInteger(n) ? n : undefined;
}

export const FILTER_KEYS = ["min", "max", "oferta", "disponible"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

/** Filtros de la URL que el server realmente aplica (precios válidos, toggles en "1"). */
export function activeFilterKeys(get: (key: FilterKey) => string | null | undefined): FilterKey[] {
  return FILTER_KEYS.filter((k) => (k === "min" || k === "max" ? parsePriceParam(get(k)) !== undefined : get(k) === "1"));
}

/** Valida el par Desde/Hasta del formulario. `error` viene listo para mostrar inline. */
export function validatePriceRange(minRaw: string, maxRaw: string): { min?: number; max?: number; error?: string } {
  const min = parsePriceParam(minRaw.trim());
  const max = parsePriceParam(maxRaw.trim());
  if ((minRaw.trim() !== "" && min === undefined) || (maxRaw.trim() !== "" && max === undefined)) {
    return { error: "Usá solo números enteros, sin puntos ni comas." };
  }
  if (min !== undefined && max !== undefined && min > max) {
    return { error: "El precio mínimo no puede ser mayor que el máximo." };
  }
  return { min, max };
}

export function parseProductListParams(
  raw: RawParams,
  opts?: { categorySlug?: string; subcategorySlug?: string },
): ProductListParams {
  const sortRaw = firstStr(raw.orden) as SortKey | undefined;
  const sort: SortKey = sortRaw && SORT_KEYS.includes(sortRaw) ? sortRaw : "relevancia";
  const pageParsed = toNonNegInt(firstStr(raw.page));
  const page = pageParsed && pageParsed >= 1 ? pageParsed : 1;
  const q = firstStr(raw.q)?.trim();
  return {
    categorySlug: opts?.categorySlug,
    subcategorySlug: opts?.subcategorySlug,
    minPrice: parsePriceParam(firstStr(raw.min)),
    maxPrice: parsePriceParam(firstStr(raw.max)),
    search: q && q.length > 0 ? q : undefined,
    onSale: firstStr(raw.oferta) === "1",
    inStockOnly: firstStr(raw.disponible) === "1",
    sort,
    page,
  };
}

/**
 * WHERE de Prisma para Product. `categoryIds` lo resuelve el caller (slug→id, incl. subcats).
 * Nota oferta: el seed mantiene la invariante compareAtPrice > basePrice, por eso `{ not: null }` alcanza.
 */
export function buildProductWhere(
  params: ProductListParams,
  categoryIds: string[] | null,
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { active: true, deletedAt: null };
  if (categoryIds && categoryIds.length > 0) {
    // Categoría primaria O adicional (tabla de asociación `categories`).
    where.OR = [
      { categoryId: { in: categoryIds } },
      { categories: { some: { categoryId: { in: categoryIds } } } },
    ];
  }
  if (params.search) {
    const searchConditions: Prisma.ProductWhereInput[] = [
      { name: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
      { tags: { has: params.search.toLowerCase() } },
    ];
    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: searchConditions }];
      delete where.OR;
    } else {
      where.OR = searchConditions;
    }
  }
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    where.basePrice = {
      ...(params.minPrice !== undefined ? { gte: params.minPrice } : {}),
      ...(params.maxPrice !== undefined ? { lte: params.maxPrice } : {}),
    };
  }
  if (params.onSale) {
    where.compareAtPrice = { not: null };
  }
  if (params.inStockOnly) {
    where.variants = { some: { active: true, stock: { gt: 0 } } };
  }
  return where;
}

export function buildProductOrderBy(
  params: ProductListParams,
): Prisma.ProductOrderByWithRelationInput[] {
  switch (params.sort) {
    case "precio_asc":
      return [{ basePrice: "asc" }, { name: "asc" }];
    case "precio_desc":
      return [{ basePrice: "desc" }, { name: "asc" }];
    case "novedades":
      return [{ createdAt: "desc" }];
    case "relevancia":
    default:
      return [{ isFeatured: "desc" }, { heroRank: "asc" }, { createdAt: "desc" }];
  }
}

export function buildPagination(params: ProductListParams): { skip: number; take: number } {
  return { skip: (params.page - 1) * PAGE_SIZE, take: PAGE_SIZE };
}

export function totalPagesFor(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

/** Recorta la página pedida a la última válida (`?page=99` con 2 páginas → 2). */
export function clampPage(page: number, total: number): number {
  return Math.min(Math.max(1, page), totalPagesFor(total));
}

/** Recorta un texto largo para mostrarlo en un título (`max` caracteres + "…"). */
export function truncateForDisplay(text: string, max = 40): string {
  const chars = Array.from(text);
  return chars.length > max ? `${chars.slice(0, max).join("").trimEnd()}…` : text;
}
