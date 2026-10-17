import { prisma } from "@/lib/prisma";
import { validateCoupon } from "@/lib/coupons/apply";
import { ExitIntent } from "@/components/marketing/exit-intent";

/**
 * El popup regala el cupón de bienvenida: si el cupón no existe o hoy no se puede usar
 * (inactivo, vencido, sin usos), no se muestra. Nada de prometer un descuento que falla al aplicarlo.
 */
export async function ExitIntentGate() {
  const code = process.env.NEXT_PUBLIC_WELCOME_COUPON_CODE?.trim();
  if (!code) return null;
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { code },
      select: { active: true, validFrom: true, validTo: true, maxUses: true, usedCount: true },
    });
    // Sin carrito no hay subtotal: el mínimo de compra se informa recién al aplicarlo.
    if (!coupon || !validateCoupon({ ...coupon, minSubtotal: null }, { subtotal: 0, now: new Date() }).ok) return null;
  } catch (e) {
    console.error("[ExitIntentGate] no se pudo leer el cupón de bienvenida", e);
    return null;
  }
  return <ExitIntent />;
}
