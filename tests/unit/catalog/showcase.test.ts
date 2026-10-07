import { describe, it, expect } from "vitest";
import { lowestSellablePrice } from "@/lib/catalog/showcase";
import type { CatalogProduct, CatalogVariant } from "@/lib/catalog/types";

function variant(o: Partial<CatalogVariant> = {}): CatalogVariant {
  return { id: "v", name: "Único", sku: "X-0001", swatchHex: null, priceOverride: null, stock: 5, lowStockThreshold: 2, image: null, active: true, ...o };
}
function product(o: Partial<CatalogProduct> & { slug?: string; cat?: string } = {}): CatalogProduct {
  const cat = o.cat ?? "labios";
  return {
    id: "p", slug: "p", name: "P", categoryId: "c", images: [], basePrice: 3000, compareAtPrice: null, isFeatured: false,
    category: { id: "c", slug: cat, name: cat }, categories: [], variants: [variant()], ...o,
  };
}

describe("lowestSellablePrice", () => {
  it("devuelve el precio más bajo entre productos con stock", () => {
    expect(lowestSellablePrice([product({ basePrice: 3125 }), product({ basePrice: 1500 })])).toBe(1500);
  });

  it("ignora productos sin stock, a pedido y gift cards", () => {
    const list = [
      product({ basePrice: 900, variants: [variant({ stock: 0 })] }),
      product({ basePrice: 800, cat: "ramos-maquillaje" }),
      product({ basePrice: 700, cat: "gift-cards" }),
      product({ basePrice: 2000 }),
    ];
    expect(lowestSellablePrice(list)).toBe(2000);
  });

  it("usa el precio de la variante con stock (priceOverride) si es más bajo", () => {
    const p = product({ basePrice: 3000, variants: [variant({ priceOverride: 2500 }), variant({ priceOverride: 1000, stock: 0 })] });
    expect(lowestSellablePrice([p])).toBe(2500);
  });

  it("devuelve null si no hay nada vendible", () => {
    expect(lowestSellablePrice([])).toBeNull();
  });
});
