/**
 * Cotización en vivo contra la API oficial de MiCorreo (Correo Argentino).
 *
 * Flujo verificado leyendo el plugin GPL `carriers-of-argentina-for-woocommerce`,
 * que pega directo contra `api.correoargentino.com.ar/micorreo/v1` (ver
 * docs/decisions/0001-shipping-provider.md):
 *
 *   1. POST /token          Basic <gateway> + {email,password}  → { token, expire }
 *   2. POST /users/validate Bearer <token>  + {email,password}  → { customerId }
 *   3. POST /rates          Bearer <token>  + {customerId, CPs, deliveredType, dimensions}
 *                                                               → { rates: [{ productType, price, deliveryTimeMax }] }
 *
 * `productType`: CP = Clásico (2-5 días), EP = Expreso (1-3 días).
 * `deliveredType`: S = sucursal, D = domicilio.
 * `dimensions.weight` va en GRAMOS enteros; largo/ancho/alto en CM.
 *
 * Cae a null ante cualquier problema para que el orquestador use la tabla de zonas
 * en vez de romper el checkout.
 */
import type { LiveQuote } from "@/lib/shipping/index";

const API_BASE_PROD = "https://api.correoargentino.com.ar/micorreo/v1";
const API_BASE_TEST = "https://apitest.correoargentino.com.ar/micorreo/v1";
const TIMEOUT_MS = 6000;
const ORIGIN_CP_DEFAULT = "6700"; // Luján (blueprint 05 §4)

/** Dimensiones por paquete (cm). El catálogo guarda `weightGr` pero no medidas;
 *  el maquillaje es chico y homogéneo, el peso domina la tarifa. */
export const DEFAULT_ITEM_CM = { length: 12, width: 5, height: 5 } as const;

/** Nuestro método → código `deliveredType` de MiCorreo. */
const DELIVERED_BY_METHOD = { domicilio: "D", sucursal: "S" } as const;

/** Nuestra velocidad → `productType` de MiCorreo. Default Clásico (más barato). */
const PRODUCT_BY_VELOCITY = { classic: "CP", express: "EP" } as const;

export type MicorreoEnv = {
  MICORREO_EMAIL?: string;
  MICORREO_PASSWORD?: string;
  /** Token de gateway (parte base64 de "Basic ..."); el código antepone "Basic ". */
  MICORREO_GATEWAY_AUTH?: string;
  /** "1" para pegar contra apitest en vez de producción. */
  MICORREO_SANDBOX?: string;
  /** CP de origen; default 6700 (Luján). */
  MICORREO_ORIGIN_CP?: string;
  /** "classic" (default) o "express". */
  MICORREO_VELOCITY?: string;
};

/** ¿Hay credenciales de MiCorreo? Sin esto → fallback a la tabla de zonas. */
export function isMicorreoConfigured(env: MicorreoEnv = process.env as MicorreoEnv): boolean {
  return Boolean(env.MICORREO_EMAIL && env.MICORREO_PASSWORD && env.MICORREO_GATEWAY_AUTH);
}

export interface MicorreoQuoteInput {
  cpDestino: string;
  pesoGr: number;
  metodo: "domicilio" | "sucursal";
}

/** Forma mínima de la respuesta de /rates que nos importa. */
export interface MicorreoRatesResponse {
  rates?: Array<{
    productType?: string;
    productName?: string;
    price?: number;
    deliveryTimeMax?: number;
  } | null>;
}

/**
 * Elige la tarifa del `productType` pedido (CP/EP). Pura: se testea sin red.
 * `deliveryTimeMax` viene en días hábiles; la exponemos como texto legible.
 */
export function pickRate(res: MicorreoRatesResponse, productType: "CP" | "EP"): LiveQuote | null {
  const rate = res.rates?.find((r) => r?.productType === productType);
  if (!rate) return null;
  const cost = rate.price;
  if (typeof cost !== "number" || !Number.isFinite(cost) || cost <= 0) return null;
  return {
    cost,
    carrier: "Correo Argentino",
    estimatedDelivery: null, // la API da días hábiles (deliveryTimeMax), no una fecha ISO.
  };
}

function apiBase(env: MicorreoEnv): string {
  return env.MICORREO_SANDBOX === "1" ? API_BASE_TEST : API_BASE_PROD;
}

