import type { PrismaClient } from "@prisma/client";

/** Los ramo/box se crean al sumarlos al carrito; los que nunca llegaron a un carrito o pedido se borran a los 2 días. */
const ORPHAN_AFTER_MS = 2 * 24 * 60 * 60 * 1000;

export async function runBundleCleanupJob({ db, now }: { db: Pick<PrismaClient, "combo">; now: Date }): Promise<{ deleted: number }> {
  const { count } = await db.combo.deleteMany({
    where: {
      bundleKind: { not: null },
      createdAt: { lt: new Date(now.getTime() - ORPHAN_AFTER_MS) },
      cartItems: { none: {} },
      orderItems: { none: {} },
    },
  });
  return { deleted: count };
}
