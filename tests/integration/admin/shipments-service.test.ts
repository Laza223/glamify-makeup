import { describe, it, expect, vi } from "vitest";
import {
  upsertShipment,
  resendDispatchEmail,
  type ShipmentsDeps,
  type ShipmentInput,
} from "@/lib/admin/shipments/service";

const baseInput: ShipmentInput = { carrier: "correo_argentino", trackingNumber: "CA123456789AR" };

type Existing = { id: string; status: string; carrier?: string; trackingNumber?: string | null } | null;

function makeDeps(
  over: {
    orderStatus?: string;
    existingShipment?: Existing;
    shippingMethod?: string;
    shippingAddress?: unknown;
  } = {},
) {
  const existing = over.existingShipment ?? null;
  const tx = {
    shipment: {
      findUnique: vi.fn(async () => (existing ? { carrier: "correo_argentino", ...existing } : null)),
      create: vi.fn(async ({ data }: { data: unknown }) => ({ id: "shp-1", ...(data as object) })),
      update: vi.fn(async () => ({ id: "shp-1" })),
    },
    order: { updateMany: vi.fn(async () => ({ count: 1 })), update: vi.fn(async () => ({})) },
  };
  const sendEmail = vi.fn(async (_input: { to: string; subject: string; html: string; text?: string }) => ({ id: "e1", logged: false }));
  const deps: ShipmentsDeps = {
    db: {
      order: {
        findUnique: vi.fn(async () => ({
          id: "ord-1",
          status: over.orderStatus ?? "paid",
          orderNumber: "GLM-000123",
          contactName: "Ana",
          contactEmail: "ana@example.com",
          shippingMethod: over.shippingMethod ?? "domicilio",
          shippingCost: 2500,
          shippingAddress: over.shippingAddress ?? { cp: "6700" },
          shipment: existing ? { carrier: "correo_argentino", ...existing } : null,
        })),
      },
      $transaction: vi.fn(async (fn) => fn(tx as never)),
    } as never,
    sendEmail: sendEmail as never,
  };
  return { deps, tx, sendEmail };
}

