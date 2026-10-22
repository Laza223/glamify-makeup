import { describe, it, expect, vi } from "vitest";
import { createCheckout, type CreateCheckoutDeps, type CheckoutLineInput } from "@/lib/orders/checkout-service";
import type { CartLine } from "@/lib/cart/types";

const cartLine = (over: Partial<CartLine> = {}): CartLine => ({
  id: "ci1", kind: "variant", refId: "v1", unitPrice: 3200, qty: 2, weightGr: 25, productId: "p1", categoryId: "c1", isGiftCard: false, ...over,
});
const checkoutLine = (over: Partial<CheckoutLineInput> = {}): CheckoutLineInput => ({
  line: cartLine(), productNameSnapshot: "Labial Mate", variantNameSnapshot: "Rojo Pasión", skuSnapshot: "LAB-0001", title: "Labial Mate — Rojo Pasión", ...over,
});

function makeDeps(over: Partial<CreateCheckoutDeps> = {}): { deps: CreateCheckoutDeps; created: any } {
  const created: any = {};
  const tx = {
    order: { create: vi.fn(async ({ data }: any) => { created.order = { id: "ord-1", ...data, payments: [{ id: "pay-1" }] }; return created.order; }) },
    payment: { update: vi.fn(async () => ({})) },
    cart: { update: vi.fn(async () => ({})) },
  };
  const deps: CreateCheckoutDeps = {
    db: {
      coupon: { findUnique: vi.fn(async ({ where }: any) => (where.code === "GLAM10" ? { id: "co-1", code: "GLAM10", type: "percentage", value: 10, scope: "all", scopeId: null, active: true, minSubtotal: null, validFrom: null, validTo: null, maxUses: null, usedCount: 0 } : null)) },
      $transaction: vi.fn(async (fn: any) => fn(tx)),
    } as any,
    nextOrderSeq: vi.fn(async () => 1),
    lockStock: vi.fn(async (_tx: unknown, ids: string[]) => new Map(ids.map((id) => [id, { stock: 99, held: 0 }]))),
    createPreference: vi.fn(async () => ({ id: "pref-1", init_point: "https://mp/ip", sandbox_init_point: "https://mp/sbx" })),
    quoteShipping: vi.fn(async () => ({ cost: 2500, free: false, zoneId: "z-amba", source: "zone" as const })),
    appUrl: "https://app.test",
    isSandboxToken: true,
    now: new Date("2026-06-04T12:00:00Z"),
    ...over,
  };
  (deps as any)._tx = tx;
  return { deps, created };
}

const baseInput = {
  contactName: "Ana", contactEmail: "ana@example.com", contactPhone: "1122334455",
  shippingMethod: "domicilio" as const,
  address: { cp: "1414", province: "CABA", street: "Calle", number: "123", city: "CABA", dni: "30123456" },
  lines: [checkoutLine()],
  couponCode: null as string | null,
};

describe("createCheckout", () => {
  it("crea pedido con total recalculado en server e init_point de MP", async () => {
    const { deps } = makeDeps();
    const r = await createCheckout(baseInput, deps);
    expect(r.orderNumber).toBe("GLM-000001");
    expect(r.initPoint).toBe("https://mp/sbx"); // sandbox preferido
    const tx = (deps as any)._tx;
    const orderData = tx.order.create.mock.calls[0][0].data;
    expect(orderData.subtotal).toBe(6400);   // 3200×2
    expect(orderData.shippingCost).toBe(2500);
    expect(orderData.total).toBe(8900);       // 6400 + 2500
    expect(orderData.status).toBe("pending_payment");
    expect(orderData.items.create).toHaveLength(1);
    expect(orderData.items.create[0]).toMatchObject({ skuSnapshot: "LAB-0001", qty: 2, lineTotal: 6400 });
  });

  it("con token de producción (isSandboxToken:false) devuelve el init_point real, no el sandbox", async () => {
    const { deps } = makeDeps({ isSandboxToken: false });
    const r = await createCheckout(baseInput, deps);
    expect(r.initPoint).toBe("https://mp/ip");
  });

  it("aplica el cupón y descuenta del total", async () => {
    const { deps } = makeDeps();
    const r = await createCheckout({ ...baseInput, couponCode: "GLAM10" }, deps);
    const orderData = (deps as any)._tx.order.create.mock.calls[0][0].data;
    expect(orderData.discountTotal).toBe(640);    // 10% de 6400
    expect(orderData.total).toBe(8260);           // 6400 - 640 + 2500
    expect(orderData.couponId).toBe("co-1");
    expect(r.orderId).toBe("ord-1");
  });

  it("cupón free_shipping → envío 0 en el total", async () => {
    const { deps } = makeDeps({ db: { coupon: { findUnique: vi.fn(async () => ({ id: "co-2", code: "ENVIOGRATIS", type: "free_shipping", value: 0, scope: "all", scopeId: null, active: true, minSubtotal: null, validFrom: null, validTo: null, maxUses: null, usedCount: 0 })) }, $transaction: vi.fn(async (fn: any) => fn((makeDeps().deps as any)._tx)) } as any });
    const tx = { order: { create: vi.fn(async ({ data }: any) => ({ id: "ord-x", ...data, payments: [{ id: "p" }] })) }, payment: { update: vi.fn() }, cart: { update: vi.fn() } };
    (deps.db.$transaction as any) = vi.fn(async (fn: any) => fn(tx));
    await createCheckout({ ...baseInput, couponCode: "ENVIOGRATIS" }, deps);
    const orderData = tx.order.create.mock.calls[0][0].data;
    expect(orderData.total).toBe(6400); // envío gratis: 6400 + 0
  });

  it("rechaza carrito vacío", async () => {
    const { deps } = makeDeps();
    await expect(createCheckout({ ...baseInput, lines: [] }, deps)).rejects.toThrow();
  });

  it("cupón inexistente: corta el checkout con un error claro, no cobra distinto en silencio", async () => {
    const { deps } = makeDeps();
    await expect(createCheckout({ ...baseInput, couponCode: "NOEXISTE" }, deps)).rejects.toThrow(/cupón ya no está disponible/);
    expect((deps as any)._tx.order.create).not.toHaveBeenCalled();
  });

  it("los ítems de la preference MP suman exactamente el total (con envío, sin cupón)", async () => {
    const { deps } = makeDeps();
    await createCheckout(baseInput, deps);
    const items = (deps.createPreference as any).mock.calls[0][0].items as Array<{ unit_price: number; quantity: number; title: string }>;
    const sum = items.reduce((a, it) => a + it.unit_price * it.quantity, 0);
    expect(sum).toBe(8900); // 6400 subtotal + 2500 envío = total
    expect(items.some((it) => it.title === "Envío" && it.unit_price === 2500)).toBe(true);
  });

  it("con cupón de descuento, la preference se consolida en una línea = total", async () => {
    const { deps } = makeDeps();
    await createCheckout({ ...baseInput, couponCode: "GLAM10" }, deps);
    const items = (deps.createPreference as any).mock.calls[0][0].items as Array<{ unit_price: number; quantity: number }>;
    const sum = items.reduce((a, it) => a + it.unit_price * it.quantity, 0);
    expect(sum).toBe(8260); // = total con descuento, lo que MP realmente cobra
    expect(items).toHaveLength(1);
  });
});

