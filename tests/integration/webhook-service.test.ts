import { describe, it, expect, vi } from "vitest";
import { processWebhook, type ProcessWebhookDeps } from "@/lib/orders/webhook-service";

interface FakeDbOpts {
  customerId?: string | null;
  couponMaxUses?: number | null;
  couponUsedCountStart?: number;
  couponPerCustomerLimit?: number | null;
  redemptions?: Record<string, number>; // customerId -> redeemedCount ya registrado
}

/** Fake db con estado: 1 pedido pending_payment + variante con stock 5. */
function makeFakeDb(opts: FakeDbOpts = {}) {
  const state = {
    order: {
      id: "ord-1", orderNumber: "GLM-000009", status: "pending_payment", couponId: "co-1", customerId: opts.customerId ?? null, cartId: "cart-1",
      contactName: "Ana", contactEmail: "ana@example.com",
      contactPhone: "1144556677", shippingMethod: "domicilio", shippingAddress: { cp: "1900", province: "Buenos Aires", street: "Calle 50", number: "123", city: "La Plata" }, weightGr: 100,
      subtotal: 6400, shippingCost: 2500, discountTotal: 640, total: 8260,
      items: [{ variantId: "v1", comboId: null, productNameSnapshot: "Labial", variantNameSnapshot: "Rojo", qty: 2, lineTotal: 6400, combo: null }],
    } as any,
    variants: new Map<string, number>([["v1", 5]]),
    // Fila "pending" creada en el checkout (mpPaymentId null). El webhook debe reusarla, no crear otra.
    payments: [{ id: "pay-pending", orderId: "ord-1", mpPaymentId: null, status: "pending", amount: 8260 }] as any[],
    couponUsed: 0,
    couponUsedCount: opts.couponUsedCountStart ?? 0,
    couponMaxUses: opts.couponMaxUses ?? null,
    couponPerCustomerLimit: opts.couponPerCustomerLimit ?? null,
    redemptions: new Map<string, number>(Object.entries(opts.redemptions ?? {})),
    shipments: [] as any[],
    cartStatus: "active",
  };
  const db: any = {
    order: {
      findFirst: vi.fn(async () => structuredCloneSafe(state.order)),
      update: vi.fn(async ({ data }: any) => { state.order.status = data.status ?? state.order.status; return state.order; }),
      // Guarda atómica: solo actualiza si el estado actual matchea la precondición (como Postgres).
      updateMany: vi.fn(async ({ where, data }: any) => {
        if (state.order.status === where.status) { state.order.status = data.status; return { count: 1 }; }
        return { count: 0 };
      }),
    },
    payment: {
      findFirst: vi.fn(async ({ where }: any) =>
        state.payments.find(
          (p) =>
            p.orderId === where.orderId &&
            (where.status ? p.status === where.status : true) &&
            (where.mpPaymentId?.not !== undefined ? p.mpPaymentId !== null && p.mpPaymentId !== where.mpPaymentId.not : true) &&
            (where.OR ? where.OR.some((c: any) => "mpPaymentId" in c && p.mpPaymentId === c.mpPaymentId) : true),
        ) ?? null,
      ),
      update: vi.fn(async ({ where, data }: any) => {
        const p = state.payments.find((x) => x.id === where.id);
        if (p) Object.assign(p, data);
        return p;
      }),
      create: vi.fn(async ({ data }: any) => {
        const p = { id: `pay-${state.payments.length + 1}`, ...data };
        state.payments.push(p);
        return p;
      }),
    },
    productVariant: {
      // Update atómico con precondición de stock real (stock >= gte) — como Postgres: si no
      // alcanza, no decrementa y devuelve count 0 (señal real de oversold/carrera perdida).
      updateMany: vi.fn(async ({ where, data }: any) => {
        const current = state.variants.get(where.id) ?? 0;
        const minRequired = where.stock?.gte ?? 0;
        if (current < minRequired) return { count: 0 };
        state.variants.set(where.id, current - data.stock.decrement);
        return { count: 1 };
      }),
      // Descuento/reposición sin precondición (puede quedar negativo, como Postgres sin CHECK).
      update: vi.fn(async ({ where, data }: any) => {
        const next = (state.variants.get(where.id) ?? 0) - (data.stock.decrement ?? 0) + (data.stock.increment ?? 0);
        state.variants.set(where.id, next);
        return { stock: next };
      }),
    },
    coupon: {
      findUnique: vi.fn(async () => ({ maxUses: state.couponMaxUses, perCustomerLimit: state.couponPerCustomerLimit })),
      update: vi.fn(async () => { state.couponUsed++; state.couponUsedCount++; return {}; }),
      // Guarda atómica (mismo patrón que stock/order): solo incrementa si usedCount < maxUses leído.
      count: vi.fn(async () => 0),
      updateMany: vi.fn(async ({ where }: any) => {
        if (where.sourceOrderId) return { count: 0 }; // anular/liberar gift cards: este fake no tiene
        if (state.couponUsedCount < where.usedCount.lt) { state.couponUsed++; state.couponUsedCount++; return { count: 1 }; }
        return { count: 0 };
      }),
    },
    couponRedemption: {
      findUnique: vi.fn(async ({ where }: any) => {
        const cid = where.customerId_couponId.customerId;
        return state.redemptions.has(cid) ? { redeemedCount: state.redemptions.get(cid) } : null;
      }),
      updateMany: vi.fn(async ({ where }: any) => {
        const current = state.redemptions.get(where.customerId);
        if (current == null) return { count: 0 };
        if (current < where.redeemedCount.lt) { state.redemptions.set(where.customerId, current + 1); return { count: 1 }; }
        return { count: 0 };
      }),
      create: vi.fn(async ({ data }: any) => { state.redemptions.set(data.customerId, data.redeemedCount); return data; }),
      upsert: vi.fn(async ({ where }: any) => {
        const cid = where.customerId_couponId.customerId;
        state.redemptions.set(cid, (state.redemptions.get(cid) ?? 0) + 1);
        return {};
      }),
    },
    shipment: {
      create: vi.fn(async ({ data }: any) => { state.shipments.push(data); return data; }),
      update: vi.fn(async ({ where, data }: any) => {
        const s = state.shipments.find((x) => x.orderId === where.orderId) ?? { orderId: where.orderId };
        Object.assign(s, data);
        if (!state.shipments.includes(s)) state.shipments.push(s);
        return s;
      }),
    },
    cart: {
      updateMany: vi.fn(async ({ where, data }: any) => {
        if (where.id === state.order.cartId && state.cartStatus === where.status) { state.cartStatus = data.status; return { count: 1 }; }
        return { count: 0 };
      }),
    },
    $transaction: vi.fn(async (fn: any) => fn(db)),
  };
  return { db, state };
}
function structuredCloneSafe<T>(o: T): T { return JSON.parse(JSON.stringify(o)); }