// Cache de token + customerId por isolate (Workers) / proceso (Node). El /token
// trae expiración; /users/validate es estable. Evita 2 round-trips extra por cotización.
interface AuthCache {
  token: string;
  customerId: string;
  expiresAt: number;
}
let authCache: AuthCache | null = null;

/** Resetea el cache de auth (para tests). */
export function __resetMicorreoAuthCache(): void {
  authCache = null;
}

async function getAuth(
  env: MicorreoEnv,
  fetchImpl: typeof fetch,
  now: number,
): Promise<{ token: string; customerId: string } | null> {
  if (authCache && authCache.expiresAt > now) {
    return { token: authCache.token, customerId: authCache.customerId };
  }
  const base = apiBase(env);
  const creds = { email: env.MICORREO_EMAIL, password: env.MICORREO_PASSWORD };

  // 1. Token (Basic gateway + credenciales de la cuenta).
  const tokenRes = await fetchImpl(`${base}/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${env.MICORREO_GATEWAY_AUTH}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(creds),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!tokenRes.ok) return null;
  const tokenJson = (await tokenRes.json()) as { token?: string; expire?: string };
  const token = tokenJson.token;
  if (!token) return null;

  // 2. customerId (Bearer token + credenciales).
  const validateRes = await fetchImpl(`${base}/users/validate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(creds),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!validateRes.ok) return null;
  const validateJson = (await validateRes.json()) as { customerId?: string | number };
  const customerId = validateJson.customerId;
  if (customerId === undefined || customerId === null || customerId === "") return null;

  // Cache hasta 60s antes de la expiración informada; si no parsea, 10 min conservador.
  const expMs = tokenJson.expire ? Date.parse(tokenJson.expire) : NaN;
  const expiresAt = Number.isFinite(expMs) ? expMs - 60_000 : now + 10 * 60_000;
  authCache = { token, customerId: String(customerId), expiresAt };
  return { token, customerId: String(customerId) };
}

/**
 * Cotiza un envío. Devuelve null ante cualquier problema (sin credenciales,
 * timeout, error HTTP, tarifa ausente) para caer a la tabla de zonas.
 *
 * `nowMs` es inyectable sólo para tests (el cache de auth necesita un reloj); en
 * producción usa Date.now().
 */
