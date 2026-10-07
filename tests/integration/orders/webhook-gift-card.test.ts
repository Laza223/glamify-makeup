import { describe, it, expect, vi } from "vitest";
import { processWebhook, type ProcessWebhookDeps } from "@/lib/orders/webhook-service";

interface FakeCoupon {
  id: string;
  code: string;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  sourceOrderId: string | null;
  perCustomerLimit?: number | null;
}

const NOW = new Date("2026-10-07T12:00:00Z");
const giftItem = (qty: number, unit = 20000) => ({
  id: `it-g${qty}-${unit}`, variantId: "gv1", comboId: null, productNameSnapshot: "Gift Card Glamify", variantNameSnapshot: `Monto ${unit}`,
  skuSnapshot: "GIF-0001", unitPriceSnapshot: unit, qty, lineTotal: unit * qty, isGiftCard: true, combo: null,
});
const labial = { id: "it-l", variantId: "v1", comboId: null, productNameSnapshot: "Labial", variantNameSnapshot: "Rojo", skuSnapshot: "LAB-1", unitPriceSnapshot: 3000, qty: 1, lineTotal: 3000, isGiftCard: false, combo: null };

function makeFake(opts: {
  order?: Record<string, unknown>;
  coupons?: FakeCoupon[];
  mpStatus?: string;
  /** count que devuelve el updateMany del incremento de cupón común (simula límite ya alcanzado). */
  commonCouponCount?: number;
  /** Estado del pedido que emitió las gift cards "externas" (sourceOrderId distinto del pedido en curso). */
  sourceOrderStatus?: string;
} = {}) {
  const state = {
    order: {
      id: "ord-1", customerId: null, orderNumber: "GLM-000050", status: "pending_payment", couponId: null,
      contactName: "Ana", contactEmail: "ana@example.com", contactPhone: "1144556677",
      shippingMethod: "digital", shippingAddress: {}, weightGr: 0,
      subtotal: 40000, shippingCost: 0, discountTotal: 0, total: 40000,
      items: [giftItem(2)],
      ...opts.order,
    } as any,
    coupons: [...(opts.coupons ?? [])] as any[],
    created: [] as any[],
    stock: new Map<string, number>([["gv1", 100], ["v1", 10]]),
  };
  const matches = (c: FakeCoupon, where: any): boolean => {
    if (where.id !== undefined && c.id !== where.id) return false;
    if (where.sourceOrderId !== undefined) {
      if (typeof where.sourceOrderId === "string" && c.sourceOrderId !== where.sourceOrderId) return false;
      if (where.sourceOrderId?.not === null && c.sourceOrderId === null) return false;
    }
    if (where.active !== undefined && c.active !== where.active) return false;
    if (where.orders?.some && where.orders.some.id !== state.order.id) return false;
    if (where.sourceOrder?.status?.in) {
      const src = c.sourceOrderId === state.order.id ? state.order.status : opts.sourceOrderStatus;
      if (!where.sourceOrder.status.in.includes(src)) return false;
    }
    const u = where.usedCount;
    if (typeof u === "number" && c.usedCount !== u) return false;
    if (u && typeof u === "object") {
      if ("gt" in u && !(c.usedCount > u.gt)) return false;
      if ("lt" in u && !(c.usedCount < u.lt)) return false;
    }
    return true;
  };
  const tx: any = {
    payment: { findFirst: vi.fn(async () => null), update: vi.fn(), create: vi.fn(async () => ({})) },
    order: {
      findFirst: vi.fn(async () => ({ status: state.order.status })),
      updateMany: vi.fn(async ({ where, data }: any) => {
        if (state.order.status === where.status) { state.order.status = data.status; return { count: 1 }; }
        return { count: 0 };
      }),
    },
    productVariant: {
      updateMany: vi.fn(async ({ where, data }: any) => {
        const cur = state.stock.get(where.id) ?? 0;
        if (cur < (where.stock?.gte ?? 0)) return { count: 0 };
        state.stock.set(where.id, cur - data.stock.decrement);
        return { count: 1 };
      }),
    },
    shipment: { create: vi.fn(async () => ({})) },
    coupon: {
      createMany: vi.fn(async ({ data }: any) => {
        for (const row of data) {
          state.coupons.push({ id: `gc-${state.coupons.length + 1}`, usedCount: 0, ...row });
          state.created.push(row);
        }
        return { count: data.length };
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        const c = state.coupons.find((x) => x.id === where.id);
        return c ? { code: c.code, maxUses: c.maxUses, perCustomerLimit: c.perCustomerLimit ?? null, sourceOrderId: c.sourceOrderId } : null;
      }),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async ({ where, data }: any) => {
        // Incremento de cupón común (webhook): resultado forzable para simular el límite ya alcanzado.
        if (where.usedCount?.lt !== undefined && opts.commonCouponCount !== undefined && where.id !== undefined) return { count: opts.commonCouponCount };
        const hit = state.coupons.filter((c: FakeCoupon) => matches(c, where));
        for (const c of hit) {
          if (data.active !== undefined) c.active = data.active;
          if (data.usedCount?.increment) c.usedCount += data.usedCount.increment;
          if (data.usedCount?.decrement) c.usedCount -= data.usedCount.decrement;
        }
        return { count: hit.length };
      }),
      count: vi.fn(async ({ where }: any) => state.coupons.filter((c: FakeCoupon) => matches(c, where)).length),
    },
    couponRedemption: { upsert: vi.fn(async () => ({})), updateMany: vi.fn(async () => ({ count: 1 })), findUnique: vi.fn(async () => null), create: vi.fn() },
  };
  const autoImportShipment = vi.fn(async () => ({ imported: true, detail: "ok", service: "CP" }) as any);
  const sendEmail = vi.fn(async (_input: { to: string; subject: string; html: string; text?: string }) => ({ id: null, logged: true }));
  const deps: ProcessWebhookDeps = {
    db: {
      order: { findFirst: vi.fn(async () => structuredClone(state.order)) },
      shipment: { update: vi.fn(async () => ({})) },
      $transaction: vi.fn(async (fn: (t: unknown) => Promise<unknown>) => fn(tx)),
    } as never,
    getPayment: vi.fn(async () => ({ id: 9001, status: opts.mpStatus ?? "approved", external_reference: "ord-1", transaction_amount: state.order.total })) as never,
    sendEmail,
    verifySignature: vi.fn(async () => true),
    secret: "s",
    ownerEmail: "duena@glamify.test",
    autoImportShipment,
    getWhatsappUrl: vi.fn(async () => null),
    now: NOW,
  };
  return { deps, tx, state, autoImportShipment, sendEmail };
}
const run = (deps: ProcessWebhookDeps) => processWebhook({ dataId: "9001", xSignature: null, xRequestId: null }, deps);
const mails = (sendEmail: ReturnType<typeof makeFake>["sendEmail"]) => sendEmail.mock.calls.map((c) => c[0]);

