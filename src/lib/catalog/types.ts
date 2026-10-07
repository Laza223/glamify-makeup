import type { Prisma } from "@prisma/client";

/** Valor monetario aceptado por las utilidades de catálogo (Decimal/string/number). */
export type Money = Prisma.Decimal | string | number;

/**
 * Fila cruda de Prisma tal como la devuelve `PRODUCT_INCLUDE`. SOLO server: trae `cost` y Decimals.
 * Nunca pasarla a un Client Component — mapearla con `toCatalogProduct` (`@/lib/catalog/dto`).
 */
export type CatalogProductRow = Prisma.ProductGetPayload<{
  include: { variants: true; category: true; categories: { select: { category: { select: { slug: true } } } } };
}>;

/** Variante serializable (plain object, montos en number) para componentes cliente. */
export interface CatalogVariant {
  id: string;
  name: string;
  sku: string;
  swatchHex: string | null;
  priceOverride: number | null;
  stock: number;
  lowStockThreshold: number;
  image: string | null;
  active: boolean;
}

/** Producto serializable para cards/listados: solo lo que usa la UI, sin `cost`. */
export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  images: string[];
  basePrice: number;
  compareAtPrice: number | null;
  isFeatured: boolean;
  category: { id: string; slug: string; name: string };
  /** Categorías adicionales (slugs) — las usa `isProductMadeToOrder`. */
  categories: { category: { slug: string } }[];
  variants: CatalogVariant[];
}

/** Producto para la PDP: card + textos de ficha/SEO. */
export interface CatalogProductDetail extends CatalogProduct {
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

/** Item de listado (card): producto con su categoría y variantes. */
export type CatalogListItem = CatalogProduct;
