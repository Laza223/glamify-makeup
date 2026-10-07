import type { Prisma } from "@prisma/client";

/** Valor monetario aceptado por las utilidades de catálogo (Decimal/string/number). */
export type Money = Prisma.Decimal | string | number;

/** Producto con variantes + categoría (+ slugs de categorías adicionales), tal como lo devuelven las queries del catálogo. */
export type CatalogProduct = Prisma.ProductGetPayload<{
  include: { variants: true; category: true; categories: { select: { category: { select: { slug: true } } } } };
}>;

export type CatalogVariant = CatalogProduct["variants"][number];

/** Item de listado (card): producto con su categoría y variantes. */
export type CatalogListItem = CatalogProduct;
