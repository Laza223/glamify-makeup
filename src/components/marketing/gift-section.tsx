import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Gift,
  Heart,
  Package,
  Flower2,
} from "lucide-react";

interface GiftItem {
  id: string;
  title: string;
  badge: string;
  description: string;
  href: string;
  icon: typeof Gift;
  image?: string;
  gradient: string;
}

const GIFT_ITEMS: GiftItem[] = [
  {
    id: "lip-combos",
    title: "Lip Combos",
    badge: "Combinados",
    description:
      "Delineador, labial y gloss combinados para regalar o regalarte.",
    href: "/tienda/labios",
    icon: Sparkles,
    image: "/images/product_lipstick.png",
    gradient: "from-rose-500/10 to-pink-500/5",
  },
  {
    id: "gift-cards",
    title: "Gift Cards",
    badge: "Regalo Seguro",
    description:
      "La tarjeta de regalo perfecta para que esa persona especial elija sus productos favoritos.",
    href: "/tienda/gift-cards",
    icon: Gift,
    image: "/images/exit_modal_visual.jpg",
    gradient: "from-purple-500/10 to-pink-500/5",
  },
  {
    id: "ramos-maquillaje",
    title: "Ramos de Maquillaje",
    badge: "A pedido",
    description:
      "Presentaciones tipo ramo súper originales armadas con los mejores cosméticos y detalles girly.",
    href: "/tienda/ramos-maquillaje",
    icon: Flower2,
    image: "/images/hero_editorial_glow.jpg",
    gradient: "from-amber-500/10 to-rose-500/5",
  },
  {
    id: "box-maquillaje",
    title: "Box de Maquillaje",
    badge: "Set Completo",
    description:
      "Cajas temáticas con mix de productos seleccionados para armar looks deslumbrantes.",
    href: "/tienda/box-maquillaje",
    icon: Package,
    image: "/images/product_brushes.png",
    gradient: "from-pink-500/10 to-rose-500/5",
  },
];

export function GiftSection() {
  return (
    <section className="space-y-8">
      <div className="flex flex-col justify-between gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary">
            <Heart className="size-3.5 fill-primary" />
            <span>Especial Regalos</span>
          </div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-foreground sm:text-3xl md:text-4xl">
            Regalá beauty, regalá Glamify
          </h2>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Sorprendé a quien más querés con los detalles más lindos y
            especiales
          </p>
        </div>
        <Link
          href="/tienda/especial-regalos"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary hover:underline"
        >
          <span>Ver todas las opciones</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {GIFT_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-white/90 p-6 shadow-soft transition-all duration-300 hover:border-primary/40 hover:shadow-soft-lg"
            >
              {/* Fondo suave con degradé */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-60 transition-opacity group-hover:opacity-100`}
              />

              <div className="relative z-10 space-y-4">
                {/* Header de la tarjeta */}
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-2xl border border-pink-100 bg-white text-primary shadow-soft transition-transform duration-300 group-hover:scale-110">
                    <Icon className="size-5" />
                  </div>
                  <span className="shadow-xs inline-flex items-center rounded-full border border-border/60 bg-white/90 px-2.5 py-1 text-[11px] font-bold text-foreground/80">
                    {item.badge}
                  </span>
                </div>

                {/* Título y descripción */}
                <div className="space-y-1.5">
                  <h3 className="font-display text-xl font-bold text-foreground transition-colors group-hover:text-primary">
                    {item.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Botón de acción inferior */}
              <div className="relative z-10 mt-auto flex items-center gap-1 pt-5 text-xs font-bold text-primary transition-colors group-hover:text-foreground">
                <span>Ver opciones</span>
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