describe("upsertShipment (empresa + código)", () => {
  it("pedido pagado sin Shipment: lo crea despachado con empresa y costo del pedido y pasa el pedido a shipped (desde paid)", async () => {
    const { deps, tx } = makeDeps({ orderStatus: "paid", existingShipment: null });
    const r = await upsertShipment("ord-1", { carrier: "andreani", trackingNumber: "AND1" }, deps);
    expect(r.id).toBe("ord-1");
    expect(tx.shipment.create).toHaveBeenCalledWith({
      data: { orderId: "ord-1", carrier: "andreani", trackingNumber: "AND1", status: "dispatched", cost: 2500 },
    });
    expect(tx.order.updateMany).toHaveBeenCalledWith({ where: { id: "ord-1", status: "paid" }, data: { status: "shipped" } });
  });

  it("Shipment pendiente del webhook: lo pasa a dispatched y guarda empresa y código", async () => {
    const { deps, tx } = makeDeps({ orderStatus: "preparing", existingShipment: { id: "shp-1", status: "pending", trackingNumber: null } });
    await upsertShipment("ord-1", { carrier: "oca", trackingNumber: "OCA1" }, deps);
    expect(tx.shipment.update).toHaveBeenCalledWith({
      where: { orderId: "ord-1" },
      data: { carrier: "oca", trackingNumber: "OCA1", status: "dispatched", trackingLastEvent: null, trackingCheckedAt: null },
    });
    expect(tx.shipment.create).not.toHaveBeenCalled();
  });

  it("corregir el código de un envío ya en camino: no toca el estado, borra lo consultado del código viejo", async () => {
    const { deps, tx } = makeDeps({ orderStatus: "shipped", existingShipment: { id: "shp-1", status: "in_transit", trackingNumber: "VIEJO" } });
    await upsertShipment("ord-1", baseInput, deps);
    expect(tx.shipment.update).toHaveBeenCalledWith({
      where: { orderId: "ord-1" },
      data: { carrier: "correo_argentino", trackingNumber: "CA123456789AR", trackingLastEvent: null, trackingCheckedAt: null },
    });
    expect(tx.order.updateMany).not.toHaveBeenCalled();
  });

  it("rechaza una empresa que no está en la lista (o vacía) sin tocar nada", async () => {
    for (const carrier of ["fedex", "", "ANDREANI"]) {
      const { deps, tx, sendEmail } = makeDeps();
      await expect(upsertShipment("ord-1", { carrier, trackingNumber: "X1" }, deps)).rejects.toThrow(/empresa de envío/i);
      expect(tx.shipment.create).not.toHaveBeenCalled();
      expect(tx.order.updateMany).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    }
  });

  it("recorta espacios, rechaza el código vacío o demasiado largo", async () => {
    const { deps, tx } = makeDeps();
    await expect(upsertShipment("ord-1", { ...baseInput, trackingNumber: "   " }, deps)).rejects.toThrow(/número de seguimiento/i);
    await expect(upsertShipment("ord-1", { ...baseInput, trackingNumber: "A".repeat(81) }, deps)).rejects.toThrow(/demasiado largo/i);
    expect(tx.shipment.create).not.toHaveBeenCalled();
    await upsertShipment("ord-1", { ...baseInput, trackingNumber: "  CA1  " }, deps);
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

describe("pedidos digitales (gift card)", () => {
  it("upsertShipment rechaza cargar seguimiento y no toca nada", async () => {
    const { deps, tx } = makeDeps({ shippingMethod: "digital", orderStatus: "delivered" });
    await expect(upsertShipment("ord-1", baseInput, deps)).rejects.toThrow("Los pedidos digitales no llevan envío.");
    expect(tx.shipment.create).not.toHaveBeenCalled();
    expect(tx.order.updateMany).not.toHaveBeenCalled();
  });
});

describe("upsertShipment · sucursal de retiro", () => {
  it("pedido a sucursal: guarda la sucursal en shippingAddress.pickupBranch (no en trackingLastEvent) y la manda en el mail", async () => {
    const { deps, tx, sendEmail } = makeDeps({ shippingMethod: "sucursal", shippingAddress: { cp: "6700", city: "Luján", dni: "30123456" } });
    await upsertShipment("ord-1", { ...baseInput, pickupBranch: "  Sucursal Luján, Mitre 123 " }, deps);
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: "ord-1" },
      data: { shippingAddress: { cp: "6700", city: "Luján", dni: "30123456", pickupBranch: "Sucursal Luján, Mitre 123" } },
    });
    expect(sendEmail.mock.calls[0][0].html).toContain("Sucursal Luján, Mitre 123");
  });

  it("sucursal sin texto: borra la clave y el mail promete avisar dónde retirarlo", async () => {
    const { deps, tx, sendEmail } = makeDeps({ shippingMethod: "sucursal", shippingAddress: { cp: "6700", pickupBranch: "Vieja" } });
    await upsertShipment("ord-1", baseInput, deps);
    expect(tx.order.update).toHaveBeenCalledWith({ where: { id: "ord-1" }, data: { shippingAddress: { cp: "6700" } } });
    expect(sendEmail.mock.calls[0][0].html).toContain("te avisamos dónde retirarlo");
  });

  it("domicilio: ignora pickupBranch (no toca la dirección ni va al mail)", async () => {
    const { deps, tx, sendEmail } = makeDeps({ shippingMethod: "domicilio" });
    await upsertShipment("ord-1", { ...baseInput, pickupBranch: "Sucursal X" }, deps);
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(sendEmail.mock.calls[0][0].html).not.toContain("Sucursal X");
  });

  it("rechaza una sucursal de retiro demasiado larga", async () => {
    const { deps } = makeDeps({ shippingMethod: "sucursal" });
    await expect(upsertShipment("ord-1", { ...baseInput, pickupBranch: "S".repeat(161) }, deps)).rejects.toThrow(/demasiado larga/i);
  });
});

describe("upsertShipment · aviso de despacho a la clienta", () => {
  it("primer despacho (pasa a shipped): mail con empresa, código y botón a /seguimiento/<id>", async () => {
    const { deps, sendEmail } = makeDeps({ orderStatus: "paid", existingShipment: { id: "shp-1", status: "pending" } });
    await upsertShipment("ord-1", { carrier: "via_cargo", trackingNumber: "VC999" }, deps);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const call = sendEmail.mock.calls[0][0];
    expect(call.to).toBe("ana@example.com");
    expect(call.subject).toContain("GLM-000123");
    expect(call.html).toContain("VC999");
    expect(call.html).toContain("Vía Cargo");
    // El botón va a la página de seguimiento propia (id interno del pedido, no el número).
    expect(call.html).toContain("/seguimiento/ord-1");
  });

  it("ya shipped y cambia el código: re-manda el mail", async () => {
    const { deps, sendEmail } = makeDeps({ orderStatus: "shipped", existingShipment: { id: "shp-1", status: "dispatched", trackingNumber: "VIEJO" } });
    await upsertShipment("ord-1", baseInput, deps);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].html).toContain("CA123456789AR");
  });

  it("ya shipped y cambia la empresa (mismo código): re-manda el mail", async () => {
    const { deps, sendEmail } = makeDeps({
      orderStatus: "shipped",
      existingShipment: { id: "shp-1", status: "dispatched", carrier: "correo_argentino", trackingNumber: "CA123456789AR" },
    });
    await upsertShipment("ord-1", { carrier: "andreani", trackingNumber: "CA123456789AR" }, deps);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].html).toContain("Andreani");
  });

  it("ya shipped y no cambia nada: NO manda mail", async () => {
    const { deps, sendEmail } = makeDeps({
      orderStatus: "shipped",
      existingShipment: { id: "shp-1", status: "dispatched", carrier: "correo_argentino", trackingNumber: "CA123456789AR" },
    });
    await upsertShipment("ord-1", baseInput, deps);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("si otra llamada ya lo movió a shipped (pierde la carrera) NO manda el mail", async () => {
    const { deps, tx, sendEmail } = makeDeps({ orderStatus: "paid" });
    tx.order.updateMany.mockResolvedValueOnce({ count: 0 });
    await upsertShipment("ord-1", baseInput, deps);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("si el mail falla, el despacho igual se guarda (best-effort)", async () => {
    const { deps, tx, sendEmail } = makeDeps({ orderStatus: "paid" });
    sendEmail.mockRejectedValueOnce(new Error("Resend caído"));
    await expect(upsertShipment("ord-1", baseInput, deps)).resolves.toEqual({ id: "ord-1" });
    expect(tx.shipment.create).toHaveBeenCalled();
  });
});

describe("resendDispatchEmail", () => {
  const shipped = { id: "shp-1", status: "dispatched", carrier: "oca", trackingNumber: "OCA777" };

  it("reenvía el mail con lo ya guardado (empresa, código y sucursal)", async () => {
    const { deps, sendEmail, tx } = makeDeps({
      orderStatus: "shipped",
      existingShipment: shipped,
      shippingMethod: "sucursal",
      shippingAddress: { cp: "6700", pickupBranch: "OCA Luján" },
    });
    const r = await resendDispatchEmail("ord-1", deps);
    expect(r.id).toBe("ord-1");
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const call = sendEmail.mock.calls[0][0];
    expect(call.html).toContain("OCA777");
    expect(call.html).toContain("OCA Luján");
    expect(call.html).toContain("/seguimiento/ord-1");
    expect(tx.shipment.update).not.toHaveBeenCalled();
  });

  it("rechaza si el pedido no está enviado o no tiene código", async () => {
    const a = makeDeps({ orderStatus: "paid", existingShipment: shipped });
    await expect(resendDispatchEmail("ord-1", a.deps)).rejects.toThrow(/no tiene un despacho/i);
    const b = makeDeps({ orderStatus: "shipped", existingShipment: { id: "shp-1", status: "pending", trackingNumber: null } });
    await expect(resendDispatchEmail("ord-1", b.deps)).rejects.toThrow(/no tiene un despacho/i);
    expect(a.sendEmail).not.toHaveBeenCalled();
    expect(b.sendEmail).not.toHaveBeenCalled();
  });

  it("si Resend falla, el error SE PROPAGA (la dueña lo pidió a mano)", async () => {
    const { deps, sendEmail } = makeDeps({ orderStatus: "shipped", existingShipment: shipped });
    sendEmail.mockRejectedValueOnce(new Error("Resend caído"));
    await expect(resendDispatchEmail("ord-1", deps)).rejects.toThrow(/No se pudo enviar el mail/);
  });

  it("rechaza si el pedido no existe", async () => {
    const deps: ShipmentsDeps = { db: { order: { findUnique: vi.fn(async () => null) } } as never };
    await expect(resendDispatchEmail("ord-x", deps)).rejects.toThrow(/no existe/i);
  });
});
