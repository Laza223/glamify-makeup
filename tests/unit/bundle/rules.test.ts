import { describe, it, expect } from "vitest";
import {
  BUNDLE_MINIMUM,
  MAX_BUNDLE_UNITS,
  computeBundlePricing,
  isBundleKind,
  normalizeSelection,
} from "@/lib/bundle/rules";
import { bundleSummary } from "@/lib/bundle/summary";

describe("computeBundlePricing", () => {
  it("suma productos + empaque; el mínimo se mide solo sobre los productos", () => {
    const p = computeBundlePricing([{ unitPrice: 5000, qty: 2 }, { unitPrice: 2500, qty: 2 }], 1000);
    expect(p).toEqual({ productsTotal: 15000, packagingFee: 1000, total: 16000, meetsMinimum: true, missing: 0 });
  });
  it("el empaque no ayuda a llegar al mínimo", () => {
    const p = computeBundlePricing([{ unitPrice: 14000, qty: 1 }], 5000);
    expect(p.meetsMinimum).toBe(false);
    expect(p.missing).toBe(1000);
    expect(p.total).toBe(19000);
  });
  it("justo en el mínimo cuenta", () => {
    expect(computeBundlePricing([{ unitPrice: BUNDLE_MINIMUM, qty: 1 }], 0).meetsMinimum).toBe(true);
  });
  it("empaque negativo se trata como 0 y redondea a 2 decimales", () => {
    const p = computeBundlePricing([{ unitPrice: 3333.333, qty: 3 }], -50);
    expect(p.packagingFee).toBe(0);
    expect(p.productsTotal).toBe(10000);
  });
});

describe("normalizeSelection", () => {
  it("une variantes repetidas y valida cantidades enteras >= 1", () => {
    expect(normalizeSelection([{ variantId: "00000000-0000-4000-8000-00000000000a", qty: 1 }, { variantId: "00000000-0000-4000-8000-00000000000a", qty: 2 }, { variantId: "00000000-0000-4000-8000-00000000000b", qty: 1 }])).toEqual([
      { variantId: "00000000-0000-4000-8000-00000000000a", qty: 3 },
      { variantId: "00000000-0000-4000-8000-00000000000b", qty: 1 },
    ]);
  });
  it.each([
    [null],
    [[]],
    ["x"],
    [[{ variantId: "00000000-0000-4000-8000-00000000000a", qty: 0 }]],
    [[{ variantId: "00000000-0000-4000-8000-00000000000a", qty: 1.5 }]],
    [[{ variantId: "00000000-0000-4000-8000-00000000000a", qty: -1 }]],
    [[{ variantId: "", qty: 1 }]],
    [[{ variantId: 5, qty: 1 }]],
    [[null]],
  ])("rechaza entrada inválida %j", (input) => {
    expect(normalizeSelection(input)).toBeNull();
  });
  it("rechaza más del tope de unidades", () => {
    expect(normalizeSelection([{ variantId: "00000000-0000-4000-8000-00000000000a", qty: MAX_BUNDLE_UNITS + 1 }])).toBeNull();
    expect(normalizeSelection([{ variantId: "00000000-0000-4000-8000-00000000000a", qty: MAX_BUNDLE_UNITS }])).not.toBeNull();
  });
});

describe("isBundleKind / bundleSummary", () => {
  it("solo ramo y box", () => {
    expect(isBundleKind("ramo")).toBe(true);
    expect(isBundleKind("box")).toBe(true);
    expect(isBundleKind("combo")).toBe(false);
  });
  it("detalle solo para regalos armados, null para combos curados", () => {
    const items = [{ qty: 2, variant: { name: "Rosa", sku: "LAB-0007", product: { name: "Labial" } } }];
    expect(bundleSummary("ramo", items)).toBe("2× Labial – Rosa (LAB-0007)");
    expect(bundleSummary(null, items)).toBeNull();
  });
});
