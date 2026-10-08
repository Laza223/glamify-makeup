import { CreditCard, PackageCheck, Truck } from "lucide-react";
import { formatPrice } from "@/lib/money";

/** Datos reales de compra en la ficha (sin promesas de política: esas viven en sus páginas). */
export function TrustBadges({ freeShippingThreshold }: { freeShippingThreshold: number }) {
  const items = [
    { icon: Truck, text: `Envío a todo el país · gratis desde ${formatPrice(freeShippingThreshold)}` },
    { icon: PackageCheck, text: "Lo despachamos en hasta 3 días hábiles" },
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
