import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock se hoistea sobre TODO lo demás (incluidas const de módulo) — las variables que la
// factory necesita van dentro de vi.hoisted() para que también se hoisteen y no exploten con
// "Cannot access before initialization".
const { cartItem, productVariant } = vi.hoisted(() => ({
  productVariant: { findUnique: vi.fn() },
  cartItem: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { cartItem, productVariant } }));

import { addItem, updateItem, removeItem } from "@/lib/cart/cart-service";

describe("tope de gift cards por línea", () => {
  const giftVariant = (slug = "gift-cards") => ({
    id: "gv1", active: true, priceOverride: 20000,
    product: { basePrice: 20000, category: { slug }, categories: [] },
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("addItem rechaza pasar de 10 unidades de una gift card", async () => {
    productVariant.findUnique.mockResolvedValue(giftVariant());
    cartItem.findFirst.mockResolvedValue(null);
    await expect(addItem({ cartId: "c1", variantId: "gv1", qty: 11 })).rejects.toThrow("Máximo 10 gift cards por pedido.");
    expect(cartItem.create).not.toHaveBeenCalled();
  });

  it("addItem sobre una línea existente suma y también respeta el tope", async () => {
    productVariant.findUnique.mockResolvedValue(giftVariant());
    cartItem.findFirst.mockResolvedValue({ id: "ci1", qty: 9 });
    await expect(addItem({ cartId: "c1", variantId: "gv1", qty: 2 })).rejects.toThrow("Máximo 10 gift cards por pedido.");
    expect(cartItem.update).not.toHaveBeenCalled();
    await addItem({ cartId: "c1", variantId: "gv1", qty: 1 });
    expect(cartItem.update).toHaveBeenCalledWith({ where: { id: "ci1" }, data: { qty: 10 } });
  });

  it("addItem no limita productos comunes", async () => {
    productVariant.findUnique.mockResolvedValue(giftVariant("labios"));
    cartItem.findFirst.mockResolvedValue(null);
    await addItem({ cartId: "c1", variantId: "gv1", qty: 25 });
    expect(cartItem.create).toHaveBeenCalled();
  });

  it("updateItem rechaza más de 10 si la línea es gift card, y deja pasar si es un producto común", async () => {
    cartItem.findFirst.mockResolvedValue({ id: "ci1", variant: giftVariant() });
    await expect(updateItem("c1", "ci1", 11)).rejects.toThrow("Máximo 10 gift cards por pedido.");
    expect(cartItem.updateMany).not.toHaveBeenCalled();

    cartItem.findFirst.mockResolvedValue({ id: "ci2", variant: giftVariant("labios") });
    cartItem.updateMany.mockResolvedValue({ count: 1 });
    await updateItem("c1", "ci2", 11);
    expect(cartItem.updateMany).toHaveBeenCalledWith({ where: { id: "ci2", cartId: "c1" }, data: { qty: 11 } });
  });

  it("updateItem hasta 10 no consulta nada extra", async () => {
    cartItem.updateMany.mockResolvedValue({ count: 1 });
    await updateItem("c1", "ci1", 10);
    expect(cartItem.findFirst).not.toHaveBeenCalled();
  });
});

describe("updateItem / removeItem — scopeados a cartId (evita IDOR entre carritos)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updateItem escribe con precondición cartId, no solo por itemId", async () => {
    cartItem.updateMany.mockResolvedValue({ count: 1 });
    await updateItem("cart-a", "item-1", 3);
    expect(cartItem.updateMany).toHaveBeenCalledWith({ where: { id: "item-1", cartId: "cart-a" }, data: { qty: 3 } });
    expect(cartItem.update).not.toHaveBeenCalled(); // nunca el update sin scope
  });

  it("updateItem tira error si el item no pertenece a ese carrito (carrito ajeno)", async () => {
    cartItem.updateMany.mockResolvedValue({ count: 0 });
    await expect(updateItem("cart-a", "item-de-otro-carrito", 3)).rejects.toThrow(/no pertenece/i);
  });

  it("removeItem borra con precondición cartId, no solo por itemId", async () => {
    cartItem.deleteMany.mockResolvedValue({ count: 1 });
    await removeItem("cart-a", "item-1");
    expect(cartItem.deleteMany).toHaveBeenCalledWith({ where: { id: "item-1", cartId: "cart-a" } });
    expect(cartItem.delete).not.toHaveBeenCalled(); // nunca el delete sin scope
  });

  it("removeItem tira error si el item no pertenece a ese carrito", async () => {
    cartItem.deleteMany.mockResolvedValue({ count: 0 });
    await expect(removeItem("cart-a", "item-ajeno")).rejects.toThrow(/no pertenece/i);
  });

  it("updateItem con qty<=0 delega a removeItem, scopeado igual", async () => {
    cartItem.deleteMany.mockResolvedValue({ count: 1 });
    await updateItem("cart-a", "item-1", 0);
    expect(cartItem.deleteMany).toHaveBeenCalledWith({ where: { id: "item-1", cartId: "cart-a" } });
  });
});

describe("addItem — productos a pedido (se arman por WhatsApp)", () => {
  const variantOf = (categorySlug: string, extraSlugs: string[] = []) => ({
    id: "v1",
    active: true,
    product: {
      id: "p1",
      basePrice: 1000,
      compareAtPrice: null,
      category: { slug: categorySlug },
      categories: extraSlugs.map((slug) => ({ category: { slug } })),
    },
    priceOverride: null,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza una variante de producto con categoría primaria box", async () => {
    productVariant.findUnique.mockResolvedValue(variantOf("box-maquillaje"));
    await expect(addItem({ cartId: "c1", variantId: "v1", qty: 1 })).rejects.toThrow("Este producto se arma por WhatsApp.");
    expect(cartItem.create).not.toHaveBeenCalled();
    expect(cartItem.update).not.toHaveBeenCalled();
  });

  it("rechaza una variante de producto con categoría adicional ramo", async () => {
    productVariant.findUnique.mockResolvedValue(variantOf("regalos", ["ramos-maquillaje"]));
    await expect(addItem({ cartId: "c1", variantId: "v1", qty: 1 })).rejects.toThrow(/WhatsApp/);
    expect(cartItem.create).not.toHaveBeenCalled();
  });

  it("un producto normal se sigue agregando", async () => {
    productVariant.findUnique.mockResolvedValue(variantOf("labios"));
    cartItem.findFirst.mockResolvedValue(null);
    await addItem({ cartId: "c1", variantId: "v1", qty: 2 });
    expect(cartItem.create).toHaveBeenCalledTimes(1);
  });
});
