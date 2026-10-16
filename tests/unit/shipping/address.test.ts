import { describe, it, expect } from "vitest";
import { validateShippingAddress, normalizeDni, sanitizeAddress } from "@/lib/shipping/address";

const ok = { cp: "6700", province: "Buenos Aires", city: "Luján", street: "Calle", number: "123", dni: "30123456" };

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
  it("sucursal pide CP, localidad y provincia (sin elegir sucursal ni calle/número)", () => {
    const suc = { cp: "6700", province: "Buenos Aires", city: "Luján", dni: "30123456" };
    expect(validateShippingAddress("sucursal", suc)).toBeNull();
    expect(validateShippingAddress("sucursal", { ...suc, province: "" })).toMatch(/provincia/i);
    expect(validateShippingAddress("sucursal", { ...suc, city: "" })).toMatch(/localidad/i);
    expect(validateShippingAddress("sucursal", { ...suc, cp: "12" })).toMatch(/código postal/i);
  });
  it("el DNI es obligatorio (7 u 8 dígitos) en domicilio y sucursal", () => {
    for (const method of ["domicilio", "sucursal"] as const) {
      expect(validateShippingAddress(method, { ...ok, dni: undefined })).toMatch(/DNI/);
      expect(validateShippingAddress(method, { ...ok, dni: "" })).toMatch(/DNI/);
      expect(validateShippingAddress(method, { ...ok, dni: "123456" })).toMatch(/DNI/);
      expect(validateShippingAddress(method, { ...ok, dni: "123456789" })).toMatch(/DNI/);
      expect(validateShippingAddress(method, { ...ok, dni: "abcdefgh" })).toMatch(/DNI/);
    }
    expect(validateShippingAddress("domicilio", { ...ok, dni: "1234567" })).toBeNull();
  });
  it("acepta el DNI con puntos, espacios o guiones", () => {
    expect(validateShippingAddress("domicilio", { ...ok, dni: "30.123.456" })).toBeNull();
    expect(validateShippingAddress("domicilio", { ...ok, dni: " 30 123 456 " })).toBeNull();
  });
});

describe("normalizeDni", () => {
  it("saca puntos, espacios y guiones", () => {
    expect(normalizeDni("30.123.456")).toBe("30123456");
    expect(normalizeDni(" 30-123 456 ")).toBe("30123456");
    expect(normalizeDni(undefined)).toBe("");
  });
});

describe("sanitizeAddress", () => {
  it("guarda solo las claves permitidas y el DNI normalizado", () => {
    const hostile = { ...ok, dni: "30.123.456", floorApt: "2B", notes: "timbre", agency: "X", isAdmin: true } as never;
    const out = sanitizeAddress(hostile);
    expect(Object.keys(out).sort()).toEqual(["city", "cp", "dni", "floorApt", "notes", "number", "province", "street"]);
    expect(out.dni).toBe("30123456");
  });
});
