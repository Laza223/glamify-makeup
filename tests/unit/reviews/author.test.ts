import { describe, it, expect } from "vitest";
import { publicAuthorName } from "@/lib/reviews/author";

describe("publicAuthorName", () => {
  it("devuelve el nombre", () => {
    expect(publicAuthorName(" Ana ")).toBe("Ana");
  });
  it("sin nombre → Clienta", () => {
    expect(publicAuthorName(null)).toBe("Clienta");
    expect(publicAuthorName(undefined)).toBe("Clienta");
    expect(publicAuthorName("  ")).toBe("Clienta");
  });
  it("enmascara valores que parecen email", () => {
    expect(publicAuthorName("ana@gmail.com")).toBe("Clienta");
  });
});
