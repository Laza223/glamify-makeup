import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const abandoned = vi.fn();
const expiry = vi.fn();
const tracking = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/email/resend", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/email/whatsapp-url", () => ({ storeWhatsappUrl: vi.fn() }));
vi.mock("@/lib/cart/abandoned-job", () => ({ runAbandonedCartJob: (...a: unknown[]) => abandoned(...a) }));
vi.mock("@/lib/orders/expiry-job", () => ({ runOrderExpiryJob: (...a: unknown[]) => expiry(...a) }));
vi.mock("@/lib/bundle/cleanup-job", () => ({ runBundleCleanupJob: async () => ({ deleted: 0 }) }));
vi.mock("@/lib/shipping/tracking-job", () => ({ runShipmentTrackingJob: (...a: unknown[]) => tracking(...a) }));

import { GET } from "@/app/api/cron/route";

function req(): Request {
  return new Request("http://localhost/api/cron", { headers: { authorization: "Bearer s3cret" } });
}

describe("GET /api/cron", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    abandoned.mockResolvedValue({ sent: 0 });
    expiry.mockResolvedValue({ cancelled: 0 });
    tracking.mockResolvedValue({ checked: 0 });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("200 cuando todos los jobs andan", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("500 si un job falla, pero los demás corren igual", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expiry.mockRejectedValue(new Error("boom"));
    const res = await GET(req());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.expiry).toEqual({ error: "Error: boom" });
    expect(abandoned).toHaveBeenCalled();
    expect(tracking).toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();
  });
});
