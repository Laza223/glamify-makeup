/** Superficie mínima de DB para contar los canjes de una clienta (inyectable en tests). */
export interface RedemptionDb {
  couponRedemption: {
    findUnique: (args: {
      where: { customerId_couponId: { customerId: string; couponId: string } };
    }) => Promise<{ redeemedCount: number } | null>;
  };
}

/**
 * Canjes previos de la clienta para `perCustomerLimit`. Lo usan carrito, aplicar cupón y checkout
 * con el mismo criterio: si no, el carrito muestra un descuento que el checkout rechaza.
 */
export async function loadCustomerRedemptions(
  db: RedemptionDb,
  customerId: string | null | undefined,
  coupon: { id: string; perCustomerLimit: number | null },
): Promise<number> {
  if (!customerId || coupon.perCustomerLimit == null) return 0;
  const r = await db.couponRedemption.findUnique({
    where: { customerId_couponId: { customerId, couponId: coupon.id } },
  });
  return r?.redeemedCount ?? 0;
}
