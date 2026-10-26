import { describe, it, expect } from "vitest";
import { isProductAvailable, sortAvailableFirst } from "@/lib/catalog/availability";

const variant = (stock: number, active = true) => ({ stock, lowStockThreshold: 3, active });
const product = (name: string, stocks: number[], categorySlug = "labios") => ({
  name,
  category: { slug: categorySlug },
  categories: [],
  variants: stocks.map((s) => variant(s)),
});

describe("isProductAvailable", () => {
  it("con alguna variante con stock está disponible", () => {
    expect(isProductAvailable(product("a", [0, 2]))).toBe(true);
  });
  it("sin stock en ninguna variante no está disponible", () => {
    expect(isProductAvailable(product("a", [0, 0]))).toBe(false);
  });
  it("sin variantes activas no está disponible", () => {
    expect(isProductAvailable({ ...product("a", []), variants: [variant(5, false)] })).toBe(false);
  });
  it("un producto a pedido cuenta como disponible aunque no tenga stock", () => {
    expect(isProductAvailable(product("ramo", [0], "ramos-maquillaje"))).toBe(true);
    expect(
      isProductAvailable({ ...product("box", [0]), categories: [{ category: { slug: "box-maquillaje" } }] }),
    ).toBe(true);
  });
});

describe("sortAvailableFirst", () => {
  it("manda los agotados al final y conserva el orden dentro de cada grupo", () => {
    const sorted = sortAvailableFirst([
      product("agotado-1", [0]),
      product("ok-1", [4]),
      product("agotado-2", [0]),
      product("ramo", [0], "ramos-maquillaje"),
      product("ok-2", [1]),
    ]);
    expect(sorted.map((p) => p.name)).toEqual(["ok-1", "ramo", "ok-2", "agotado-1", "agotado-2"]);
  });
  it("no muta el arreglo original", () => {
    const input = [product("agotado", [0]), product("ok", [1])];
    sortAvailableFirst(input);
    expect(input.map((p) => p.name)).toEqual(["agotado", "ok"]);
  });
});
