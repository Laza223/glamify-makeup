import { prisma } from "@/lib/prisma";
import { validateCoupon } from "@/lib/coupons/apply";

/**
 * Código del cupón de bienvenida (`NEXT_PUBLIC_WELCOME_COUPON_CODE`) solo si hoy se puede usar:
 * existe, está activo, en fecha y con usos. Si no, `null`: el popup no lo ofrece.
 * Mismo formato que al aplicarlo (`applyCouponAction` y el admin usan mayúsculas).
 */
export async function getWelcomeCoupon(): Promise<string | null> {
  const code = process.env.NEXT_PUBLIC_WELCOME_COUPON_CODE?.trim().toUpperCase();
  if (!code) return null;
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { code },
      select: { active: true, validFrom: true, validTo: true, maxUses: true, usedCount: true },
    });
    // Sin carrito no hay subtotal: el mínimo de compra se informa recién al aplicarlo.
    if (!coupon || !validateCoupon({ ...coupon, minSubtotal: null }, { subtotal: 0, now: new Date() }).ok) return null;
    return code;
  } catch (e) {
    console.error("[getWelcomeCoupon] no se pudo leer el cupón de bienvenida", e);
    return null;
  }
}
