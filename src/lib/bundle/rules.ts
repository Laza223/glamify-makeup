import { round2 } from "@/lib/money";

/** Mínimo de productos (sin empaque) para armar un ramo o una box. */
export const BUNDLE_MINIMUM = 15000;
/** Tope de unidades por regalo armado. */
export const MAX_BUNDLE_UNITS = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BundleKindKey = "ramo" | "box";

export const BUNDLE_KIND_LABEL: Record<BundleKindKey, { name: string; article: string }> = {
  ramo: { name: "Ramo de maquillaje", article: "tu ramo" },
  box: { name: "Box de maquillaje", article: "tu box" },
};

export function isBundleKind(v: unknown): v is BundleKindKey {
  return v === "ramo" || v === "box";
}

export interface BundlePricing {
  productsTotal: number;
  packagingFee: number;
  total: number;
  meetsMinimum: boolean;
  /** Lo que falta para llegar al mínimo (0 si ya lo alcanza). */
  missing: number;
}

/** Precio de un regalo armado: suma de productos + empaque fijo. El mínimo se mide solo sobre los productos. */
export function computeBundlePricing(
  lines: ReadonlyArray<{ unitPrice: number; qty: number }>,
  packagingFee: number,
): BundlePricing {
  const productsTotal = round2(lines.reduce((acc, l) => acc + l.unitPrice * l.qty, 0));
  const fee = round2(Math.max(0, packagingFee));
  return {
    productsTotal,
    packagingFee: fee,
    total: round2(productsTotal + fee),
    meetsMinimum: productsTotal >= BUNDLE_MINIMUM,
    missing: round2(Math.max(0, BUNDLE_MINIMUM - productsTotal)),
  };
}

export interface BundleSelection {
  variantId: string;
  qty: number;
}

/** Normaliza lo que manda el cliente: variantes únicas (suma qty), cantidades enteras ≥ 1. Devuelve null si es inválido. */
export function normalizeSelection(input: unknown): BundleSelection[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const merged = new Map<string, number>();
  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) return null;
    const { variantId, qty } = raw as { variantId?: unknown; qty?: unknown };
    if (typeof variantId !== "string" || !UUID_RE.test(variantId)) return null;
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1) return null;
    merged.set(variantId, (merged.get(variantId) ?? 0) + qty);
  }
  const out = [...merged].map(([variantId, qty]) => ({ variantId, qty }));
  const units = out.reduce((acc, s) => acc + s.qty, 0);
  return units > MAX_BUNDLE_UNITS ? null : out;
}
