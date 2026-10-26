import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  productVariant: { findMany: vi.fn() },
  setting: { findUnique: vi.fn() },
  combo: { create: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { createBundle } from "@/lib/bundle/bundle-service";

const variant = (id: string, price: number, over: Record<string, unknown> = {}, productOver: Record<string, unknown> = {}) => ({
  id,
  active: true,
  stock: 10,
  priceOverride: null,
  product: {
    name: `Producto ${id}`,
    active: true,
    deletedAt: null,
    basePrice: price,
    images: [`img-${id}.jpg`],
    category: { slug: "labios" },
    categories: [],
    ...productOver,
  },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.setting.findUnique.mockResolvedValue({ bundlePackagingFee: 1500 });
  prismaMock.combo.create.mockResolvedValue({ id: "combo-1" });
});

describe("createBundle", () => {
  it("calcula el precio en el server (productos + empaque) y crea un combo inmutable con bundleKind", async () => {
    prismaMock.productVariant.findMany.mockResolvedValue([variant("00000000-0000-4000-8000-000000000001", 5000), variant("00000000-0000-4000-8000-000000000002", 2500)]);
    const id = await createBundle("ramo", [{ variantId: "00000000-0000-4000-8000-000000000001", qty: 2 }, { variantId: "00000000-0000-4000-8000-000000000002", qty: 2 }, { variantId: "00000000-0000-4000-8000-000000000001", qty: 0 + 1 }]);
    expect(id).toBe("combo-1");
    const data = prismaMock.combo.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ bundleKind: "ramo", name: "Ramo de maquillaje" });
    // v1 x3 (15000) + v2 x2 (5000) = 20000 + empaque 1500
    expect(Number(data.comboPrice)).toBe(21500);
    expect(Number(data.packagingFee)).toBe(1500);
    expect(data.items.create).toEqual([{ variantId: "00000000-0000-4000-8000-000000000001", qty: 3 }, { variantId: "00000000-0000-4000-8000-000000000002", qty: 2 }]);
  });

  it("rechaza bajo el mínimo aunque el empaque lo supere, sin crear nada", async () => {
    prismaMock.productVariant.findMany.mockResolvedValue([variant("00000000-0000-4000-8000-000000000001", 14000)]);
    await expect(createBundle("box", [{ variantId: "00000000-0000-4000-8000-000000000001", qty: 1 }])).rejects.toThrow(/mínimo/);
    expect(prismaMock.combo.create).not.toHaveBeenCalled();
  });

  it("rechaza stock insuficiente, variantes inactivas, gift cards y productos a pedido", async () => {
    prismaMock.productVariant.findMany.mockResolvedValue([variant("00000000-0000-4000-8000-000000000001", 20000, { stock: 1 })]);
    await expect(createBundle("ramo", [{ variantId: "00000000-0000-4000-8000-000000000001", qty: 2 }])).rejects.toThrow(/stock/);

    prismaMock.productVariant.findMany.mockResolvedValue([variant("00000000-0000-4000-8000-000000000001", 20000, { active: false })]);
    await expect(createBundle("ramo", [{ variantId: "00000000-0000-4000-8000-000000000001", qty: 1 }])).rejects.toThrow(/disponible/);

    prismaMock.productVariant.findMany.mockResolvedValue([variant("00000000-0000-4000-8000-000000000001", 20000, {}, { category: { slug: "gift-cards" } })]);
    await expect(createBundle("ramo", [{ variantId: "00000000-0000-4000-8000-000000000001", qty: 1 }])).rejects.toThrow(/no se puede incluir/);

    prismaMock.productVariant.findMany.mockResolvedValue([variant("00000000-0000-4000-8000-000000000001", 20000, {}, { category: { slug: "ramos-maquillaje" } })]);
    await expect(createBundle("ramo", [{ variantId: "00000000-0000-4000-8000-000000000001", qty: 1 }])).rejects.toThrow(/no se puede incluir/);

    expect(prismaMock.combo.create).not.toHaveBeenCalled();
  });

  it("ignora el precio que pueda mandar el cliente y rechaza variantes inexistentes o selección inválida", async () => {
    prismaMock.productVariant.findMany.mockResolvedValue([]);
    await expect(createBundle("ramo", [{ variantId: "00000000-0000-4000-8000-0000000000ff", qty: 1 }])).rejects.toThrow(/disponible/);
    await expect(createBundle("ramo", [{ variantId: "nope", qty: 1 }])).rejects.toThrow(/Elegí/);
    await expect(createBundle("ramo", [])).rejects.toThrow(/Elegí/);
    await expect(createBundle("ramo", [{ variantId: "00000000-0000-4000-8000-000000000001", qty: 99 }])).rejects.toThrow(/Elegí/);
  });
});
