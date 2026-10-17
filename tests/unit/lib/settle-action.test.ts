import { describe, it, expect } from "vitest";
import { settleAction, type ActionResult } from "@/lib/forms/action-result";

describe("settleAction", () => {
  it("deja pasar el resultado de la action", async () => {
    await expect(settleAction(Promise.resolve({ ok: true, ticket: "ARR-000001" }))).resolves.toEqual({ ok: true, ticket: "ARR-000001" });
    await expect(settleAction(Promise.resolve({ ok: false, error: "Ingresá un email válido." }))).resolves.toEqual({
      ok: false,
      error: "Ingresá un email válido.",
    });
  });

  it("si la action tira (red caída, 413) devuelve un fallo sin mensaje", async () => {
    await expect(settleAction(Promise.reject(new Error("Failed to fetch")))).resolves.toEqual({ ok: false });
  });

  it("si la action redirige (resuelve undefined) devuelve un fallo en vez de romper en res.ok", async () => {
    await expect(settleAction(Promise.resolve(undefined as unknown as ActionResult))).resolves.toEqual({ ok: false });
  });
});
