import { CreditCard, PackageCheck, Truck } from "lucide-react";
import { formatPrice } from "@/lib/money";
import { businessInfo } from "@/lib/legal/business-info";

/** Datos reales de compra en la ficha (sin promesas de política: esas viven en sus páginas). */
export function TrustBadges({ freeShippingThreshold, soldOut = false }: { freeShippingThreshold: number; soldOut?: boolean }) {
  const items = [
    {
      icon: Truck,
      // Umbral 0 = sin umbral cargado: no se muestra "gratis desde $0".
      text:
        freeShippingThreshold > 0
          ? `Envío a todo el país · gratis desde ${formatPrice(freeShippingThreshold)}`
          : "Envío a todo el país",
    },
    // Sin stock no hay despacho que prometer.
    ...(soldOut ? [] : [{ icon: PackageCheck, text: `Lo despachamos en ${businessInfo.dispatchWindow}` }]),
    { icon: CreditCard, text: "Pagás con Mercado Pago: tarjeta o dinero en cuenta" },
  ];
  return (
    <ul className="space-y-2.5 rounded-[18px] bg-secondary p-4">
      {items.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-3 text-[15px] text-foreground">
          <Icon className="size-5 shrink-0 text-primary" aria-hidden />
          {text}
        </li>
      ))}
    </ul>
  );
}
