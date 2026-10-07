import { describe, it, expect } from "vitest";
import { isGiftCard, isProductGiftCard, GIFT_CARD_CATEGORY_SLUG } from "@/lib/catalog/gift-card";

describe("isGiftCard", () => {
  it("true si la categoría gift-cards está entre los slugs", () => {
    expect(GIFT_CARD_CATEGORY_SLUG).toBe("gift-cards");
    expect(isGiftCard(["gift-cards"])).toBe(true);
    expect(isGiftCard(["regalos", "gift-cards"])).toBe(true);
  });
  it("false para categorías normales, a pedido o vacías", () => {
    expect(isGiftCard(["labios", "box-maquillaje"])).toBe(false);
    expect(isGiftCard([])).toBe(false);
  });
});

describe("isProductGiftCard", () => {
  it("primaria gift-cards -> true", () => {
    expect(isProductGiftCard({ category: { slug: "gift-cards" }, categories: [] })).toBe(true);
  });
  it("adicional gift-cards -> true", () => {
    expect(isProductGiftCard({ category: { slug: "regalos" }, categories: [{ category: { slug: "gift-cards" } }] })).toBe(true);
  });
  it("sin gift-cards -> false", () => {
    expect(isProductGiftCard({ category: { slug: "labios" }, categories: [{ category: { slug: "regalos" } }] })).toBe(false);
  });
});
