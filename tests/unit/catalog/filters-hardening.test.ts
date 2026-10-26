import { describe, it, expect } from "vitest";
import {
  PAGE_SIZE,
  activeFilterKeys,
  buildProductWhere,
  clampPage,
  parsePriceParam,
  parseProductListParams,
  totalPagesFor,
  truncateForDisplay,
  validatePriceRange,
} from "@/lib/catalog/filters";

describe("parsePriceParam", () => {
  it("acepta enteros ≥ 0", () => {
    expect(parsePriceParam("0")).toBe(0);
    expect(parsePriceParam("1500")).toBe(1500);
  });
  it.each(["abc", "", " ", "-5", "1.5", "1,5", "1e3", "0x10", "NaN", "Infinity", "99999999999999999999"])(
    "ignora %j",
    (v) => {
      expect(parsePriceParam(v)).toBeUndefined();
    },
  );
  it("ignora null y undefined (searchParams.get sin el param)", () => {
    expect(parsePriceParam(null)).toBeUndefined();
    expect(parsePriceParam(undefined)).toBeUndefined();
  });
  it("?min=abc / ?max=abc no llegan al where de la query", () => {
    const params = parseProductListParams({ min: "abc", max: "-1" });
    expect(params.minPrice).toBeUndefined();
    expect(params.maxPrice).toBeUndefined();
    expect(buildProductWhere(params, null).basePrice).toBeUndefined();
  });
});

describe("activeFilterKeys", () => {
  const from = (q: Record<string, string>) => activeFilterKeys((k) => q[k] ?? null);

  it("lista los filtros válidos", () => {
    expect(from({ min: "100", max: "900", oferta: "1", disponible: "1" })).toEqual(["min", "max", "oferta", "disponible"]);
  });
  it("ignora precios inválidos y toggles que el server no aplica", () => {
    expect(from({ min: "abc", max: "1.5", oferta: "0", disponible: "si" })).toEqual([]);
  });
  it("coincide con lo que parsea el server", () => {
    const q = { min: "abc", max: "900", oferta: "true" };
    const p = parseProductListParams(q);
    expect(from(q)).toEqual(["max"]);
    expect(p).toMatchObject({ minPrice: undefined, maxPrice: 900, onSale: false });
  });
});

describe("validatePriceRange", () => {
  it("rango válido, abierto o vacío", () => {
    expect(validatePriceRange("100", "500")).toEqual({ min: 100, max: 500 });
    expect(validatePriceRange("100", "100")).toEqual({ min: 100, max: 100 });
    expect(validatePriceRange("", "500")).toEqual({ min: undefined, max: 500 });
    expect(validatePriceRange("", "")).toEqual({ min: undefined, max: undefined });
  });
  it("mínimo mayor que máximo → error", () => {
    expect(validatePriceRange("500", "100").error).toMatch(/mínimo/);
  });
  it("valores no enteros o negativos → error", () => {
    expect(validatePriceRange("1.5", "").error).toBeDefined();
    expect(validatePriceRange("", "-3").error).toBeDefined();
    expect(validatePriceRange("abc", "10").error).toBeDefined();
  });
});

describe("clampPage / totalPagesFor", () => {
  it("totalPagesFor: mínimo 1 página, redondea hacia arriba", () => {
    expect(totalPagesFor(0)).toBe(1);
    expect(totalPagesFor(PAGE_SIZE)).toBe(1);
    expect(totalPagesFor(PAGE_SIZE + 1)).toBe(2);
  });
  it("página fuera de rango → última válida", () => {
    expect(clampPage(99, PAGE_SIZE * 2)).toBe(2);
    expect(clampPage(99, PAGE_SIZE * 2 + 1)).toBe(3);
  });
  it("página dentro de rango queda igual", () => {
    expect(clampPage(1, PAGE_SIZE * 2)).toBe(1);
    expect(clampPage(2, PAGE_SIZE * 2)).toBe(2);
  });
  it("sin resultados → página 1; página < 1 → 1", () => {
    expect(clampPage(5, 0)).toBe(1);
    expect(clampPage(0, 50)).toBe(1);
  });
  it("?page gigante o inválido no rompe", () => {
    expect(parseProductListParams({ page: "99999999999999999999999" }).page).toBeGreaterThanOrEqual(1);
    expect(clampPage(parseProductListParams({ page: "abc" }).page, PAGE_SIZE * 3)).toBe(1);
    expect(clampPage(parseProductListParams({ page: "1e21" }).page, PAGE_SIZE * 3)).toBe(3);
  });
});

describe("truncateForDisplay", () => {
  it("deja igual lo que entra en el límite", () => {
    expect(truncateForDisplay("labial rosa")).toBe("labial rosa");
    expect(truncateForDisplay("a".repeat(40))).toBe("a".repeat(40));
  });
  it("corta a 40 caracteres y agrega …", () => {
    expect(truncateForDisplay("a".repeat(41))).toBe(`${"a".repeat(40)}…`);
  });
  it("no deja espacio antes de …", () => {
    expect(truncateForDisplay(`${"a".repeat(39)} bbbb`)).toBe(`${"a".repeat(39)}…`);
  });
  it("no parte un par sustituto en dos", () => {
    const out = truncateForDisplay("𝒜".repeat(50), 10);
    expect(out).toBe(`${"𝒜".repeat(10)}…`);
  });
});
