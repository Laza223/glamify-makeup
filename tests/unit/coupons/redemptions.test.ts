import { describe, it, expect, vi } from "vitest";
import { loadCustomerRedemptions } from "@/lib/coupons/redemptions";

const db = (redeemedCount: number | null) => ({
  couponRedemption: { findUnique: vi.fn(async () => (redeemedCount == null ? null : { redeemedCount })) },
});

describe("loadCustomerRedemptions", () => {
  it("devuelve los canjes previos de la clienta", async () => {
    expect(await loadCustomerRedemptions(db(2), "u1", { id: "c1", perCustomerLimit: 3 })).toBe(2);
  });

  it("0 si no hay historial, si es invitada o si el cupón no tiene límite (sin consultar)", async () => {
    expect(await loadCustomerRedemptions(db(null), "u1", { id: "c1", perCustomerLimit: 3 })).toBe(0);
    const d = db(5);
    expect(await loadCustomerRedemptions(d, null, { id: "c1", perCustomerLimit: 3 })).toBe(0);
    expect(await loadCustomerRedemptions(d, "u1", { id: "c1", perCustomerLimit: null })).toBe(0);
    expect(d.couponRedemption.findUnique).not.toHaveBeenCalled();
  });
});
