import { describe, it, expect } from "vitest";
import { toMetaDescription } from "@/lib/seo/meta-description";

describe("toMetaDescription", () => {
  it("saca emojis y saltos de línea", () => {
    expect(toMetaDescription("💋 Lip Combo – Delineador + Gloss\nEl dúo ideal. 💗")).toBe("Lip Combo – Delineador + Gloss El dúo ideal.");
  });

  it("deja igual un texto corto", () => {
    expect(toMetaDescription("Gloss de acabado espejo.")).toBe("Gloss de acabado espejo.");
  });

  it("corta en límite de palabra sin pasar el máximo", () => {
    const long = "palabra ".repeat(40);
    const out = toMetaDescription(long)!;
    expect(out.length).toBeLessThanOrEqual(155);
    expect(out.endsWith("palabra…")).toBe(true);
  });

  it("null si no hay texto o solo emojis", () => {
    expect(toMetaDescription(null)).toBeNull();
    expect(toMetaDescription(" ✨💗 ")).toBeNull();
  });
});
