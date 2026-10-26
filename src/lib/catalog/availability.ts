import { isProductMadeToOrder } from "@/lib/catalog/made-to-order";
import { getProductStockState, type StockableVariant } from "@/lib/catalog/stock";

interface AvailabilityCandidate {
  category: { slug: string };
  categories: { category: { slug: string } }[];
  variants: StockableVariant[];
}

/** Misma regla que la tarjeta: "a pedido" nunca figura agotado; el resto, si alguna variante activa tiene stock. */
export function isProductAvailable(product: AvailabilityCandidate): boolean {
  return isProductMadeToOrder(product) || getProductStockState(product.variants) !== "out_of_stock";
}

/** Agotados al final conservando el orden previo (sort estable) dentro de cada grupo. */
export function sortAvailableFirst<T extends AvailabilityCandidate>(products: readonly T[]): T[] {
  return products
    .map((p) => ({ p, available: isProductAvailable(p) }))
    .sort((a, b) => Number(b.available) - Number(a.available))
    .map(({ p }) => p);
}
