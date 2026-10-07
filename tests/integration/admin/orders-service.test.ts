import { describe, it, expect, vi } from "vitest";
import { changeOrderStatus, cancelOrder, type OrdersDeps, type AdminOrder } from "@/lib/admin/orders/service";

const variantOrder = (over: Partial<AdminOrder> = {}): AdminOrder => ({
  id: "ord-1",
  status: "paid",
  couponId: null,
  items: [
    { id: "oi-1", variantId: "v1", comboId: null, qty: 2, combo: null },
  ],
  ...over,
});

function makeDeps(order: AdminOrder | null) {
  const tx = {
    order: { update: vi.fn(async () => ({})), updateMany: vi.fn(async () => ({ count: 1 })) },
    productVariant: { update: vi.fn(async () => ({})) },
      coupon: { updateMany: vi.fn(async () => ({ count: 0 })), count: vi.fn(async () => 0) },
  };
  const deps: OrdersDeps = {
    db: {
      order: { findUnique: vi.fn(async () => order) },
      $transaction: vi.fn(async (fn) => fn(tx as never)),
    } as never,
    now: new Date("2026-06-05T12:00:00Z"),
  };
  return { deps, tx };
}

describe("changeOrderStatus", () => {
  it("aplica una transición válida (paid → preparing)", async () => {
    const { deps, tx } = makeDeps(variantOrder({ status: "paid" }));
    const r = await changeOrderStatus("ord-1", "preparing", deps);
    expect(r.id).toBe("ord-1");
    expect(tx.order.update).toHaveBeenCalledWith({ where: { id: "ord-1" }, data: { status: "preparing" } });
  });

  it("rechaza una transición inválida (delivered → preparing) con error claro", async () => {
    const { deps } = makeDeps(variantOrder({ status: "delivered" }));
    await expect(changeOrderStatus("ord-1", "preparing", deps)).rejects.toThrow(/no se puede pasar/i);
  });

  it("rechaza si el pedido no existe", async () => {
    const { deps } = makeDeps(null);
    await expect(changeOrderStatus("ord-x", "paid", deps)).rejects.toThrow(/no existe/i);
  });
});

describe("cancelOrder", () => {
  it("repone stock de variantes y componentes de combo al cancelar un pedido pagado", async () => {
    const order: AdminOrder = {
      id: "ord-2",
      status: "paid",
      couponId: null,
      items: [
        { id: "oi-1", variantId: "v1", comboId: null, qty: 2, combo: null },
        { id: "oi-2", variantId: null, comboId: "cmb-1", qty: 1, combo: { items: [{ variantId: "v2", qty: 3 }, { variantId: "v1", qty: 1 }] } },
      ],
    };
    const tx = {
      order: { update: vi.fn(async () => ({})), updateMany: vi.fn(async () => ({ count: 1 })) },
      productVariant: { update: vi.fn(async () => ({})) },
      coupon: { updateMany: vi.fn(async () => ({ count: 0 })), count: vi.fn(async () => 0) },
    };
    const deps: OrdersDeps = {
      db: { order: { findUnique: vi.fn(async () => order) }, $transaction: vi.fn(async (fn) => fn(tx as never)) } as never,
    };
    const r = await cancelOrder("ord-2", deps);
    expect(r.id).toBe("ord-2");
    expect(tx.order.update).toHaveBeenCalledWith({ where: { id: "ord-2" }, data: { status: "cancelled" } });
    // v1: 2 (línea) + 1 (combo×1) = 3 ; v2: 3 (combo×1) = 3
    expect(tx.productVariant.update).toHaveBeenCalledWith({ where: { id: "v1" }, data: { stock: { increment: 3 } } });
    expect(tx.productVariant.update).toHaveBeenCalledWith({ where: { id: "v2" }, data: { stock: { increment: 3 } } });
    expect(tx.productVariant.update).toHaveBeenCalledTimes(2);
  });

  it("NO repone stock si el pedido estaba en pending_payment (stock nunca descontado)", async () => {
    const order: AdminOrder = {
      id: "ord-3", status: "pending_payment", couponId: null,
      items: [{ id: "oi-1", variantId: "v1", comboId: null, qty: 2, combo: null }],
    };
    const tx = {
      order: { update: vi.fn(async () => ({})), updateMany: vi.fn(async () => ({ count: 1 })) },
      productVariant: { update: vi.fn(async () => ({})) },
      coupon: { updateMany: vi.fn(async () => ({ count: 0 })), count: vi.fn(async () => 0) },
    };
    const deps: OrdersDeps = {
      db: { order: { findUnique: vi.fn(async () => order) }, $transaction: vi.fn(async (fn) => fn(tx as never)) } as never,
    };
    await cancelOrder("ord-3", deps);
    expect(tx.order.update).toHaveBeenCalledWith({ where: { id: "ord-3" }, data: { status: "cancelled" } });
    expect(tx.productVariant.update).not.toHaveBeenCalled();
  });

  it("rechaza cancelar un pedido ya entregado", async () => {
    const order: AdminOrder = {
      id: "ord-4", status: "delivered", couponId: null,
      items: [{ id: "oi-1", variantId: "v1", comboId: null, qty: 1, combo: null }],
    };
    const deps: OrdersDeps = {
      db: { order: { findUnique: vi.fn(async () => order) }, $transaction: vi.fn(async (fn) => fn({} as never)) } as never,
    };
    await expect(cancelOrder("ord-4", deps)).rejects.toThrow(/no se puede cancelar/i);
  });
});

