import { describe, it, expect } from "vitest";
import { generateGiftCardCode, GIFT_CARD_CODE_ALPHABET } from "@/lib/coupons/gift-card-code";
import { addMonthsUtc, giftCardStatus, formatGiftCardDate } from "@/lib/coupons/gift-card";

describe("generateGiftCardCode", () => {
  it("formato GIFT-XXXX-XXXX y cumple la validación de códigos del admin", () => {
    const code = generateGiftCardCode();
    expect(code).toMatch(/^GIFT-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(code).toMatch(/^[A-Z0-9-]+$/);
  });
  it("no usa caracteres ambiguos (0, O, 1, I)", () => {
    expect(GIFT_CARD_CODE_ALPHABET).not.toMatch(/[01OI]/);
    for (let i = 0; i < 300; i++) expect(generateGiftCardCode().slice(5)).not.toMatch(/[01OI]/);
  });
  it("no repite en una tanda grande", () => {
    const codes = new Set(Array.from({ length: 2000 }, () => generateGiftCardCode()));
    expect(codes.size).toBe(2000);
  });
});

describe("addMonthsUtc", () => {
  it("suma 6 meses", () => {
    expect(addMonthsUtc(new Date("2026-10-07T12:00:00Z"), 6).toISOString()).toBe("2027-04-07T12:00:00.000Z");
  });
  it("cae al último día del mes destino si el día no existe", () => {
    expect(addMonthsUtc(new Date("2026-08-31T12:00:00Z"), 6).toISOString()).toBe("2027-02-28T12:00:00.000Z");
  });
  it("cruza de año", () => {
    expect(addMonthsUtc(new Date("2026-12-15T00:00:00Z"), 6).toISOString()).toBe("2027-06-15T00:00:00.000Z");
  });
  it("no muta la fecha original", () => {
    const d = new Date("2026-10-07T12:00:00Z");
    addMonthsUtc(d, 6);
    expect(d.toISOString()).toBe("2026-10-07T12:00:00.000Z");
  });
});

describe("giftCardStatus", () => {
  const now = new Date("2026-10-07T12:00:00Z");
  const card = { active: true, usedCount: 0, maxUses: 1, validTo: new Date("2027-04-07T12:00:00Z") };
  it("sin usar", () => expect(giftCardStatus(card, now)).toBe("unused"));
  it("usada", () => expect(giftCardStatus({ ...card, usedCount: 1 }, now)).toBe("used"));
  it("anulada", () => expect(giftCardStatus({ ...card, active: false }, now)).toBe("voided"));
  it("vencida", () => expect(giftCardStatus({ ...card, validTo: new Date("2026-10-01T00:00:00Z") }, now)).toBe("expired"));
  it("usada gana sobre anulada", () => expect(giftCardStatus({ ...card, usedCount: 1, active: false }, now)).toBe("used"));
});

describe("formatGiftCardDate", () => {
  it("dd/mm/aaaa en hora de Argentina", () => {
    // 01:00 UTC del 8 = 22:00 ART del 7
    expect(formatGiftCardDate(new Date("2027-04-08T01:00:00Z"))).toBe("07/04/2027");
  });
});
