import { describe, it, expect, vi } from "vitest";
import { runShipmentTrackingJob, type TrackingJobDeps, type TrackingJobShipment } from "@/lib/shipping/tracking-job";
import type { MicorreoTrackingResult, TrackingEvent } from "@/lib/shipping/micorreo";

const NOW = new Date("2026-10-07T12:00:00Z");
const ev = (event: string, status: string | null = null, facility: string | null = "LUJAN"): TrackingEvent => ({ event, status, facility, date: null });

const shipment = (over: Partial<TrackingJobShipment> = {}): TrackingJobShipment => ({
  id: "shp-1",
  trackingNumber: "CA123",
  status: "dispatched",
  trackingNotified: [],
  order: {
    id: "ord-1",
    orderNumber: "GLM-000123",
    status: "shipped",
    customerId: "cus-1",
    contactName: "Ana",
    contactEmail: "ana@example.com",
    contactPhone: "1122334455",
  },
  ...over,
});

function makeDeps(rows: TrackingJobShipment[], tracking: (id: string) => MicorreoTrackingResult, over: Partial<TrackingJobDeps> = {}) {
  const notified = new Map(rows.map((r) => [r.id, [...r.trackingNotified]]));
  const tx = {
    shipment: { update: vi.fn(async () => ({})) },
    order: { updateMany: vi.fn(async () => ({ count: 1 })) },
  };
  const db = {
    shipment: {
      findMany: vi.fn(async () => rows),
      update: vi.fn(async () => ({})),
      // Reclamo atómico de un aviso: sólo gana si la marca no estaba.
      updateMany: vi.fn(async ({ where, data }: { where: { id: string; NOT: { trackingNotified: { has: string } } }; data: { trackingNotified: { push: string } } }) => {
        const list = notified.get(where.id) ?? [];
        if (list.includes(where.NOT.trackingNotified.has)) return { count: 0 };
        list.push(data.trackingNotified.push);
        notified.set(where.id, list);
        return { count: 1 };
      }),
    },
    $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const sendEmail = vi.fn(async () => ({ id: "e1", logged: false }));
  const getTracking = vi.fn(async (id: string) => tracking(id));
  const deps: TrackingJobDeps = {
    db: db as never,
    now: NOW,
    sendEmail: sendEmail as never,
    appUrl: "https://www.glamifymakeup.site",
    ownerEmail: "owner@test.com",
    getTracking,
    ...over,
  };
  return { deps, db, tx, sendEmail, getTracking, notified };
}

describe("runShipmentTrackingJob", () => {
  it("consulta sólo envíos despachados/en camino, de pedidos enviados, no consultados en las últimas 3 h, con tope", async () => {
    const { deps, db } = makeDeps([], () => ({ ok: true, events: [] }));
    await runShipmentTrackingJob(deps);
    const args = (db.shipment.findMany.mock.calls[0] as unknown[])[0] as { where: Record<string, unknown>; take: number };
    expect(args.where).toMatchObject({
      trackingNumber: { not: null },
      status: { in: ["dispatched", "in_transit"] },
      order: { status: "shipped" },
      OR: [{ trackingCheckedAt: null }, { trackingCheckedAt: { lt: new Date("2026-10-07T09:00:00Z") } }],
      createdAt: { gte: new Date("2026-08-08T12:00:00Z") },
    });
    expect(args.take).toBe(25);
  });

  it("primer movimiento real → en camino, guarda el último evento, sin mails", async () => {
    const { deps, tx, sendEmail } = makeDeps([shipment()], () => ({ ok: true, events: [ev("INGRESO AL CORREO")] }));
    const r = await runShipmentTrackingJob(deps);
    expect(tx.shipment.update).toHaveBeenCalledWith({
      where: { id: "shp-1" },
      data: { status: "in_transit", trackingCheckedAt: NOW, trackingLastEvent: "INGRESO AL CORREO · LUJAN" },
    });
    expect(tx.order.updateMany).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(r).toEqual({ checked: 1, updated: 1, delivered: 0, notified: 0, errors: 0 });
  });

  it("entregado → envío y pedido delivered (con precondición shipped) + mail a la clienta con link de reseña", async () => {
    const { deps, tx, sendEmail } = makeDeps([shipment({ status: "in_transit" })], () => ({ ok: true, events: [ev("ENTREGADO")] }));
    const r = await runShipmentTrackingJob(deps);
    expect(tx.order.updateMany).toHaveBeenCalledWith({ where: { id: "ord-1", status: "shipped" }, data: { status: "delivered" } });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const mail = (sendEmail.mock.calls[0] as unknown[])[0] as { to: string; subject: string; html: string };
    expect(mail.to).toBe("ana@example.com");
    expect(mail.subject).toContain("llegó");
    expect(mail.html).toContain("https://www.glamifymakeup.site/cuenta/pedidos/GLM-000123");
    expect(r.delivered).toBe(1);
  });

  it("invitada (sin cuenta): el mail de entregado no trae link de reseña", async () => {
    const s = shipment({ status: "in_transit" });
    s.order.customerId = null;
    const { deps, sendEmail } = makeDeps([s], () => ({ ok: true, events: [ev("ENTREGADO")] }));
    await runShipmentTrackingJob(deps);
    const mail = (sendEmail.mock.calls[0] as unknown[])[0] as { html: string };
    expect(mail.html).not.toContain("/cuenta/pedidos/");
  });

  it("esperando en sucursal → mail a la clienta UNA sola vez (dos corridas)", async () => {
    const events = [ev("INTENTO DE ENTREGA", "EN ESPERA EN SUCURSAL", "OAM VILLA BALLESTER"), ev("INGRESO AL CORREO")];
    const { deps, sendEmail, notified } = makeDeps([shipment({ status: "in_transit" })], () => ({ ok: true, events }));
    await runShipmentTrackingJob(deps);
    await runShipmentTrackingJob(deps);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const mail = (sendEmail.mock.calls[0] as unknown[])[0] as { to: string; html: string };
    expect(mail.to).toBe("ana@example.com");
    expect(mail.html).toContain("OAM VILLA BALLESTER");
    expect(notified.get("shp-1")).toEqual(["awaiting_pickup"]);
  });

  it("devuelto → alerta a la dueña (no a la clienta), una sola vez", async () => {
    const { deps, sendEmail } = makeDeps([shipment({ status: "in_transit" })], () => ({ ok: true, events: [ev("DEVOLUCION AL REMITENTE")] }));
    await runShipmentTrackingJob(deps);
    await runShipmentTrackingJob(deps);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const mail = (sendEmail.mock.calls[0] as unknown[])[0] as { to: string; subject: string };
    expect(mail.to).toBe("owner@test.com");
    expect(mail.subject).toContain("REVISAR");
  });

  it("si MiCorreo no encuentra el número, reintenta con el número de pedido (extOrderId de la precarga)", async () => {
    const { deps, getTracking, tx } = makeDeps([shipment()], (id) =>
      id === "GLM-000123" ? { ok: true, events: [ev("INGRESO AL CORREO")] } : { ok: false, notFound: true, error: "No existe el cliente o pedido" },
    );
    await runShipmentTrackingJob(deps);
    expect(getTracking.mock.calls.map((c) => c[0])).toEqual(["CA123", "GLM-000123"]);
    expect(tx.shipment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "in_transit" }) }));
  });

  it("Correo caído: marca la consulta, no cambia el estado y sigue con el resto", async () => {
    const rows = [shipment({ id: "shp-1" }), shipment({ id: "shp-2", trackingNumber: "CA456" })];
    const { deps, db, tx } = makeDeps(rows, (id) =>
      id === "CA123" ? { ok: false, notFound: false, error: "timeout" } : { ok: true, events: [ev("INGRESO AL CORREO")] },
    );
    const r = await runShipmentTrackingJob(deps);
    expect(db.shipment.update).toHaveBeenCalledWith({ where: { id: "shp-1" }, data: { trackingCheckedAt: NOW } });
    expect(tx.shipment.update).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ checked: 2, updated: 1, errors: 1 });
  });

  it("un mail que falla no corta la corrida ni se reintenta (se reclamó la marca antes)", async () => {
    const { deps, sendEmail, notified } = makeDeps([shipment({ status: "in_transit" })], () => ({ ok: true, events: [ev("ENTREGADO")] }), {
      sendEmail: vi.fn(async () => {
        throw new Error("Resend caído");
      }) as never,
    });
    const r = await runShipmentTrackingJob(deps);
    expect(r.errors).toBe(0);
    expect(r.notified).toBe(0);
    expect(notified.get("shp-1")).toEqual(["delivered"]);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
