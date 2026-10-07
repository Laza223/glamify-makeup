import { toNumber } from "@/lib/catalog/pricing";
import type {
  CatalogProduct,
  CatalogProductDetail,
  CatalogProductRow,
  CatalogVariant,
} from "@/lib/catalog/types";

type VariantRow = CatalogProductRow["variants"][number];

/** Variante cruda → plain object (sin Decimal). */
export function toCatalogVariant(v: VariantRow): CatalogVariant {
  return {
    id: v.id,
    name: v.name,
    sku: v.sku,
    swatchHex: v.swatchHex,
    priceOverride: v.priceOverride === null ? null : toNumber(v.priceOverride),
    stock: v.stock,
    lowStockThreshold: v.lowStockThreshold,
    image: v.image,
    active: v.active,
  };
}

/**
 * Fila de Prisma → DTO serializable para Client Components. Lista blanca de campos:
 * `cost` (dato interno de la dueña) nunca sale del server.
 */
export function toCatalogProduct(p: CatalogProductRow): CatalogProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    categoryId: p.categoryId,
    images: p.images,
    basePrice: toNumber(p.basePrice),
    compareAtPrice: p.compareAtPrice === null ? null : toNumber(p.compareAtPrice),
    isFeatured: p.isFeatured,
    category: { id: p.category.id, slug: p.category.slug, name: p.category.name },
    categories: p.categories.map((c) => ({ category: { slug: c.category.slug } })),
    variants: p.variants.map(toCatalogVariant),
  };
}

export function toCatalogProductDetail(p: CatalogProductRow): CatalogProductDetail {
  return {
    ...toCatalogProduct(p),
    description: p.description,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
  };
}
