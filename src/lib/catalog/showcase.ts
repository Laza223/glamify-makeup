import { getEffectivePrice } from "@/lib/catalog/pricing";
import { isProductMadeToOrder } from "@/lib/catalog/made-to-order";
import { isProductGiftCard } from "@/lib/catalog/gift-card";
import type { CatalogProduct } from "@/lib/catalog/types";

/** Se vende por carrito y hoy hay stock: lo que prueba el "desde $X" de la home. */
export function isSellableNow(product: CatalogProduct): boolean {
  return (
    !isProductMadeToOrder(product) &&
    !isProductGiftCard(product) &&
    product.variants.some((v) => v.active && v.stock > 0)
  );
}

/** Precio más bajo que hoy se puede comprar (variantes con stock). Es la prueba de "Barato.": nunca un número inventado. */
export function lowestSellablePrice(products: CatalogProduct[]): number | null {
  let min: number | null = null;
  for (const product of products) {
    if (!isSellableNow(product)) continue;
    for (const v of product.variants) {
      if (!v.active || v.stock <= 0) continue;
      const price = getEffectivePrice(product, v);
      if (min === null || price < min) min = price;
    }
  }
  return min;
}
