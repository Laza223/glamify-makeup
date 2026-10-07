import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { toCatalogProduct, toCatalogProductDetail } from "@/lib/catalog/dto";
import type { CatalogProductRow } from "@/lib/catalog/types";

const now = new Date("2026-10-07T00:00:00Z");

const row: CatalogProductRow = {
  id: "p1",
  slug: "labial-mate",
  name: "Labial Mate",
  description: "Desc",
  categoryId: "c1",
  basePrice: new Prisma.Decimal("4500.50"),
  compareAtPrice: new Prisma.Decimal("6000"),
  cost: new Prisma.Decimal("1234.56"),
  weightGr: 30,
  images: ["a.jpg"],
  isFeatured: true,
  heroRank: 1,
  tags: ["order-bump"],
  seoTitle: null,
  seoDescription: "SEO",
  active: true,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  category: {
    id: "c1", slug: "labios", name: "Labios", parentId: null, skuPrefix: "LAB", image: null,
    order: 0, active: true, showInMenu: true, createdAt: now, updatedAt: now,
  },
  categories: [{ category: { slug: "box-maquillaje" } }],
  variants: [
    {
      id: "v1", productId: "p1", name: "Rojo", swatchHex: "#ff0000", sku: "LAB-0001",
      priceOverride: new Prisma.Decimal("4999.99"), stock: 5, lowStockThreshold: 3,
      weightGrOverride: null, image: null, active: true, order: 0,
    },
    {
      id: "v2", productId: "p1", name: "Nude", swatchHex: null, sku: "LAB-0002",
      priceOverride: null, stock: 0, lowStockThreshold: 3,
      weightGrOverride: null, image: "v2.jpg", active: true, order: 1,
    },
  ],
};

/** true si en todo el árbol solo hay primitivos, arrays y objetos planos. */
function isPlain(value: unknown): boolean {
  if (value === null || typeof value !== "object") return true;
  if (Array.isArray(value)) return value.every(isPlain);
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  return Object.values(value).every(isPlain);
}

describe("toCatalogProduct", () => {
  it("nunca expone cost", () => {
    const dto = toCatalogProduct(row);
    expect("cost" in dto).toBe(false);
    expect(JSON.stringify(dto)).not.toContain("1234.56");
    expect(JSON.stringify(toCatalogProductDetail(row))).not.toContain("1234.56");
  });

  it("devuelve plain objects con montos en number (sin Decimal)", () => {
    const dto = toCatalogProduct(row);
    expect(isPlain(dto)).toBe(true);
    expect(dto.basePrice).toBe(4500.5);
    expect(dto.compareAtPrice).toBe(6000);
    expect(dto.variants[0].priceOverride).toBe(4999.99);
    expect(dto.variants[1].priceOverride).toBeNull();
  });

  it("conserva categoría primaria y slugs adicionales (made-to-order)", () => {
    const dto = toCatalogProduct(row);
    expect(dto.category).toEqual({ id: "c1", slug: "labios", name: "Labios" });
    expect(dto.categories).toEqual([{ category: { slug: "box-maquillaje" } }]);
  });

  it("detail agrega textos de ficha/SEO y sigue siendo plano", () => {
    const d = toCatalogProductDetail(row);
    expect(isPlain(d)).toBe(true);
    expect(d).toMatchObject({ description: "Desc", seoTitle: null, seoDescription: "SEO" });
  });
});
