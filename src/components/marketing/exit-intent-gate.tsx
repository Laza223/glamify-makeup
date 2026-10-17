import { getWelcomeCoupon } from "@/lib/coupons/welcome";
import { ExitIntent } from "@/components/marketing/exit-intent";

/**
 * El popup regala el cupón de bienvenida: si el cupón no existe o hoy no se puede usar
 * (inactivo, vencido, sin usos), no se muestra. Nada de prometer un descuento que falla al aplicarlo.
 */
export async function ExitIntentGate() {
  if (!(await getWelcomeCoupon())) return null;
  return <ExitIntent />;
}
