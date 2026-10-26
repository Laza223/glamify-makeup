import { describe, it, expect, vi } from "vitest";
import { runBundleCleanupJob } from "@/lib/bundle/cleanup-job";

describe("runBundleCleanupJob", () => {
  it("borra solo bundles viejos sin carrito ni pedido", async () => {
    const deleteMany = vi.fn(async () => ({ count: 3 }));
    const now = new Date("2026-10-26T12:00:00Z");
    const res = await runBundleCleanupJob({ db: { combo: { deleteMany } } as never, now });
    expect(res).toEqual({ deleted: 3 });
    const where = (deleteMany.mock.calls[0] as unknown as [{ where: Record<string, unknown> }])[0].where;
    expect(where).toMatchObject({ bundleKind: { not: null }, cartItems: { none: {} }, orderItems: { none: {} } });
    expect((where.createdAt as { lt: Date }).lt.toISOString()).toBe("2026-10-24T12:00:00.000Z");
  });
});
