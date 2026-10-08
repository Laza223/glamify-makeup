import { Heart, CreditCard, PackageCheck, Truck } from "lucide-react";
import { formatPrice } from "@/lib/money";

/**
 * "Comprar es re fácil": el recorrido real de una compra en 4 pasos, unidos por una línea rosa
 * que se dibuja al scrollear (CSS `.draw-line`; sin soporte o con reduced-motion se ve completa).
 */
export function HowItWorks({ threshold, brands }: { threshold: number; brands: string[] }) {
  const steps = [
    {
      icon: Heart,
      t: "Elegís tus favoritos",
      d: brands.length > 0 ? `Por categoría o por marca: ${brands.join(", ")} y más.` : "Por categoría o por marca.",
    },
    { icon: CreditCard, t: "Pagás en un toque", d: "Con Mercado Pago: tarjeta o dinero en cuenta, en un solo paso." },
    { icon: PackageCheck, t: "Lo armamos en Luján", d: "Y lo despachamos en hasta 3 días hábiles." },
    { icon: Truck, t: "Te llega", d: `A tu casa o a la sucursal de Correo Argentino. Gratis desde ${formatPrice(threshold)}.` },
  ];

  return (
    <section aria-labelledby="como-compras" className="space-y-10">
      <h2 id="como-compras" className="font-display text-[30px] font-normal leading-tight text-foreground md:text-[42px]">
        Comprar es <em className="font-medium text-primary">re fácil</em>
      </h2>

      <ol className="relative grid gap-8 md:grid-cols-4 md:gap-6">
        {steps.map(({ icon: Icon, t, d }, i) => (
          <li key={t} className="group/step relative flex gap-5 md:flex-col md:gap-5">
            {/* Tramo hasta el paso siguiente: vertical en mobile (cruza el gap de 32 px), horizontal en desktop (gap de 24 px). */}
            {i < steps.length - 1 && (
              <>
                <span aria-hidden className="absolute -bottom-8 left-[21px] top-11 w-0.5 bg-border md:hidden" />
                <span aria-hidden className="draw-line-y absolute -bottom-8 left-[21px] top-11 w-0.5 origin-top bg-primary md:hidden" />
                <span aria-hidden className="absolute left-11 top-[21px] hidden h-0.5 w-[calc(100%-20px)] bg-border md:block" />
                <span aria-hidden className="draw-line-x absolute left-11 top-[21px] hidden h-0.5 w-[calc(100%-20px)] origin-left bg-primary md:block" />
              </>
            )}
            <span className="relative z-10 grid size-11 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground ring-[6px] ring-white transition-transform duration-300 group-hover/step:scale-110">
              {i + 1}
            </span>
            <span className="pt-1.5 md:pt-0">
              <span className="flex items-center gap-2 text-[17px] font-bold text-foreground">
                {t}
                <Icon
                  className="size-[18px] text-primary transition-transform duration-300 group-hover/step:-rotate-12 group-hover/step:scale-110"
                  aria-hidden
                />
              </span>
              <span className="mt-1 block max-w-[30ch] text-[16px] leading-relaxed text-muted-foreground">{d}</span>
            </span>
          </li>
        ))}
      </ol>

    </section>
  );
}