export async function quoteMicorreo(
  input: MicorreoQuoteInput,
  env: MicorreoEnv = process.env as MicorreoEnv,
  fetchImpl: typeof fetch = fetch,
  nowMs: number = Date.now(),
): Promise<LiveQuote | null> {
  if (!isMicorreoConfigured(env)) return null;
  if (!input.cpDestino?.trim()) return null;

  try {
    const auth = await getAuth(env, fetchImpl, nowMs);
    if (!auth) return null;

    const productType = PRODUCT_BY_VELOCITY[env.MICORREO_VELOCITY === "express" ? "express" : "classic"];
    const body = {
      customerId: auth.customerId,
      postalCodeOrigin: (env.MICORREO_ORIGIN_CP || ORIGIN_CP_DEFAULT).trim(),
      postalCodeDestination: input.cpDestino.trim(),
      deliveredType: DELIVERED_BY_METHOD[input.metodo],
      dimensions: {
        // La API exige el peso en GRAMOS enteros (probado: 400 "must be Integer value in [g]").
        weight: Math.max(1, Math.round(input.pesoGr)),
        ...DEFAULT_ITEM_CM,
      },
    };

    const res = await fetchImpl(`${apiBase(env)}/rates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return pickRate((await res.json()) as MicorreoRatesResponse, productType);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Seguimiento (GET /shipping/tracking)
//
// No figura en la documentación pública: verificado contra la API real (2026-10-06).
// Es un GET con body JSON `{ "shippingId": "..." }` (el server lo deserializa a
// `HistoryOrderRequest`; rechaza cualquier otro campo). Para un envío que no ve
// responde 200 con `{ "error": "No existe el cliente o pedido" }`. Un envío cargado a
// mano en la web de MiCorreo NO aparece; la hipótesis es que sólo ve los importados
// por la API: sin la precarga (ADR 0004) puede que no encuentre los envíos despachados a mano.
//
// El JSON de un envío encontrado todavía no se vio: el parser es tolerante con los
// nombres de campo (los de la tabla "Movimientos del envío" de la web: Fecha, Planta,
// Historia, Estado) y, si no reconoce el formato, devuelve error con el crudo.
// ─────────────────────────────────────────────────────────────────────────────

export interface TrackingEvent {
  /** Fecha tal cual la manda Correo (ej. "11-05-2026 10:10" o ISO). */
  date: string | null;
  /** Planta / sucursal donde ocurrió (ej. "OAM VILLA BALLESTER"). */
  facility: string | null;
  /** Movimiento (columna "Historia", ej. "INTENTO DE ENTREGA"). */
  event: string;
  /** Detalle (columna "Estado", ej. "EN ESPERA EN SUCURSAL"). */
  status: string | null;
}

export type MicorreoTrackingResult =
  | { ok: true; events: TrackingEvent[] }
  | { ok: false; notFound: boolean; error: string };

/** GET con body: `fetch` no lo permite, así que el default usa `node:https`. */
export type TrackingRequest = (url: string, token: string, body: string) => Promise<{ status: number; body: string }>;

const defaultTrackingRequest: TrackingRequest = async (url, token, body) => {
  const https = await import("node:https");
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data }));
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
};

const pick = (o: Record<string, unknown>, keys: string[]): string | null => {
  for (const [k, v] of Object.entries(o)) {
    if (keys.includes(k.toLowerCase()) && (typeof v === "string" || typeof v === "number") && String(v).trim()) {
      return String(v).trim();
    }
  }
  return null;
};

/** Interpreta la respuesta de /shipping/tracking. Pura y testeable. */
export function parseTrackingResponse(json: unknown): MicorreoTrackingResult {
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const err = (json as { error?: unknown }).error;
    if (typeof err === "string" && err.trim()) {
      return { ok: false, notFound: /no existe/i.test(err), error: err };
    }
  }
  const list = Array.isArray(json)
    ? json
    : json && typeof json === "object"
      ? Object.values(json as Record<string, unknown>).find(Array.isArray)
      : undefined;
  if (!list) return { ok: false, notFound: false, error: `Formato de seguimiento desconocido: ${JSON.stringify(json).slice(0, 300)}` };

  const events: TrackingEvent[] = [];
  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const event = pick(r, ["historia", "event", "evento", "description", "descripcion", "eventdescription"]);
    if (!event) continue;
    events.push({
      date: pick(r, ["fecha", "date", "eventdate", "fechahora", "datetime"]),
      facility: pick(r, ["planta", "facility", "sucursal", "office", "branch", "location"]),
      event,
      status: pick(r, ["estado", "status", "statusdescription"]),
    });
  }
  if (list.length > 0 && events.length === 0) {
    return { ok: false, notFound: false, error: `Formato de seguimiento desconocido: ${JSON.stringify(list[0]).slice(0, 300)}` };
  }
  return { ok: true, events };
}

/** Historial de un envío en MiCorreo. Nunca tira: los fallos vuelven como `ok:false`. */
export async function getMicorreoTracking(
  shippingId: string,
  env: MicorreoEnv = process.env as MicorreoEnv,
  fetchImpl: typeof fetch = fetch,
  request: TrackingRequest = defaultTrackingRequest,
  nowMs: number = Date.now(),
): Promise<MicorreoTrackingResult> {
  if (!isMicorreoConfigured(env)) return { ok: false, notFound: false, error: "Falta configurar las credenciales de MiCorreo." };
  try {
    const auth = await getAuth(env, fetchImpl, nowMs);
    if (!auth) return { ok: false, notFound: false, error: "No pude autenticarme con MiCorreo." };
    const res = await request(`${apiBase(env)}/shipping/tracking`, auth.token, JSON.stringify({ shippingId }));
    if (res.status < 200 || res.status >= 300) {
      return { ok: false, notFound: false, error: `MiCorreo respondió HTTP ${res.status}: ${res.body.slice(0, 200)}` };
    }
    let json: unknown;
    try {
      json = JSON.parse(res.body);
    } catch {
      return { ok: false, notFound: false, error: `Respuesta no JSON: ${res.body.slice(0, 200)}` };
    }
    return parseTrackingResponse(json);
  } catch (e) {
    return { ok: false, notFound: false, error: e instanceof Error ? e.message : String(e) };
  }
}