describe("processWebhook — gift cards (pedido digital)", () => {
  it("sin shipment ni auto-import; el pedido queda delivered; emite un cupón por unidad", async () => {
    const { deps, tx, state, autoImportShipment } = makeFake({ order: { items: [giftItem(2), giftItem(1, 10000)] } });
    const r = await run(deps);
    expect(r.detail).toBe("paid");
    expect(tx.shipment.create).not.toHaveBeenCalled();
    expect(autoImportShipment).not.toHaveBeenCalled();
    expect(state.order.status).toBe("delivered");
    expect(state.created).toHaveLength(3);
    const validTo = new Date("2027-04-07T12:00:00.000Z");
    for (const c of state.created) {
      expect(c).toMatchObject({ type: "fixed", scope: "all", maxUses: 1, active: true, sourceOrderId: "ord-1", validFrom: NOW });
      expect(c.validTo).toEqual(validTo);
      expect(c.code).toMatch(/^GIFT-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    }
    expect(state.created.map((c: any) => c.value).sort()).toEqual([10000, 20000, 20000]);
    expect(new Set(state.created.map((c: any) => c.code)).size).toBe(3);
  });

  it("manda el mail de gift card (con los códigos) a contactEmail y la confirmación sin texto de despacho", async () => {
    const { deps, state, sendEmail } = makeFake();
    await run(deps);
    const sent = mails(sendEmail);
    const gift = sent.find((m) => m.subject === "Tu Gift Card Glamify")!;
    expect(gift.to).toBe("ana@example.com");
    for (const c of state.created) expect(gift.html).toContain(c.code);
    expect(gift.html).toContain("07/04/2027");
    const confirmation = sent.find((m) => m.subject.includes("Gracias por tu compra"))!;
    expect(confirmation.html).toContain("Te mandamos la gift card en otro mail");
    expect(confirmation.html).not.toMatch(/despachemos/);
    const owner = sent.find((m) => m.to === "duena@glamify.test")!;
    expect(owner.html).toContain("Pedido de gift card: no requiere envío");
    expect(owner.subject).not.toMatch(/REVISAR/);
  });

  it("idempotente: un segundo webhook del mismo pago no re-emite ni re-manda mails", async () => {
    const { deps, state, sendEmail } = makeFake();
    await run(deps);
    const issued = state.created.length;
    const mailsBefore = sendEmail.mock.calls.length;
    const r2 = await run(deps);
    expect(r2.detail).not.toBe("paid");
    expect(state.created).toHaveLength(issued);
    expect(sendEmail.mock.calls.length).toBe(mailsBefore);
    expect(state.order.status).toBe("delivered");
  });

  it("un fallo del mail de gift card no voltea el webhook y los códigos quedan en la DB", async () => {
    const { deps, state, sendEmail } = makeFake();
    sendEmail.mockRejectedValueOnce(new Error("resend down"));
    const r = await run(deps);
    expect(r.status).toBe(200);
    expect(state.created).toHaveLength(2);
  });
});

describe("processWebhook — gift cards (carrito mixto)", () => {
  it("flujo normal con shipment y auto-import, y además emite las gift cards; no pasa a delivered", async () => {
    const { deps, tx, state, autoImportShipment } = makeFake({
      order: { shippingMethod: "domicilio", shippingAddress: { cp: "1414" }, weightGr: 100, subtotal: 23000, shippingCost: 2500, total: 25500, items: [labial, giftItem(1)] },
    });
    await run(deps);
    expect(tx.shipment.create).toHaveBeenCalledTimes(1);
    expect(autoImportShipment).toHaveBeenCalledTimes(1);
    expect(state.order.status).toBe("paid");
    expect(state.created).toHaveLength(1);
    expect(state.created[0].value).toBe(20000);
  });
});

describe("processWebhook — cupón usado en el pedido", () => {
  it("una gift card usada como cupón NO se incrementa de nuevo (ya se reservó en el checkout)", async () => {
    const gc: FakeCoupon = { id: "gc-src", code: "GIFT-AAAA-BBBB", maxUses: 1, usedCount: 1, active: true, sourceOrderId: "ord-old" };
    const { deps, tx } = makeFake({
      coupons: [gc],
      order: { shippingMethod: "domicilio", shippingAddress: { cp: "1414" }, couponId: "gc-src", customerId: "u1", items: [labial] },
    });
    await run(deps);
    expect(gc.usedCount).toBe(1);
    expect(tx.coupon.updateMany).not.toHaveBeenCalled();
    expect(tx.couponRedemption.upsert).not.toHaveBeenCalled();
  });

  it("cupón común que ya superó su límite: NO revierte el pago y avisa a la dueña", async () => {
    const common: FakeCoupon = { id: "c-1", code: "GLAM10", maxUses: 5, usedCount: 5, active: true, sourceOrderId: null };
    const { deps, state, sendEmail } = makeFake({
      coupons: [common], commonCouponCount: 0,
      order: { shippingMethod: "domicilio", shippingAddress: { cp: "1414" }, couponId: "c-1", items: [labial] },
    });
    const r = await run(deps);
    expect(r.detail).toBe("paid");
    expect(state.order.status).toBe("paid");
    const owner = mails(sendEmail).find((m) => m.to === "duena@glamify.test")!;
    expect(owner.html).toContain("GLAM10");
    expect(owner.html).toContain("superó su límite de usos");
    expect(owner.subject).toMatch(/REVISAR/);
  });
});

describe("processWebhook — reembolso / cancelación anulan gift cards", () => {
  const issued = (over: Partial<FakeCoupon>): FakeCoupon => ({ id: "gc-x", code: "GIFT-XXXX-XXXX", maxUses: 1, usedCount: 0, active: true, sourceOrderId: "ord-1", ...over });

  it("refunded: anula las sin usar y deja la ya usada", async () => {
    const unused = issued({ id: "gc-1", code: "GIFT-AAAA-AAAA" });
    const used = issued({ id: "gc-2", code: "GIFT-BBBB-BBBB", usedCount: 1 });
    const { deps, state } = makeFake({ mpStatus: "refunded", coupons: [unused, used], order: { status: "delivered" } });
    const r = await run(deps);
    expect(r.detail).toBe("refunded");
    expect(state.order.status).toBe("refunded");
    expect(unused.active).toBe(false);
    expect(used.active).toBe(true);
  });

  it("cancelled de un pedido ya pagado también las anula", async () => {
    const unused = issued({ id: "gc-1" });
    const { deps } = makeFake({ mpStatus: "cancelled", coupons: [unused], order: { status: "paid" } });
    await run(deps);
    expect(unused.active).toBe(false);
  });

  it("cancelled de un pedido pending_payment libera la gift card que reservó", async () => {
    const reserved = issued({ id: "gc-src", sourceOrderId: "ord-old", usedCount: 1 });
    const { deps, state } = makeFake({
      mpStatus: "cancelled", coupons: [reserved],
      order: { status: "pending_payment", shippingMethod: "domicilio", couponId: "gc-src", items: [labial] },
    });
    await run(deps);
    expect(state.order.status).toBe("cancelled");
    expect(reserved.usedCount).toBe(0);
    expect(reserved.active).toBe(true);
  });
});

describe("processWebhook — avisos a la dueña", () => {
  const issued = (over: Partial<FakeCoupon>): FakeCoupon => ({ id: "gc-x", code: "GIFT-XXXX-XXXX", maxUses: 1, usedCount: 0, active: true, sourceOrderId: "ord-1", ...over });
  const ownerMails = (sendEmail: ReturnType<typeof makeFake>["sendEmail"]) => mails(sendEmail).filter((m) => m.to === "duena@glamify.test");

  it("reembolso con gift cards ya usadas: console.warn y mail 'Reembolso de gift card ya usada'", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { deps, sendEmail } = makeFake({
      mpStatus: "refunded", order: { status: "delivered" },
      coupons: [issued({ id: "gc-1", code: "GIFT-AAAA-AAAA" }), issued({ id: "gc-2", code: "GIFT-BBBB-BBBB", usedCount: 1 })],
    });
    await run(deps);
    const owner = ownerMails(sendEmail);
    expect(owner).toHaveLength(1);
    expect(owner[0].subject).toBe("Reembolso de gift card ya usada — GLM-000050");
    expect(owner[0].html).toContain("1 gift card(s) ya se habían usado");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("GLM-000050"));
    warn.mockRestore();
  });

  it("reembolso sin gift cards usadas: no avisa", async () => {
    const { deps, sendEmail } = makeFake({ mpStatus: "refunded", order: { status: "delivered" }, coupons: [issued({ id: "gc-1" })] });
    await run(deps);
    expect(ownerMails(sendEmail)).toHaveLength(0);
  });

  it("si el mail a la dueña falla, el webhook igual responde 200", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps, sendEmail } = makeFake({ mpStatus: "refunded", order: { status: "delivered" }, coupons: [issued({ usedCount: 1 })] });
    sendEmail.mockRejectedValue(new Error("resend down"));
    const r = await run(deps);
    expect(r.status).toBe(200);
    warn.mockRestore();
    err.mockRestore();
  });

  it("approved sobre un pedido cancelado: console.error y mail 'Pago aprobado en pedido cancelado' (cualquier pedido, no solo gift cards)", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps, state, sendEmail } = makeFake({ order: { status: "cancelled", shippingMethod: "domicilio", items: [labial] } });
    const r = await run(deps);
    expect(r.detail).toBe("sin cambio");
    expect(state.order.status).toBe("cancelled"); // no se reactiva solo
    expect(state.created).toHaveLength(0);
    const owner = ownerMails(sendEmail);
    expect(owner).toHaveLength(1);
    expect(owner[0].subject).toBe("Pago aprobado en pedido cancelado — GLM-000050");
    expect(owner[0].html).toContain("revisá y reembolsá o reactivá a mano");
    expect(err).toHaveBeenCalledWith(expect.stringContaining("GLM-000050"));
    err.mockRestore();
  });

  it("approved sobre un pedido reembolsado también avisa", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps, sendEmail } = makeFake({ order: { status: "refunded" } });
    await run(deps);
    expect(ownerMails(sendEmail)[0].subject).toBe("Pago aprobado en pedido reembolsado — GLM-000050");
    err.mockRestore();
  });

  it("approved repetido (mismo pago ya registrado como approved) no vuelve a avisar", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps, tx, sendEmail } = makeFake({ order: { status: "cancelled" } });
    tx.payment.findFirst.mockResolvedValue({ id: "pay-1", status: "approved", mpPaymentId: "9001" });
    await run(deps);
    expect(ownerMails(sendEmail)).toHaveLength(0);
    err.mockRestore();
  });

  it("webhook normal ya pagado (idempotente) no dispara el aviso", async () => {
    const { deps, sendEmail } = makeFake({ order: { status: "paid", shippingMethod: "domicilio", items: [labial] } });
    await run(deps);
    expect(ownerMails(sendEmail)).toHaveLength(0);
  });

  it("perdió la carrera porque otro webhook ya lo pagó: no es 'pedido cancelado', no avisa", async () => {
    const { deps, tx, state, sendEmail } = makeFake({ order: { items: [labial], shippingMethod: "domicilio" } });
    tx.order.updateMany.mockImplementationOnce(async () => { state.order.status = "paid"; return { count: 0 }; });
    await run(deps);
    expect(ownerMails(sendEmail)).toHaveLength(0);
  });

  it("perdió la carrera porque el pedido se canceló justo en el medio: avisa", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps, tx, state, sendEmail } = makeFake({ order: { items: [labial], shippingMethod: "domicilio" } });
    tx.order.updateMany.mockImplementationOnce(async () => { state.order.status = "cancelled"; return { count: 0 }; });
    await run(deps);
    expect(ownerMails(sendEmail)[0].subject).toBe("Pago aprobado en pedido cancelado — GLM-000050");
    err.mockRestore();
  });
});

