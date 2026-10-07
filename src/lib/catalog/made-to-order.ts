/** Slugs de las categorías cuyos productos se arman por WhatsApp (no se venden por carrito). */
export const MADE_TO_ORDER_CATEGORY_SLUGS = [
  "ramos-maquillaje",
  "box-maquillaje",
] as const;

/** Un producto es "a pedido" si alguna de sus categorías (primaria o adicionales) es de armado por WhatsApp. */
export function isMadeToOrder(categorySlugs: Iterable<string>): boolean {
  for (const slug of categorySlugs) {
    if ((MADE_TO_ORDER_CATEGORY_SLUGS as readonly string[]).includes(slug))
      return true;
  }
  return false;
}

interface ProductWithCategorySlugs {
  category: { slug: string };
  categories: { category: { slug: string } }[];
}

/** Atajo sobre un producto cargado con `PRODUCT_INCLUDE` (primaria + adicionales). */
export function isProductMadeToOrder(
  product: ProductWithCategorySlugs,
): boolean {
  return isMadeToOrder([
    product.category.slug,
    ...product.categories.map((c) => c.category.slug),
  ]);
}
