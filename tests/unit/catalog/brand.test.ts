import { describe, it, expect } from "vitest";
import { detectBrand } from "@/lib/catalog/brand";

describe("detectBrand (marca a partir del nombre del producto)", () => {
  it("encuentra las marcas conocidas sin importar mayúsculas", () => {
    expect(detectBrand("Gloss Espejo PINK 21")).toBe("Pink 21");
    expect(detectBrand("Corrector Líquido Multiuso 4 Angels")).toBe("4 Angels");
    expect(detectBrand("Labial Mate TEI")).toBe("TEI");
    expect(detectBrand("Gel Fijador Cejas y Pestañas MELY")).toBe("MELY");
    expect(detectBrand("Manteca Karite")).toBe("Karité");
    expect(detectBrand("Base Ruby Rose")).toBe("Ruby Rose");
  });

  it("no confunde una marca con parte de otra palabra", () => {
    expect(detectBrand("Brillo Labial de Sabores Teinte")).toBeNull();
    expect(detectBrand("Familia de productos")).toBeNull();
  });

  it("devuelve null si no hay marca conocida", () => {
    expect(detectBrand("Arqueador de pestañas con brillos")).toBeNull();
  });
});