function makeDeps(over: Partial<ProcessWebhookDeps> = {}): ProcessWebhookDeps {
  return {
    db: makeFakeDb().db,
    getPayment: vi.fn(async () => ({ id: "mp-pay-1", status: "approved", external_reference: "ord-1", transaction_amount: 8260 })),
    sendEmail: vi.fn(async () => ({ id: "e1", logged: false })),
    verifySignature: vi.fn(async () => true),
    secret: "s",
    ownerEmail: "owner@test.com",
    now: new Date("2026-06-04T12:00:00Z"),
    ...over,
  };
}

describe("processWebhook — carrito del pedido", () => {
  it("approved que gana la transición → el carrito del pedido pasa a ordered (con guarda status active)", async () => {
    const { db, state } = makeFakeDb();
    await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, makeDeps({ db }));
    expect(db.cart.updateMany).toHaveBeenCalledWith({ where: { id: "cart-1", status: "active" }, data: { status: "ordered" } });
    expect(state.cartStatus).toBe("ordered");
  });

  it("approved repetido (idempotente) → no vuelve a tocar el carrito", async () => {
    const { db } = makeFakeDb();
    const deps = makeDeps({ db });
    await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, deps);
    await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, deps);
    expect(db.cart.updateMany).toHaveBeenCalledTimes(1);
  });

  it("pago rechazado → el carrito sigue activo para reintentar", async () => {
    const { db, state } = makeFakeDb();
    const deps = makeDeps({ db, getPayment: vi.fn(async () => ({ id: "mp-pay-1", status: "rejected", external_reference: "ord-1", transaction_amount: 8260 })) });
    await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, deps);
    expect(db.cart.updateMany).not.toHaveBeenCalled();
    expect(state.cartStatus).toBe("active");
  });

  it("pedido sin carrito vinculado (anterior a cartId) → paga igual sin tocar carritos", async () => {
    const { db, state } = makeFakeDb();
    state.order.cartId = null;
    await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, makeDeps({ db }));
    expect(state.order.status).toBe("paid");
    expect(db.cart.updateMany).not.toHaveBeenCalled();
  });
});

