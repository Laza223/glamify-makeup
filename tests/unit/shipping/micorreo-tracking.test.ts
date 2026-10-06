import { describe, it, expect, beforeEach } from "vitest";
import {
  parseTrackingResponse,
  getMicorreoTracking,
  __resetMicorreoAuthCache,
  type MicorreoEnv,
  type TrackingRequest,
} from "@/lib/shipping/micorreo";

const env: MicorreoEnv = { MICORREO_EMAIL: "e@x.com", MICORREO_PASSWORD: "pw", MICORREO_GATEWAY_AUTH: "GATEWAY" };
const jsonRes = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;
const authFetch = (async (url: string) => {
  if (url.endsWith("/token")) return jsonRes({ token: "JWT", expire: "2099-01-01T00:00:00Z" });
  if (url.endsWith("/users/validate")) return jsonRes({ customerId: 12345 });
  throw new Error("url inesperada " + url);
}) as unknown as typeof fetch;

describe("parseTrackingResponse", () => {
  it("'No existe el cliente o pedido' (respuesta real de la API) → notFound", () => {
    const r = parseTrackingResponse({ date: "2026-10-06T18:51:04.128-03:00", error: "No existe el cliente o pedido", code: "0" });
    expect(r).toEqual({ ok: false, notFound: true, error: "No existe el cliente o pedido" });
  });

  it("lista en la raíz con los nombres de la tabla de MiCorreo (Fecha/Planta/Historia/Estado)", () => {
    const r = parseTrackingResponse([
      { fecha: "11-05-2026 10:10", planta: "OAM VILLA BALLESTER", historia: "INTENTO DE ENTREGA", estado: "ENTREGA EN SUCURSAL" },
      { fecha: "27-04-2026 18:14", planta: "CORREO ARGENTINO", historia: "PREIMPOSICION", estado: "" },
    ]);
    expect(r).toEqual({
      ok: true,
      events: [
        { date: "11-05-2026 10:10", facility: "OAM VILLA BALLESTER", event: "INTENTO DE ENTREGA", status: "ENTREGA EN SUCURSAL" },
        { date: "27-04-2026 18:14", facility: "CORREO ARGENTINO", event: "PREIMPOSICION", status: null },
      ],
    });
  });

  it("lista anidada bajo cualquier clave y nombres en inglés", () => {
    const r = parseTrackingResponse({ shippingId: "X", events: [{ Date: "2026-05-04T12:43:00", Facility: "LUJAN", Event: "INGRESO AL CORREO" }] });
    expect(r).toEqual({ ok: true, events: [{ date: "2026-05-04T12:43:00", facility: "LUJAN", event: "INGRESO AL CORREO", status: null }] });
  });

  it("formato desconocido → error con el crudo (no inventa estados)", () => {
    const sinLista = parseTrackingResponse({ foo: "bar" });
    expect(sinLista.ok).toBe(false);
    if (!sinLista.ok) expect(sinLista.notFound).toBe(false);
    const filasRaras = parseTrackingResponse([{ a: 1 }]);
    expect(filasRaras.ok).toBe(false);
  });

  it("lista vacía → ok sin eventos", () => {
    expect(parseTrackingResponse([])).toEqual({ ok: true, events: [] });
  });
});

describe("getMicorreoTracking", () => {
  beforeEach(() => __resetMicorreoAuthCache());

  it("autentica y manda GET /shipping/tracking con { shippingId } en el body y Bearer", async () => {
    const calls: Array<{ url: string; token: string; body: string }> = [];
    const request: TrackingRequest = async (url, token, body) => {
      calls.push({ url, token, body });
      return { status: 200, body: JSON.stringify([{ historia: "INGRESO AL CORREO", planta: "LUJAN" }]) };
    };
    const r = await getMicorreoTracking("000162646287A640IC8C201", env, authFetch, request, 1000);
    expect(r).toEqual({ ok: true, events: [{ date: null, facility: "LUJAN", event: "INGRESO AL CORREO", status: null }] });
    expect(calls).toEqual([
      { url: "https://api.correoargentino.com.ar/micorreo/v1/shipping/tracking", token: "JWT", body: '{"shippingId":"000162646287A640IC8C201"}' },
    ]);
  });

  it("nunca tira: HTTP de error, respuesta no JSON, red caída o sin credenciales vuelven como ok:false", async () => {
    const http500: TrackingRequest = async () => ({ status: 500, body: "" });
    expect((await getMicorreoTracking("X", env, authFetch, http500, 1000)).ok).toBe(false);
    __resetMicorreoAuthCache();
    const html: TrackingRequest = async () => ({ status: 200, body: "<html>" });
    expect((await getMicorreoTracking("X", env, authFetch, html, 1000)).ok).toBe(false);
    __resetMicorreoAuthCache();
    const caida: TrackingRequest = async () => {
      throw new Error("ECONNRESET");
    };
    expect(await getMicorreoTracking("X", env, authFetch, caida, 1000)).toEqual({ ok: false, notFound: false, error: "ECONNRESET" });
    expect((await getMicorreoTracking("X", {}, authFetch, caida, 1000)).ok).toBe(false);
  });
});
