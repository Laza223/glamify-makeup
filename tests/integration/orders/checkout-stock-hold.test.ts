import { describe, it, expect, vi } from "vitest";
import { createCheckout, type CreateCheckoutDeps, type CheckoutLineInput } from "@/lib/orders/checkout-service";
import { CustomerFacingError } from "@/lib/orders/customer-error";
import type { VariantStock } from "@/lib/orders/stock-hold";
import type { CartLine } from "@/lib/cart/types";

// Quien llega primero a "Pagar" retiene la unidad 30 minutos: el chequeo de stock corre dentro de la
// misma tx que crea el pedido (con las variantes bloqueadas), descuenta lo retenido por otros pedidos
// pendientes y la preference de MP vence junto con la reserva.

const line = (over: Partial<CartLine> = {}): CartLine => ({
  id: "ci1", kind: "variant", refId: "v1", unitPrice: 3000, qty: 1, weightGr: 100, productId: "p1", categoryId: "c1", isGiftCard: false, ...over,
});
const lip: CheckoutLineInput = { line: line(), productNameSnapshot: "Labial", variantNameSnapshot: "Rojo", skuSnapshot: "LAB-0001", title: "Labial — Rojo" };
const now = new Date("2026-10-16T12:00:00Z");

/**
 * Fake con transacciones numeradas (t1, t2…) que hacen rollback del estado si el callback tira, como
 * Postgres: así se puede probar en qué tx pasa cada cosa y que una cancelación se deshace.
 */