describe("processWebhook", () => {
  it("firma inválida → 401, sin efectos", async () => {
    const deps = makeDeps({ verifySignature: vi.fn(async () => false) });
    const r = await processWebhook({ dataId: "mp-pay-1", xSignature: "bad", xRequestId: "r" }, deps);
    expect(r.status).toBe(401);
    expect(deps.getPayment).not.toHaveBeenCalled();
  });

  it("approved → paga, descuenta stock, incrementa cupón, manda 2 emails", async () => {
    const { db, state } = makeFakeDb();
    const deps = makeDeps({ db });
    const r = await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, deps);
    expect(r.status).toBe(200);
    expect(state.order.status).toBe("paid");
    expect(state.variants.get("v1")).toBe(3); // 5 - 2
    expect(state.couponUsed).toBe(1);
    expect((deps.sendEmail as any).mock.calls.length).toBe(2);
    // Reconciliación: reusó la fila pending, sin huérfano.
    expect(state.payments).toHaveLength(1);
    expect(state.payments[0].status).toBe("approved");
    expect(state.payments[0].mpPaymentId).toBe("mp-pay-1");
  });

  it("approved (domicilio) → crea el Shipment pendiente, SIN precarga en MiCorreo (despacho manual, ADR 0004)", async () => {
    const { db, state } = makeFakeDb();
    const deps = makeDeps({ db });
    await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, deps);
    const sh = state.shipments.find((s) => s.orderId === "ord-1");
    expect(sh).toBeDefined();
    expect(sh?.service).toBeUndefined();
    expect(sh?.micorreoImportedAt).toBeUndefined();
  });

  it("un fallo de Resend al mandar los emails NO voltea el webhook (best-effort): el pedido queda pagado", async () => {
    const { db, state } = makeFakeDb();
    const deps = makeDeps({ db, sendEmail: vi.fn(async () => { throw new Error("Resend caído"); }) });
    const r = await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, deps);
    expect(r.status).toBe(200);
    expect(state.order.status).toBe("paid");
  });

  it("si falla el mail a la clienta, el de la dueña sale igual y se loguea con orderNumber", async () => {
    const { db } = makeFakeDb();
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const sendEmail = vi.fn(async (m: { to: string }) => {
      if (m.to === "ana@example.com") throw new Error("Resend caído");
      return { id: "e1", logged: false };
    });
    const r = await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, makeDeps({ db, sendEmail: sendEmail as any }));
    expect(r.status).toBe(200);
    expect(sendEmail.mock.calls.map((c) => c[0].to)).toContain("owner@test.com");
    expect(err.mock.calls.flat().join(" ")).toContain("GLM-000009");
    err.mockRestore();
  });

  it("sin RESEND_OWNER_EMAIL → console.error claro (no se saltea en silencio) y el webhook sigue en 200", async () => {
    const { db, state } = makeFakeDb();
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, makeDeps({ db, ownerEmail: "" }));
    expect(r.status).toBe(200);
    expect(state.order.status).toBe("paid");
    expect(err.mock.calls.flat().join(" ")).toContain("RESEND_OWNER_EMAIL");
    err.mockRestore();
  });

  it("el mail a la dueña ya no habla de MiCorreo ni dice REVISAR si todo está bien", async () => {
    const { db } = makeFakeDb();
    const deps = makeDeps({ db });
    await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, deps);
    const ownerEmail = (deps.sendEmail as any).mock.calls.find((c: any) => c[0].to === "owner@test.com");
    expect(ownerEmail[0].html).not.toContain("NO se cargó");
    expect(ownerEmail[0].subject).not.toContain("REVISAR");
  });

  it("descuenta las variantes en orden de id (mismo orden que el FOR UPDATE del checkout: sin deadlocks)", async () => {
    const { db, state } = makeFakeDb();
    state.order.items = [
      { variantId: "v9", comboId: null, productNameSnapshot: "B", variantNameSnapshot: null, qty: 1, lineTotal: 1, combo: null },
      { variantId: "v1", comboId: null, productNameSnapshot: "A", variantNameSnapshot: null, qty: 1, lineTotal: 1, combo: null },
    ];
    state.variants.set("v9", 5);
    await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, makeDeps({ db }));
    expect(db.productVariant.update.mock.calls.map((c: any) => c[0].where.id)).toEqual(["v1", "v9"]);
  });
  it("idempotente: el mismo webhook 2× descuenta stock una sola vez", async () => {
    const { db, state } = makeFakeDb();
    const deps = makeDeps({ db });
    await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, deps);
    await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, deps);
    expect(state.variants.get("v1")).toBe(3); // sigue 3, no 1
    expect(state.couponUsed).toBe(1);
    expect(state.payments).toHaveLength(1); // sin huérfano tras 2 webhooks
  });

  it("perdió la carrera concurrente (otro webhook ya transicionó) → sin efectos", async () => {
    const { db, state } = makeFakeDb();
    // Simula que otra invocación concurrente ya pasó el pedido a paid entre el read y el write:
    db.order.updateMany = vi.fn(async () => ({ count: 0 }));
    const deps = makeDeps({ db });
    const r = await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, deps);
    expect(r.status).toBe(200);
    expect(state.variants.get("v1")).toBe(5); // no descontó (la otra invocación lo hizo)
    expect(state.couponUsed).toBe(0);
    expect((deps.sendEmail as any).mock.calls.length).toBe(0);
  });

  it("reembolso que pierde la carrera contra un cambio de estado del admin → se avisa en el log (MP no reintenta)", async () => {
    const { db, state } = makeFakeDb();
    state.order.status = "paid";
    db.order.updateMany = vi.fn(async () => ({ count: 0 }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const deps = makeDeps({ db, getPayment: vi.fn(async () => ({ id: "mp-pay-1", status: "refunded", external_reference: "ord-1" })) });
    const r = await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, deps);
    expect(r.status).toBe(200);
    expect(state.variants.get("v1")).toBe(5); // sin reposición: el pedido no se movió
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("ord-1"));
    warn.mockRestore();
  });

  describe("intento de pago viejo vs pedido ya pagado", () => {
    const paidWithApprovedA = (state: any) => {
      state.order.status = "paid";
      state.payments = [
        { id: "pay-a", orderId: "ord-1", mpPaymentId: "mp-A", status: "approved", amount: 8260 },
        { id: "pay-b", orderId: "ord-1", mpPaymentId: null, status: "pending", amount: 8260 },
      ];
    };
    const hook = (db: any, id: string, status: string) =>
      processWebhook({ dataId: id, xSignature: "ok", xRequestId: "r" }, makeDeps({ db, getPayment: vi.fn(async () => ({ id, status, external_reference: "ord-1" })) }));

    it("paid con A approved + webhook de B cancelled → pedido sigue paid, Payment B cancelled", async () => {
      const { db, state } = makeFakeDb();
      paidWithApprovedA(state);
      const r = await hook(db, "mp-B", "cancelled");
      expect(r.status).toBe(200);
      expect(state.order.status).toBe("paid");
      expect(state.payments[0].status).toBe("approved");
      expect(state.payments[1].mpPaymentId).toBe("mp-B");
      expect(state.payments[1].status).toBe("cancelled");
    });

    it("paid con A approved + webhook de A refunded (reembolso real) → pedido refunded", async () => {
      const { db, state } = makeFakeDb();
      paidWithApprovedA(state);
      await hook(db, "mp-A", "refunded");
      expect(state.order.status).toBe("refunded");
      expect(state.payments[0].status).toBe("refunded");
    });

    it("pending_payment sin otro approved + webhook cancelled → cancelled", async () => {
      const { db, state } = makeFakeDb();
      await hook(db, "mp-B", "cancelled");
      expect(state.order.status).toBe("cancelled");
    });
  });

  it("rejected → no cambia el pedido (reintento), sin descuento", async () => {
    const { db, state } = makeFakeDb();
    const deps = makeDeps({ db, getPayment: vi.fn(async () => ({ id: "mp-pay-1", status: "rejected", external_reference: "ord-1" })) });
    const r = await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, deps);
    expect(r.status).toBe(200);
    expect(state.order.status).toBe("pending_payment");
    expect(state.variants.get("v1")).toBe(5);
  });

  it("pedido ya 'paid' (lectura stale de 'pending_payment') → webhook 'cancelled' tardío NO lo pisa", async () => {
    const { db, state } = makeFakeDb();
    state.order.status = "paid"; // el pedido YA está pagado en la "DB" real (otro webhook ganó antes)
    // Este webhook leyó un snapshot desactualizado (findFirst antes de que el otro commiteara).
    db.order.findFirst = vi.fn(async () => ({ ...structuredCloneSafe(state.order), status: "pending_payment" }));
    const deps = makeDeps({ db, getPayment: vi.fn(async () => ({ id: "mp-pay-1", status: "cancelled", external_reference: "ord-1" })) });
    const r = await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, deps);
    expect(r.status).toBe(200);
    expect(state.order.status).toBe("paid"); // no lo pisó con "cancelled"
  });

  it("stock insuficiente al momento de decrementar (perdió la carrera contra otro pedido) → no sobrevende, marca oversoldLines", async () => {
    const { db, state } = makeFakeDb();
    state.variants.set("v1", 1); // otro pedido ya se llevó el resto justo antes de este decremento
    const deps = makeDeps({ db }); // este pedido pide qty:2 (ver items del fake db)
    const r = await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, deps);
    expect(r.status).toBe(200);
    // Se descuenta completo aunque quede negativo: el negativo registra lo adeudado y la reposición es simétrica.
    expect(state.variants.get("v1")).toBe(-1);
    expect(state.order.status).toBe("paid"); // el pago se acepta igual, se avisa por email
    const ownerEmail = (deps.sendEmail as any).mock.calls.find((c: any) => c[0].to === "owner@test.com");
    expect(ownerEmail[0].html).toContain("Labial");
  });

  describe("reposición de stock por reembolso/cancelación de MP", () => {
    const hook = (status: string) => makeDeps({ getPayment: vi.fn(async () => ({ id: "mp-pay-1", status, external_reference: "ord-1" })) });
    const run = async (db: any, status: string) => {
      const deps = hook(status);
      deps.db = db;
      return processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, deps);
    };

    it("pedido paid → refunded por MP repone lo descontado", async () => {
      const { db, state } = makeFakeDb();
      state.order.status = "paid";
      state.variants.set("v1", 3); // ya descontó 2 de 5
      await run(db, "refunded");
      expect(state.order.status).toBe("refunded");
      expect(state.variants.get("v1")).toBe(5);
    });

    it("pedido preparing → cancelled (contracargo) repone el stock", async () => {
      const { db, state } = makeFakeDb();
      state.order.status = "preparing";
      state.variants.set("v1", 3);
      await run(db, "cancelled");
      expect(state.order.status).toBe("cancelled");
      expect(state.variants.get("v1")).toBe(5);
    });

    it("pedido shipped → refunded NO repone (decisión del dueño: lo suma ella al volver el producto)", async () => {
      const { db, state } = makeFakeDb();
      state.order.status = "shipped";
      state.variants.set("v1", 3);
      await run(db, "refunded");
      expect(state.order.status).toBe("refunded");
      expect(state.variants.get("v1")).toBe(3);
    });

    it("pedido pending_payment → cancelled no repone (nunca descontó)", async () => {
      const { db, state } = makeFakeDb();
      await run(db, "cancelled");
      expect(state.order.status).toBe("cancelled");
      expect(state.variants.get("v1")).toBe(5);
    });

    it("simetría: oversell (stock 1, pide 2) y luego reembolso deja el stock como estaba antes", async () => {
      const { db, state } = makeFakeDb();
      state.variants.set("v1", 1);
      await run(db, "approved");
      expect(state.variants.get("v1")).toBe(-1);
      await run(db, "refunded");
      expect(state.order.status).toBe("refunded");
      expect(state.variants.get("v1")).toBe(1); // no repone de más
    });

    it("combo: descuenta y repone cada componente; una línea sin variante ni combo no toca stock", async () => {
      const { db, state } = makeFakeDb();
      state.variants.set("v2", 10);
      state.order.items = [
        { id: "oi-c", variantId: null, comboId: "cmb-1", productNameSnapshot: "Combo", variantNameSnapshot: null, qty: 2, lineTotal: 100, isGiftCard: false, combo: { items: [{ variantId: "v1", qty: 1 }, { variantId: "v2", qty: 3 }] } },
        { id: "oi-x", variantId: null, comboId: null, productNameSnapshot: "Variante borrada", variantNameSnapshot: null, qty: 1, lineTotal: 0, isGiftCard: false, combo: null },
      ];
      await run(db, "approved");
      expect(state.variants.get("v1")).toBe(3);
      expect(state.variants.get("v2")).toBe(4);
      expect([...state.variants.keys()]).not.toContain("");
      await run(db, "refunded");
      expect(state.variants.get("v1")).toBe(5);
      expect(state.variants.get("v2")).toBe(10);
    });
  });

  it("cupón con maxUses global ya alcanzado (perdió la carrera) → no incrementa más allá del límite", async () => {
    const { db, state } = makeFakeDb({ couponMaxUses: 5, couponUsedCountStart: 5 }); // ya en el límite
    const deps = makeDeps({ db });
    const r = await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, deps);
    expect(r.status).toBe(200);
    expect(state.order.status).toBe("paid"); // el pago se acepta igual
    expect(state.couponUsedCount).toBe(5); // NO se incrementó más allá del límite
  });

  it("cupón con perCustomerLimit ya alcanzado para esta clienta → no incrementa más para ella", async () => {
    const { db, state } = makeFakeDb({
      customerId: "cust-1", couponPerCustomerLimit: 1, redemptions: { "cust-1": 1 }, // ya usó su único uso
    });
    const deps = makeDeps({ db });
    const r = await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, deps);
    expect(r.status).toBe(200);
    expect(state.order.status).toBe("paid");
    expect(state.redemptions.get("cust-1")).toBe(1); // sigue en 1, no pasó a 2
  });

  it("clienta usa el cupón por primera vez dentro del límite → se registra la redemption", async () => {
    const { db, state } = makeFakeDb({ customerId: "cust-2", couponPerCustomerLimit: 1 });
    const deps = makeDeps({ db });
    const r = await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, deps);
    expect(r.status).toBe(200);
    expect(state.redemptions.get("cust-2")).toBe(1);
  });

  it("webhook 'in_process' reordenado tras un 'approved' ya guardado → NO retrocede Payment.status", async () => {
    const { db, state } = makeFakeDb();
    // El pago ya quedó "approved" en una fila reconciliada (mpPaymentId ya asignado).
    state.payments = [{ id: "pay-1", orderId: "ord-1", mpPaymentId: "mp-pay-1", status: "approved", amount: 8260 }];
    const deps = makeDeps({ db, getPayment: vi.fn(async () => ({ id: "mp-pay-1", status: "in_process", external_reference: "ord-1" })) });
    const r = await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, deps);
    expect(r.status).toBe(200);
    expect(state.payments[0].status).toBe("approved"); // no retrocedió a in_process
  });

  it("pedido inexistente → 200 (ack)", async () => {
    const deps = makeDeps({ getPayment: vi.fn(async () => ({ id: "mp-pay-1", status: "approved", external_reference: "no-existe" })), db: { ...makeFakeDb().db, order: { findFirst: vi.fn(async () => null), update: vi.fn() } } as any });
    const r = await processWebhook({ dataId: "mp-pay-1", xSignature: "ok", xRequestId: "r" }, deps);
    expect(r.status).toBe(200);
  });
});
