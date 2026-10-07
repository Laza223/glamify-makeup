import { describe, it, expect } from "vitest";
import { validateShippingAddress } from "@/lib/shipping/address";

const ok = { cp: "6700", city: "Luján", street: "Calle", number: "123" };

describe("validateShippingAddress", () => {
  it("domicilio completo → válida", () => {
    expect(validateShippingAddress("domicilio", ok)).toBeNull();
  });
  it("CP inválido", () => {
    expect(validateShippingAddress("domicilio", { ...ok, cp: "67" })).toMatch(/código postal/i);
    expect(validateShippingAddress("domicilio", { ...ok, cp: "" })).toMatch(/código postal/i);
  });
  it("sin localidad", () => {
    expect(validateShippingAddress("domicilio", { ...ok, city: "  " })).toMatch(/localidad/i);
  });
  it("domicilio sin calle o sin número", () => {
    expect(validateShippingAddress("domicilio", { ...ok, street: "" })).toMatch(/calle y número/i);
    expect(validateShippingAddress("domicilio", { ...ok, number: undefined })).toMatch(/calle y número/i);
  });
  it("sucursal pide la sucursal, no calle/número", () => {
    expect(validateShippingAddress("sucursal", { cp: "6700", city: "Luján" })).toMatch(/sucursal/i);
    expect(validateShippingAddress("sucursal", { cp: "6700", city: "Luján", agencyCode: "S123" })).toBeNull();
  });
});