function makeDeps(stock: Record<string, VariantStock>, over: Partial<CreateCheckoutDeps> = {}, previousPending: Array<{ id: string; payments: Array<{ status: string }> }> = []) {
  const calls: string[] = [];
  const state = { oldStatus: "pending_payment" };
  let txCount = 0;
  let current = 0;
  const tx = {
    order: {
      findMany: vi.fn(async () => previousPending),
      updateMany: vi.fn(async ({ where }: { where: { id: string } }) => {
        calls.push(`t${current}:cancel:${where.id}`);
        state.oldStatus = "cancelled";
        return { count: 1 };
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { calls.push(`t${current}:create`); return { id: "ord-1", ...data, payments: [{ id: "pay-1" }] }; }),
    },
    payment: { update: vi.fn(async () => ({})) },
    coupon: { updateMany: vi.fn(async () => ({ count: 1 })) },
  };
  const lockStock = vi.fn(async (t: unknown) => {
    calls.push(t === tx ? `t${current}:lock` : "lock:outside-tx");
    return new Map(Object.entries(stock));
  });
  const deps: CreateCheckoutDeps = {
    db: {
      coupon: { findUnique: vi.fn(async () => null) },
      couponRedemption: { findUnique: vi.fn(async () => null) },
      $transaction: vi.fn(async (fn: (t: unknown) => unknown) => {
        current = ++txCount;
        const snapshot = { ...state };
        try {
          return await fn(tx);
        } catch (e) {
          Object.assign(state, snapshot); // rollback
          throw e;
        }
      }),
    } as unknown as CreateCheckoutDeps["db"],
    nextOrderSeq: vi.fn(async () => 7),
    lockStock,
    createPreference: vi.fn(async () => ({ id: "pref-1", init_point: "https://mp/ip" })),
    quoteShipping: vi.fn(async () => { calls.push("quote"); return { cost: 2500, free: false, zoneId: "z1", source: "zone" as const }; }),
    appUrl: "https://app.test",
    isSandboxToken: false,
    now,
    ...over,
  };
  return { deps, tx, calls, lockStock, state };
}

const input = {
  contactName: "Ana", contactEmail: "ana@example.com", contactPhone: "1122334455",
  shippingMethod: "domicilio" as const,
  address: { cp: "1414", province: "CABA", street: "Calle", number: "1", city: "CABA", dni: "30123456" },
  lines: [lip],
  cartId: "cart-1",
};

describe("createCheckout — reserva de stock", () => {
  it("bloquea y chequea el stock dentro de la tx que crea el pedido, antes de crearlo", async () => {
    const { deps, calls, lockStock } = makeDeps({ v1: { stock: 1, held: 0 } });
    await createCheckout(input, deps);
    // t1 = cancelación de pendientes del carrito (no hay ninguno: no bloquea); t2 = creación.
    expect(calls).toEqual(["quote", "t2:lock", "t2:create"]);
    expect(lockStock).toHaveBeenCalledWith(expect.anything(), ["v1"], { now });
  });

  it("la preference de MP vence a los 30 min y la reserva 5 min después (margen para el webhook)", async () => {
    const { deps, tx } = makeDeps({ v1: { stock: 1, held: 0 } });
    await createCheckout(input, deps);
    expect(tx.order.create.mock.calls[0][0].data).toMatchObject({ reservedUntil: new Date("2026-10-16T12:35:00Z") });
    expect(deps.createPreference).toHaveBeenCalledWith(expect.objectContaining({ expiresAt: new Date("2026-10-16T12:30:00Z") }));
  });

  it("re-click en Pagar: cotiza ANTES de cancelar el pedido anterior y re-chequea el stock en la misma tx de la cancelación", async () => {
    const { deps, calls } = makeDeps({ v1: { stock: 1, held: 0 } }, {}, [{ id: "ord-old", payments: [{ status: "pending" }] }]);
    await createCheckout(input, deps);
    // quote (red) → cancelación + lock en la misma tx (t1) → lock + create en la tx final (t2)
    expect(calls).toEqual(["quote", "t1:cancel:ord-old", "t1:lock", "t2:lock", "t2:create"]);
  });

  it("re-click sin stock: falla en la tx de la cancelación (el rollback deja vigente la reserva anterior)", async () => {
    const { deps, tx, calls, state } = makeDeps({ v1: { stock: 1, held: 1 } }, {}, [{ id: "ord-old", payments: [{ status: "pending" }] }]);
    await expect(createCheckout(input, deps)).rejects.toThrow(/^Justo se agotó/);
    expect(calls).toEqual(["quote", "t1:cancel:ord-old", "t1:lock"]); // falla en la misma tx que canceló
    expect(state.oldStatus).toBe("pending_payment"); // rollback: el pedido anterior sigue reteniendo
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it("si la última unidad la está pagando otra persona: 'Justo se agotó', sin pedido ni preference", async () => {
    const { deps, tx } = makeDeps({ v1: { stock: 1, held: 1 } });
    const err = await createCheckout(input, deps).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CustomerFacingError);
    expect((err as Error).message).toMatch(/^Justo se agotó Labial — Rojo/);
    expect(tx.order.create).not.toHaveBeenCalled();
    expect(deps.createPreference).not.toHaveBeenCalled();
  });

  it("sin stock real: pide actualizar el carrito", async () => {
    const { deps } = makeDeps({ v1: { stock: 0, held: 0 } });
    await expect(createCheckout(input, deps)).rejects.toThrow(/No hay stock suficiente de Labial — Rojo/);
  });

  it("combos: chequea los componentes y nombra el combo", async () => {
    const kit: CheckoutLineInput = {
      line: line({ kind: "combo", refId: "combo-1", qty: 2, components: [{ variantId: "v9", qty: 1 }] }),
      productNameSnapshot: "Kit Labios", variantNameSnapshot: null, skuSnapshot: null, title: "Kit Labios",
    };
    const { deps, lockStock } = makeDeps({ v9: { stock: 2, held: 1 } });
    await expect(createCheckout({ ...input, lines: [kit] }, deps)).rejects.toThrow(/Justo se agotó Kit Labios/);
    expect(lockStock).toHaveBeenCalledWith(expect.anything(), ["v9"], { now });
  });
});

describe("createCheckout — envío sin cotización", () => {
  it("si no se pudo cotizar el envío no crea el pedido ni cancela el anterior (nunca cobra envío $0 por error)", async () => {
    const { deps, tx } = makeDeps(
      { v1: { stock: 1, held: 0 } },
      { quoteShipping: vi.fn(async () => ({ cost: 0, free: false, zoneId: null, source: "none" as const })) },
      [{ id: "ord-old", payments: [{ status: "pending" }] }],
    );
    await expect(createCheckout(input, deps)).rejects.toThrow(/No pudimos calcular el envío/);
    expect(tx.order.updateMany).not.toHaveBeenCalled();
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it("el envío gratis por umbral sigue valiendo $0", async () => {
    const { deps, tx } = makeDeps(
      { v1: { stock: 1, held: 0 } },
      { quoteShipping: vi.fn(async () => ({ cost: 0, free: true, zoneId: null, source: "free" as const })) },
    );
    await createCheckout(input, deps);
    expect(tx.order.create.mock.calls[0][0].data).toMatchObject({ shippingCost: 0, total: 3000 });
  });
});
