import Link from "next/link";
import Image from "next/image";
import { HangingTag } from "@/components/catalog/hanging-tag";
import { productImageUrl } from "@/lib/images";
import { getEffectivePrice } from "@/lib/catalog/pricing";
import { formatPrice } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/lib/catalog/types";

/**
 * Cartel de cartulina: placa plana, radio 14, inclinación leve. Los tres carteles de la triple B tienen
 * el mismo tamaño a propósito: "Barato." nunca grita más que "Bueno." y "Bonito." (contrato de dirección).
 */
function Cartel({ word, tilt, className, children }: { word: string; tilt: number; className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-[14px] bg-white px-4 py-3 shadow-[0_6px_16px_-6px_hsl(var(--accent)/0.3)] md:px-6 md:py-4",
        className,
      )}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <p className="shrink-0 font-display text-[34px] font-semibold leading-none text-foreground md:text-[52px] lg:text-[60px]">{word}</p>
      <div className="min-w-0 text-right">{children}</div>
    </div>
  );
}

/** Hero de la home: campo de cartulina a sangre con la triple B y su prueba (marcas, fotos y precio reales). */
export function FeriaHero({ brands, showcase, fromPrice }: { brands: string[]; showcase: CatalogProduct[]; fromPrice: number | null }) {
  // Mobile: 3 fotos en el cartel. Desktop: la mesa muestra otros 4, para no repetir la prueba.
  const thumbs = showcase.slice(0, 3);
  // Con catálogo chico no alcanzan 7 fotos distintas: en desktop el cartel queda sin fotos y la mesa hace de prueba.
  const distinct = showcase.length >= 7;
  const mesa = distinct ? showcase.slice(3, 7) : showcase.slice(0, 4);

  return (
    <section
      aria-labelledby="hero-title"
      className="-mt-4 bg-secondary py-6 shadow-[0_0_0_100vmax_hsl(var(--secondary))] [clip-path:inset(0_-100vmax)] md:py-12"
    >
      <h1 id="hero-title" className="sr-only">
        Glamify Makeup: bueno, bonito y barato
      </h1>
      <div className="grid items-center gap-8 [&>*]:min-w-0 md:grid-cols-2 lg:grid-cols-[minmax(0,600px)_minmax(0,500px)] lg:justify-center lg:gap-16">
        <div className="max-w-[600px]">
          <div className="space-y-3 md:space-y-4">
            <Cartel word="Bueno." tilt={-1.5}>
              <p className="text-[15px] font-medium leading-snug text-foreground md:text-[17px]">
                {brands.join(" · ")}
                <span className="block text-muted-foreground">y más marcas</span>
              </p>
            </Cartel>
            <Cartel word="Bonito." tilt={1} className="ml-4 md:ml-10">
              <ul className={cn("flex gap-1.5", !distinct && "md:hidden")} aria-label="Algunos productos de la tienda">
                {thumbs.map((p) => {
                  const url = productImageUrl(p.images[0]);
                  return url ? (
                    <li key={p.id} className="relative size-11 overflow-hidden rounded-[8px] bg-muted md:size-14">
                      <Image src={url} alt={p.name} fill sizes="56px" className="object-cover" />
                    </li>
                  ) : null;
                })}
              </ul>
            </Cartel>
            {fromPrice !== null && (
              <Cartel word="Barato." tilt={-0.75} className="ml-2 md:ml-4">
                <p className="text-[15px] font-medium leading-snug text-muted-foreground md:text-[17px]">
                  desde
                  <span className="block tabular-nums text-foreground">{formatPrice(fromPrice)}</span>
                </p>
              </Cartel>
            )}
          </div>

          <Link
            href="/tienda"
            className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-[14px] bg-primary px-8 text-[16px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-secondary sm:w-auto"
          >
            Ver la tienda
          </Link>
        </div>

        {/* La mesa: producto real con su etiqueta de precio real. Solo desktop. */}
        <ul className="ml-auto hidden w-full max-w-[500px] lg:ml-0 grid-cols-2 gap-x-5 gap-y-6 pb-6 pt-3 md:grid" aria-label="En la mesa hoy">
          {mesa.map((p, i) => {
            const url = productImageUrl(p.images[0]);
            return (
              <li key={p.id} className={cn("relative", i % 2 === 1 && "translate-y-6")}>
                <Link
                  href={`/producto/${p.slug}`}
                  className="block overflow-hidden rounded-[14px] bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="relative block aspect-square">
                    {url && <Image src={url} alt={p.name} fill sizes="(min-width: 1024px) 240px, 40vw" className="object-cover" priority={i < 2} />}
                  </span>
                </Link>
                <HangingTag className="top-0">{formatPrice(getEffectivePrice(p))}</HangingTag>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