describe("createCheckout — stock antes de cobrar", () => {
  it("rechaza sin crear el pedido si una variante no alcanza, nombrando el producto", async () => {
    const { deps } = makeDeps({ lockStock: vi.fn(async () => new Map([["v1", { stock: 1, held: 0 }]])) });
    await expect(createCheckout(baseInput, deps)).rejects.toThrow(/Labial Mate — Rojo Pasión/);
    expect((deps as any)._tx.order.create).not.toHaveBeenCalled();
    expect(deps.createPreference).not.toHaveBeenCalled();
  });

  it("con stock suficiente crea el pedido normalmente", async () => {
    const { deps } = makeDeps({ lockStock: vi.fn(async () => new Map([["v1", { stock: 2, held: 0 }]])) });
    await expect(createCheckout(baseInput, deps)).resolves.toMatchObject({ orderNumber: "GLM-000001" });
  });
});

describe("createCheckout — DNI y dirección", () => {
  const withAddress = (address: Record<string, unknown>) => ({ ...baseInput, address: { cp: "1414", province: "CABA", street: "Calle", number: "123", city: "CABA", ...address } });

  it("el DNI es obligatorio para pedidos con envío físico (domicilio y sucursal)", async () => {
    const { deps } = makeDeps();
    await expect(createCheckout(withAddress({ dni: undefined }), deps)).rejects.toThrow(/DNI/);
    await expect(createCheckout({ ...withAddress({ dni: "12345" }), shippingMethod: "sucursal" }, deps)).rejects.toThrow(/DNI/);
    expect((deps as any)._tx.order.create).not.toHaveBeenCalled();
  });

  it("guarda el DNI normalizado en Order.shippingAddress.dni", async () => {
    const { deps } = makeDeps();
    await createCheckout(withAddress({ dni: "30.123.456" }), deps);
    const data = (deps as any)._tx.order.create.mock.calls[0][0].data;
    expect(data.shippingAddress.dni).toBe("30123456");
  });

  it("sucursal: pide CP, localidad y provincia, no calle ni sucursal elegida", async () => {
    const { deps } = makeDeps();
    const suc = { ...baseInput, shippingMethod: "sucursal" as const, address: { cp: "1414", province: "CABA", city: "CABA", dni: "30123456" } };
    await expect(createCheckout(suc, deps)).resolves.toMatchObject({ orderNumber: "GLM-000001" });
    await expect(createCheckout({ ...suc, address: { ...suc.address, province: "" } }, makeDeps().deps)).rejects.toThrow(/provincia/i);
  });

  it("solo gift cards: no pide DNI ni dirección", async () => {
    const { deps } = makeDeps();
    const gift = checkoutLine({ line: cartLine({ isGiftCard: true, unitPrice: 20000, qty: 1 }) });
    await expect(createCheckout({ ...baseInput, address: { cp: "" }, lines: [gift] }, deps)).resolves.toBeDefined();
    expect((deps as any)._tx.order.create.mock.calls[0][0].data.shippingAddress).toEqual({});
  });

  it("whitelist: solo se guardan las claves de dirección conocidas (nada de lo que mande el cliente)", async () => {
    const { deps } = makeDeps();
    await createCheckout(withAddress({ dni: "30123456", floorApt: "2B", notes: "timbre", agency: "S1", isAdmin: true, pickupBranch: "inyectada" }), deps);
    const saved = (deps as any)._tx.order.create.mock.calls[0][0].data.shippingAddress;
    expect(Object.keys(saved).sort()).toEqual(["city", "cp", "dni", "floorApt", "notes", "number", "province", "street"]);
  });
});
