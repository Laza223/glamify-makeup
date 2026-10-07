import { describe, it, expect, vi } from "vitest";
import { resendGiftCardEmail, type GiftCardMailDeps } from "@/lib/admin/orders/gift-cards";

const NOW = new Date("2026-10-07T12:00:00Z");
const future = new Date("2027-04-07T12:00:00Z");
const card = (over: Record<string, unknown> = {}) => ({ code: "GIFT-AAAA-BBBB", value: 20000, active: true, usedCount: 0, maxUses: 1, validTo: future, ...over });

function makeDeps(cards: Array<ReturnType<typeof card>>, order: { orderNumber: string; contactName: string; contactEmail: string } | null = { orderNumber: "GLM-000050", contactName: "Ana", contactEmail: "ana@example.com" }) {
  const sendEmail = vi.fn(async () => ({ id: null, logged: true }));
  const deps: GiftCardMailDeps = {
    db: { order: { findUnique: vi.fn(async () => order) }, coupon: { findMany: vi.fn(async () => cards) } } as never,
    sendEmail,
    getWhatsappUrl: vi.fn(async () => null),
    now: NOW,
  };
  return { deps, sendEmail };
}

describe("resendGiftCardEmail", () => {
  it("reenvía a contactEmail solo las gift cards sin usar, sin anular y sin vencer", async () => {
    const { deps, sendEmail } = makeDeps([
      card({ code: "GIFT-1111-1111" }),
      card({ code: "GIFT-2222-2222", usedCount: 1 }),
      card({ code: "GIFT-3333-3333", active: false }),
      card({ code: "GIFT-4444-4444", validTo: new Date("2026-10-01T00:00:00Z") }),
    ]);
    const r = await resendGiftCardEmail("ord-1", deps);
    expect(r.sent).toBe(1);
    const mail = (sendEmail.mock.calls as unknown as Array<[{ to: string; subject: string; html: string }]>)[0][0];
    expect(mail.to).toBe("ana@example.com");
    expect(mail.subject).toBe("Tu Gift Card Glamify");
    expect(mail.html).toContain("GIFT-1111-1111");
    expect(mail.html).not.toContain("GIFT-2222-2222");
    expect(mail.html).not.toContain("GIFT-3333-3333");
    expect(mail.html).not.toContain("GIFT-4444-4444");
  });

  it("sin gift cards utilizables → error claro y no manda nada", async () => {
    const { deps, sendEmail } = makeDeps([card({ usedCount: 1 })]);
    await expect(resendGiftCardEmail("ord-1", deps)).rejects.toThrow(/sin usar/i);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("pedido inexistente → error", async () => {
    const { deps } = makeDeps([], null);
    await expect(resendGiftCardEmail("nope", deps)).rejects.toThrow(/no existe/i);
  });
});