describe("gift cards en cambios de estado del admin", () => {
  function depsWithCoupons(order: AdminOrder, used = 0) {
    const tx = {
      order: { update: vi.fn(async () => ({})), updateMany: vi.fn(async () => ({ count: 1 })) },
      productVariant: { update: vi.fn(async () => ({})) },
      coupon: { updateMany: vi.fn(async () => ({ count: 2 })), count: vi.fn(async () => used) },
    };
    const deps: OrdersDeps = {
      db: { order: { findUnique: vi.fn(async () => order) }, $transaction: vi.fn(async (fn) => fn(tx as never)) } as never,
    };
    return { deps, tx };
  }
  const voidCall = { where: { sourceOrderId: "ord-1", usedCount: 0, active: true }, data: { active: false } };
  const releaseCall = {
    where: { sourceOrderId: { not: null }, orders: { some: { id: "ord-1" } }, usedCount: { gt: 0 } },
    data: { usedCount: { decrement: 1 } },
  };

  it("reembolsar anula las sin usar y devuelve cuántas ya estaban usadas", async () => {
    const { deps, tx } = depsWithCoupons(variantOrder({ status: "delivered" }), 1);
    const r = await changeOrderStatus("ord-1", "refunded", deps);
    expect(tx.coupon.updateMany).toHaveBeenCalledWith(voidCall);
    expect(tx.coupon.count).toHaveBeenCalledWith({ where: { sourceOrderId: "ord-1", usedCount: { gt: 0 } } });
    expect(r.giftCardsUsed).toBe(1);
    expect(tx.coupon.updateMany).not.toHaveBeenCalledWith(releaseCall); // pedido pagado: no hay reserva que liberar
  });

  it("cancelar un pedido pagado anula las sin usar", async () => {
    const { deps, tx } = depsWithCoupons(variantOrder({ status: "paid" }));
    const r = await cancelOrder("ord-1", deps);
    expect(tx.coupon.updateMany).toHaveBeenCalledWith(voidCall);
    expect(r.giftCardsUsed).toBe(0);
  });

  it("cancelar un pending_payment anula y además libera la gift card reservada", async () => {
    const { deps, tx } = depsWithCoupons(variantOrder({ status: "pending_payment" }));
    await cancelOrder("ord-1", deps);
    expect(tx.coupon.updateMany).toHaveBeenCalledWith(releaseCall);
  });

  it("changeOrderStatus pending_payment → cancelled también libera la reserva", async () => {
    const { deps, tx } = depsWithCoupons(variantOrder({ status: "pending_payment" }));
    await changeOrderStatus("ord-1", "cancelled", deps);
    expect(tx.coupon.updateMany).toHaveBeenCalledWith(releaseCall);
  });

  it("pending_payment → paid a mano se bloquea si el pedido tiene una gift card (los códigos los emite el webhook)", async () => {
    const giftOrder = variantOrder({
      status: "pending_payment",
      items: [{ id: "oi-1", variantId: "gv1", comboId: null, qty: 1, isGiftCard: true, combo: null }],
    });
    const { deps, tx } = depsWithCoupons(giftOrder);
    await expect(changeOrderStatus("ord-1", "paid", deps)).rejects.toThrow(
      "Los pedidos con gift card se confirman solo con el pago de Mercado Pago (así se emiten los códigos).",
    );
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it("un pedido común sí se puede marcar pagado a mano; uno con gift card sí se puede cancelar", async () => {
    const plain = depsWithCoupons(variantOrder({ status: "pending_payment" }));
    await changeOrderStatus("ord-1", "paid", plain.deps);
    expect(plain.tx.order.update).toHaveBeenCalledWith({ where: { id: "ord-1" }, data: { status: "paid" } });

    const gift = depsWithCoupons(
      variantOrder({ status: "pending_payment", items: [{ id: "oi-1", variantId: "gv1", comboId: null, qty: 1, isGiftCard: true, combo: null }] }),
    );
    await expect(changeOrderStatus("ord-1", "cancelled", gift.deps)).resolves.toMatchObject({ id: "ord-1" });
  });

  it("al cancelar un pending_payment también deja inactiva la gift card reservada cuyo pedido de origen ya se cerró", async () => {
    const { deps, tx } = depsWithCoupons(variantOrder({ status: "pending_payment" }));
    await cancelOrder("ord-1", deps);
    expect(tx.coupon.updateMany).toHaveBeenCalledWith({
      where: { sourceOrderId: { not: null }, orders: { some: { id: "ord-1" } }, usedCount: 0, active: true, sourceOrder: { status: { in: ["refunded", "cancelled"] } } },
      data: { active: false },
    });
  });

  it("transiciones que no son refund/cancel no tocan cupones", async () => {
    const { deps, tx } = depsWithCoupons(variantOrder({ status: "paid" }));
    await changeOrderStatus("ord-1", "preparing", deps);
    expect(tx.coupon.updateMany).not.toHaveBeenCalled();
    expect(tx.coupon.count).not.toHaveBeenCalled();
  });
});
