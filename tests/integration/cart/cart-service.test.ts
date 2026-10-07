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
