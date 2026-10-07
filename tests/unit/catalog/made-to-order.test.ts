import { describe, it, expect } from "vitest";
import { isMadeToOrder, isProductMadeToOrder, MADE_TO_ORDER_CATEGORY_SLUGS } from "@/lib/catalog/made-to-order";

describe("isMadeToOrder", () => {
  it("true si la categoría box está entre los slugs", () => {
    expect(isMadeToOrder(["box-maquillaje"])).toBe(true);
  });

  it("true si ramo está entre varios slugs", () => {
    expect(isMadeToOrder(["labios", "ramos-maquillaje"])).toBe(true);
  });

  it("false para categorías normales o vacías", () => {
    expect(isMadeToOrder(["labios", "gift-cards", "lip-combos"])).toBe(false);
    expect(isMadeToOrder([])).toBe(false);
  });

  it("expone exactamente los slugs de ramo y box", () => {
    expect([...MADE_TO_ORDER_CATEGORY_SLUGS]).toEqual(["ramos-maquillaje", "box-maquillaje"]);
  });
});

describe("isProductMadeToOrder", () => {
  it("primaria box -> true", () => {
    expect(isProductMadeToOrder({ category: { slug: "box-maquillaje" }, categories: [] })).toBe(true);
  });

  it("adicional ramo -> true", () => {
    expect(
      isProductMadeToOrder({ category: { slug: "regalos" }, categories: [{ category: { slug: "ramos-maquillaje" } }] }),
    ).toBe(true);
  });

  it("otras categorías -> false", () => {
    expect(
      isProductMadeToOrder({ category: { slug: "labios" }, categories: [{ category: { slug: "lip-combos" } }] }),
    ).toBe(false);
  });
});
