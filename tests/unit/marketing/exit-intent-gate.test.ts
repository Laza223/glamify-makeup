import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as React from "react";

// Vitest compila TSX con el runtime clásico (tsconfig jsx: preserve): los componentes esperan `React` global.
(globalThis as { React?: unknown }).React = React;

const findUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { coupon: { findUnique: (...a: unknown[]) => findUnique(...a) } } }));

const { ExitIntentGate } = await import("@/components/marketing/exit-intent-gate");

const base = { active: true, validFrom: null, validTo: null, maxUses: null, usedCount: 0 };

describe("ExitIntentGate", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_WELCOME_COUPON_CODE", "BIENVENIDA10");
    findUnique.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.unstubAllEnvs());

  it("con el cupón vigente muestra el popup", async () => {
    findUnique.mockResolvedValue(base);
    expect(await ExitIntentGate()).not.toBeNull();
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { code: "BIENVENIDA10" } }));
  });

  it.each([
    ["inactivo", { ...base, active: false }],
    ["vencido", { ...base, validTo: new Date("2020-01-01") }],
    ["sin usos", { ...base, maxUses: 5, usedCount: 5 }],
    ["inexistente", null],
  ])("con el cupón %s no lo muestra", async (_label, coupon) => {
    findUnique.mockResolvedValue(coupon);
    expect(await ExitIntentGate()).toBeNull();
  });

  it("busca el código en mayúsculas, como lo guarda el admin y lo aplica el carrito", async () => {
    vi.stubEnv("NEXT_PUBLIC_WELCOME_COUPON_CODE", " bienvenida10 ");
    findUnique.mockResolvedValue(base);
    expect(await ExitIntentGate()).not.toBeNull();
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { code: "BIENVENIDA10" } }));
  });

  it("sin cupón configurado no consulta la base", async () => {
    vi.stubEnv("NEXT_PUBLIC_WELCOME_COUPON_CODE", "");
    expect(await ExitIntentGate()).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("si la base falla no rompe la página: no lo muestra", async () => {
    findUnique.mockRejectedValue(new Error("db caída"));
    expect(await ExitIntentGate()).toBeNull();
  });
});
