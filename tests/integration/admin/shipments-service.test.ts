import { describe, it, expect, vi } from "vitest";
import {
  upsertShipment,
  retryMicorreoImport,
  type ShipmentsDeps,
  type ShipmentInput,
  type RetryImportDeps,
} from "@/lib/admin/shipments/service";

const baseInput: ShipmentInput = { trackingNumber: "CA123456789AR" };

type Existing = { id: string; status: string; trackingNumber?: string | null; service?: string | null } | null;

function makeDeps(over: { orderStatus?: string; existingShipment?: Existing } = {}) {
  const tx = {
    shipment: {
      findUnique: vi.fn(async () => over.existingShipment ?? null),
      create: vi.fn(async ({ data }: { data: unknown }) => ({ id: "shp-1", ...(data as object) })),
      update: vi.fn(async () => ({ id: "shp-1" })),
    },
    order: { updateMany: vi.fn(async () => ({ count: 1 })) },
  };
  const sendEmail = vi.fn(async () => ({ id: "e1", logged: false }));
  const deps: ShipmentsDeps = {
    db: {
      order: {
        findUnique: vi.fn(async () => ({
          id: "ord-1",
          status: over.orderStatus ?? "paid",
          orderNumber: "GLM-000123",
          contactName: "Ana",
          contactEmail: "ana@example.com",
          shippingCost: 2500,
        })),
      },
      $transaction: vi.fn(async (fn) => fn(tx as never)),
    } as never,
    sendEmail: sendEmail as never,
  };
  return { deps, tx, sendEmail };
}

describe("upsertShipment (sólo número de seguimiento)", () => {
  it("pedido pagado sin Shipment: lo crea despachado con el costo del pedido y pasa el pedido a shipped (desde paid)", async () => {
    const { deps, tx } = makeDeps({ orderStatus: "paid", existingShipment: null });
    const r = await upsertShipment("ord-1", baseInput, deps);
    expect(r.id).toBe("ord-1");
    expect(tx.shipment.create).toHaveBeenCalledWith({
      data: { orderId: "ord-1", trackingNumber: "CA123456789AR", status: "dispatched", cost: 2500 },
    });
    expect(tx.order.updateMany).toHaveBeenCalledWith({ where: { id: "ord-1", status: "paid" }, data: { status: "shipped" } });
  });

  it("Shipment pendiente del webhook: lo pasa a dispatched y guarda el número", async () => {
    const { deps, tx } = makeDeps({ orderStatus: "preparing", existingShipment: { id: "shp-1", status: "pending", trackingNumber: null } });
    await upsertShipment("ord-1", baseInput, deps);
    expect(tx.shipment.update).toHaveBeenCalledWith({
      where: { orderId: "ord-1" },
      data: { trackingNumber: "CA123456789AR", status: "dispatched", trackingLastEvent: null, trackingCheckedAt: null },
    });
    expect(tx.shipment.create).not.toHaveBeenCalled();
  });

  it("corregir el número de un envío ya en camino: no toca el estado, borra lo consultado del número viejo", async () => {
    const { deps, tx } = makeDeps({ orderStatus: "shipped", existingShipment: { id: "shp-1", status: "in_transit", trackingNumber: "VIEJO" } });
    await upsertShipment("ord-1", baseInput, deps);
    expect(tx.shipment.update).toHaveBeenCalledWith({
      where: { orderId: "ord-1" },
      data: { trackingNumber: "CA123456789AR", trackingLastEvent: null, trackingCheckedAt: null },
    });
    expect(tx.order.updateMany).not.toHaveBeenCalled();
  });

  it("recorta espacios y rechaza el número vacío", async () => {
    const { deps, tx } = makeDeps();
    await expect(upsertShipment("ord-1", { trackingNumber: "   " }, deps)).rejects.toThrow(/número de seguimiento/i);
    expect(tx.shipment.create).not.toHaveBeenCalled();
    await upsertShipment("ord-1", { trackingNumber: "  CA1  " }, deps);
    expect(tx.shipment.create).toHaveBeenCalledWith({ data: expect.objectContaining({ trackingNumber: "CA1" }) });
  });

  it("rechaza pedidos no pagados (pending_payment / cancelled)", async () => {
    for (const orderStatus of ["pending_payment", "cancelled"]) {
      const { deps, tx } = makeDeps({ orderStatus });
      await expect(upsertShipment("ord-1", baseInput, deps)).rejects.toThrow(/no está pagado/i);
      expect(tx.shipment.create).not.toHaveBeenCalled();
    }
  });

  it("rechaza si el pedido no existe", async () => {
    const deps: ShipmentsDeps = {
      db: { order: { findUnique: vi.fn(async () => null) }, $transaction: vi.fn(async (fn) => fn({} as never)) } as never,
    };
    await expect(upsertShipment("ord-x", baseInput, deps)).rejects.toThrow(/no existe/i);
  });
});