describe("issueGiftCards — un solo INSERT", () => {
  it("emite todas las unidades con un único createMany", async () => {
    const { deps, tx, state } = makeFake({ order: { items: [giftItem(3), giftItem(2, 10000)] } });
    await run(deps);
    expect(tx.coupon.createMany).toHaveBeenCalledTimes(1);
    expect(state.created).toHaveLength(5);
  });
});

describe("releaseGiftCardReservation — pedido de origen cerrado", () => {
  it("si el pedido que emitió la gift card está refunded, al liberar la reserva queda inactiva", async () => {
    const reserved: FakeCoupon = { id: "gc-src", code: "GIFT-AAAA-BBBB", maxUses: 1, usedCount: 1, active: true, sourceOrderId: "ord-old" };
    const { deps, state } = makeFake({
      mpStatus: "cancelled", coupons: [reserved], sourceOrderStatus: "refunded",
      order: { status: "pending_payment", shippingMethod: "domicilio", couponId: "gc-src", items: [labial] },
    });
    await run(deps);
    expect(state.order.status).toBe("cancelled");
    expect(reserved.usedCount).toBe(0);
    expect(reserved.active).toBe(false);
  });

  it("si el pedido de origen sigue vigente, queda activa", async () => {
    const reserved: FakeCoupon = { id: "gc-src", code: "GIFT-AAAA-BBBB", maxUses: 1, usedCount: 1, active: true, sourceOrderId: "ord-old" };
    const { deps } = makeFake({
      mpStatus: "cancelled", coupons: [reserved], sourceOrderStatus: "delivered",
      order: { status: "pending_payment", shippingMethod: "domicilio", couponId: "gc-src", items: [labial] },
    });
    await run(deps);
    expect(reserved.usedCount).toBe(0);
    expect(reserved.active).toBe(true);
  });
});
