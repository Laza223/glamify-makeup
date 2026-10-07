/** Slug de la categoría cuyos productos son Gift Cards digitales (emiten un cupón al pagarse). */
export const GIFT_CARD_CATEGORY_SLUG = "gift-cards";

/** Un producto es Gift Card si alguna de sus categorías (primaria o adicionales) es la de gift cards. */
export function isGiftCard(categorySlugs: Iterable<string>): boolean {
  for (const slug of categorySlugs) {
    if (slug === GIFT_CARD_CATEGORY_SLUG) return true;
  }
  return false;
}

interface ProductWithCategorySlugs {
  category: { slug: string };
  categories: { category: { slug: string } }[];
}

/** Atajo sobre un producto cargado con las categorías (primaria + adicionales). */
export function isProductGiftCard(product: ProductWithCategorySlugs): boolean {
  return isGiftCard([product.category.slug, ...product.categories.map((c) => c.category.slug)]);
}
