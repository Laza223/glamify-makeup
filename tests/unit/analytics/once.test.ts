import { describe, it, expect } from "vitest";
import { claimOnce } from "@/lib/analytics/once";

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe("claimOnce", () => {
  it("devuelve true la primera vez y false las siguientes para la misma clave", () => {
    const s = memoryStorage();
    expect(claimOnce(() => s, "purchase:GLM-0001")).toBe(true);
    expect(claimOnce(() => s, "purchase:GLM-0001")).toBe(false);
  });

  it("claves distintas son independientes", () => {
    const s = memoryStorage();
    expect(claimOnce(() => s, "purchase:GLM-0001")).toBe(true);
    expect(claimOnce(() => s, "purchase:GLM-0002")).toBe(true);
  });

  it("si el storage falla (modo privado), no bloquea el evento", () => {
    const broken = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
    };
    expect(claimOnce(() => broken, "purchase:GLM-0001")).toBe(true);
  });

  it("si acceder al storage tira (SecurityError), no bloquea el evento", () => {
    const getStorage = (): Storage => {
      throw new Error("SecurityError");
    };
    expect(claimOnce(getStorage, "purchase:GLM-0001")).toBe(true);
  });
});
