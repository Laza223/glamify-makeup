import { Truck, CreditCard, Sparkles } from "lucide-react";

const PROPS = [
  {
    icon: Sparkles,
    title: "Marcas que ya conocés",
    description:
      "TEI, Pink 21 y más, a precios accesibles.",
  },
  {
    icon: Truck,
    title: "Envíos a Todo el País",
    description:
      "Por Correo Argentino, a domicilio o sucursal, con número de seguimiento.",
  },
  {
    icon: CreditCard,
    title: "Pagá con Mercado Pago",
    description:
      "Con tarjeta de crédito, débito o dinero en cuenta.",
  },
];

export function ValueProps() {
  return (
    <section className="rounded-3xl border border-border/80 bg-white/70 p-6 shadow-soft backdrop-blur-md md:p-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-3">
        {PROPS.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title} className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/80 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h3 className="font-sans text-sm font-semibold tracking-tight text-foreground">
                  {p.title}
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {p.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