describe("upsertShipment · aviso de despacho a la clienta", () => {
  it("al pasar a shipped le manda el mail de despacho con el número (y el service de la precarga)", async () => {
    const { deps, sendEmail } = makeDeps({ orderStatus: "paid", existingShipment: { id: "shp-1", status: "pending", service: "Correo Argentino Clásico" } });
    await upsertShipment("ord-1", baseInput, deps);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const call = (sendEmail as any).mock.calls[0][0];
    expect(call.to).toBe("ana@example.com");
    expect(call.subject).toContain("GLM-000123");
    expect(call.html).toContain("CA123456789AR");
    expect(call.html).toContain("Correo Argentino Clásico");
    // El botón va a la página de seguimiento propia (id interno del pedido, no el número).
    expect(call.html).toContain("/seguimiento/ord-1");
  });

  it("si el pedido ya estaba shipped (corrección de número) NO re-manda el mail", async () => {
    const { deps, sendEmail } = makeDeps({ orderStatus: "shipped", existingShipment: { id: "shp-1", status: "dispatched", trackingNumber: "VIEJO" } });
    await upsertShipment("ord-1", baseInput, deps);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("si otra llamada ya lo movió a shipped (pierde la carrera) NO manda el mail", async () => {
    const { deps, tx, sendEmail } = makeDeps({ orderStatus: "paid" });
    tx.order.updateMany.mockResolvedValueOnce({ count: 0 });
    await upsertShipment("ord-1", baseInput, deps);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("retryMicorreoImport", () => {
  const baseOrder = {
    status: "paid",
    orderNumber: "GLM-1",
    contactName: "Ana",
    contactEmail: "a@a.com",
    contactPhone: "11",
    shippingMethod: "domicilio",
    shippingAddress: { cp: "1900", province: "Buenos Aires", street: "Calle 1", number: "2", city: "La Plata" },
    weightGr: 100,
    subtotal: 5000,
    shippingCost: 2500,
    shipment: null,
  };
  function makeRetryDeps(over: {
    order?: Record<string, unknown> | null;
    outcome?: { imported: true; service: string; detail: string } | { imported: false; detail: string };
  } = {}) {
    const shipmentUpsert = vi.fn(async () => ({}));
    const autoImport = vi.fn(async () => over.outcome ?? ({ imported: true, service: "Correo Argentino Clásico", detail: "importado (ok)" } as const));
    const order = over.order === undefined ? baseOrder : over.order;
    const deps: RetryImportDeps = {
      db: {
        order: { findUnique: vi.fn(async () => order) },
        shipment: { upsert: shipmentUpsert },
      } as never,
      autoImport: autoImport as never,
      now: new Date("2026-08-27T00:00:00Z"),
    };
    return { deps, shipmentUpsert, autoImport };
  }

  it("import OK → upsert marca micorreoImportedAt y devuelve imported:true", async () => {
    const { deps, shipmentUpsert } = makeRetryDeps();
    const r = await retryMicorreoImport("ord-1", deps);
    expect(r.imported).toBe(true);
    expect(shipmentUpsert).toHaveBeenCalledWith({
      where: { orderId: "ord-1" },
      update: { service: "Correo Argentino Clásico", micorreoImportedAt: deps.now },
      create: { orderId: "ord-1", cost: 2500, status: "pending", service: "Correo Argentino Clásico", micorreoImportedAt: deps.now },
    });
  });

  it("import falla → NO toca el Shipment y devuelve el motivo", async () => {
    const { deps, shipmentUpsert } = makeRetryDeps({ outcome: { imported: false, detail: "dirección incompleta en el pedido" } });
    const r = await retryMicorreoImport("ord-1", deps);
    expect(r.imported).toBe(false);
    expect(r.detail).toContain("incompleta");
    expect(shipmentUpsert).not.toHaveBeenCalled();
  });

  it("pedido inexistente → imported:false sin llamar a la API", async () => {
    const { deps, autoImport } = makeRetryDeps({ order: null });
    const r = await retryMicorreoImport("ord-x", deps);
    expect(r.imported).toBe(false);
    expect(autoImport).not.toHaveBeenCalled();
  });

  it("pedido no pagado (pending_payment) → rechaza sin llamar a la API", async () => {
    const { deps, autoImport } = makeRetryDeps({ order: { ...baseOrder, status: "pending_payment" } });
    const r = await retryMicorreoImport("ord-1", deps);
    expect(r.imported).toBe(false);
    expect(autoImport).not.toHaveBeenCalled();
  });

  it("pedido ya despachado (tiene tracking) → NO re-importa, imported:true", async () => {
    const { deps, autoImport, shipmentUpsert } = makeRetryDeps({
      order: { ...baseOrder, status: "delivered", shipment: { trackingNumber: "CA999AR", micorreoImportedAt: null } },
    });
    const r = await retryMicorreoImport("ord-1", deps);
    expect(r.imported).toBe(true);
    expect(r.detail).toMatch(/despachado/i);
    expect(autoImport).not.toHaveBeenCalled();
    expect(shipmentUpsert).not.toHaveBeenCalled();
  });

  it("pedido ya importado antes → NO repega a la API, imported:true", async () => {
    const { deps, autoImport } = makeRetryDeps({
      order: { ...baseOrder, shipment: { trackingNumber: null, micorreoImportedAt: new Date("2026-08-01T00:00:00Z") } },
    });
    const r = await retryMicorreoImport("ord-1", deps);
    expect(r.imported).toBe(true);
    expect(autoImport).not.toHaveBeenCalled();
  });
});
