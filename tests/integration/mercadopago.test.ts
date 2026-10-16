import { describe, it, expect, vi } from "vitest";
import { createPreference, getPayment, mpStatusToPaymentStatus } from "@/lib/payments/mercadopago";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) } as Response;
}

describe("createPreference", () => {
  it("postea a /checkout/preferences con Bearer y excluye efectivo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "pref-1", init_point: "https://mp/ip", sandbox_init_point: "https://mp/sbx" }));
    const pref = await createPreference(
      {
        orderId: "ord-1", orderNumber: "GLM-000001",
        items: [{ title: "Labial", quantity: 2, unit_price: 3200 }],
        payerEmail: "ana@example.com", appUrl: "https://app.test", notificationUrl: "https://app.test/api/webhooks/mercadopago",
      },
      { fetch: fetchMock, accessToken: "TEST-token" },
    );
    expect(pref.id).toBe("pref-1");
    expect(pref.sandbox_init_point).toBe("https://mp/sbx");
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain("/checkout/preferences");
    expect((opts as RequestInit).headers).toMatchObject({ Authorization: "Bearer TEST-token" });
    const body = JSON.parse((opts as RequestInit).body as string);
    expect(body.external_reference).toBe("ord-1");
    expect(body.payment_methods.excluded_payment_types).toEqual([{ id: "ticket" }, { id: "atm" }]);
    expect(body.notification_url).toContain("/api/webhooks/mercadopago");
    expect(body.auto_return).toBe("approved");
  });
  it("con expiresAt la preference vence a esa hora (ISO con offset de Argentina)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "pref-1", init_point: "https://mp/ip" }));
    await createPreference(
      {
        orderId: "o", orderNumber: "n", items: [], payerEmail: "e", appUrl: "u", notificationUrl: "w",
        expiresAt: new Date("2026-10-16T15:30:00.000Z"),
      },
      { fetch: fetchMock, accessToken: "t" },
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.expires).toBe(true);
    expect(body.expiration_date_to).toBe("2026-10-16T12:30:00.000-03:00");
    expect(body.expiration_date_from < body.expiration_date_to).toBe(true);
  });
  it("sin expiresAt no manda vencimiento", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "pref-1", init_point: "https://mp/ip" }));
    await createPreference({ orderId: "o", orderNumber: "n", items: [], payerEmail: "e", appUrl: "u", notificationUrl: "w" }, { fetch: fetchMock, accessToken: "t" });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.expires).toBeUndefined();
  });
  it("lanza si MP responde error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "bad" }, false, 400));
    await expect(
      createPreference(
        { orderId: "o", orderNumber: "n", items: [], payerEmail: "e", appUrl: "u", notificationUrl: "w" },
        { fetch: fetchMock, accessToken: "t" },
      ),
    ).rejects.toThrow();
  });
});

describe("getPayment", () => {
  it("GET /v1/payments/:id con Bearer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 123, status: "approved", external_reference: "ord-1", transaction_amount: 10900 }));
    const p = await getPayment("123", { fetch: fetchMock, accessToken: "t" });
    expect(p.status).toBe("approved");
    expect(p.external_reference).toBe("ord-1");
    expect(fetchMock.mock.calls[0][0]).toContain("/v1/payments/123");
  });
});

describe("mpStatusToPaymentStatus", () => {
  it("mapea los estados de MP al enum", () => {
    expect(mpStatusToPaymentStatus("approved")).toBe("approved");
    expect(mpStatusToPaymentStatus("rejected")).toBe("rejected");
    expect(mpStatusToPaymentStatus("in_process")).toBe("in_process");
    expect(mpStatusToPaymentStatus("pending")).toBe("pending");
    expect(mpStatusToPaymentStatus("refunded")).toBe("refunded");
    expect(mpStatusToPaymentStatus("cancelled")).toBe("cancelled");
    expect(mpStatusToPaymentStatus("charged_back")).toBe("refunded");
    expect(mpStatusToPaymentStatus("in_mediation")).toBe("in_process");
  });
});
