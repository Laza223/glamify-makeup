import Link from "next/link";
import { ArrowRight, Truck, PackageCheck, CreditCard, RotateCcw } from "lucide-react";
import { ProductGrid } from "@/components/catalog/product-grid";
import { ProductImage } from "@/components/catalog/product-image";
import { GlamifyWelcomeBanner } from "@/components/marketing/glamify-welcome-banner";
import { BrandMarquee } from "@/components/marketing/brand-marquee";
import { getActiveProducts, getCategoryTree } from "@/lib/catalog/queries";
import { filterVisibleInNav } from "@/lib/catalog/categories";
import { isSellableNow } from "@/lib/catalog/showcase";
import { detectBrand } from "@/lib/catalog/brand";
import { getFreeShippingThreshold } from "@/lib/orders/checkout-data";
import { prisma } from "@/lib/prisma";
import { whatsappLink } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/money";
import { buildWebSiteJsonLd, buildOrganizationJsonLd, serializeJsonLd } from "@/lib/seo/jsonld";
import { appBaseUrl } from "@/lib/seo/url";
import type { CatalogProduct } from "@/lib/catalog/types";

/** Marcas con productos a la venta hoy, de la que más tiene a la que menos (dato real del catálogo). */
function topBrands(products: CatalogProduct[], n: number): string[] {
  const counts = new Map<string, number>();
  for (const p of products) {
    const b = detectBrand(p.name);
    if (b) counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([b]) => b);
}

/** Título de sección con la voz del hero: Playfair y una palabra en itálica rosa. */
function SectionTitle({ id, lead, accent, tail }: { id: string; lead?: string; accent: string; tail?: string }) {
  return (
    <h2 id={id} className="font-display text-[30px] font-normal leading-tight text-foreground md:text-[42px]">
      {lead && <>{lead} </>}
      <em className="font-medium text-primary">{accent}</em>
      {tail && <> {tail}</>}
    </h2>
  );
}

function SeeAll({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group/see inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[10px] text-[15px] font-semibold text-foreground hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
      <ArrowRight className="size-4 transition-transform group-hover/see:translate-x-1" aria-hidden />
    </Link>
  );
}

export default async function HomePage() {
  const [treeRaw, products, threshold, setting] = await Promise.all([
    getCategoryTree(),
    getActiveProducts(),
    getFreeShippingThreshold(),
    prisma.setting.findUnique({ where: { id: "default" }, select: { whatsappNumber: true } }),
  ]);
  const tree = filterVisibleInNav(treeRaw);
  const sellable = products.filter(isSellableNow);
  const featured = sellable.filter((p) => p.isFeatured);
  const shelf = (featured.length > 0 ? featured : sellable).slice(0, 8);
  const brands = topBrands(sellable, 8);
  const giftHref = whatsappLink(setting?.whatsappNumber, "¡Hola! Quiero armar un ramo o una box de maquillaje para regalar");
  const base = appBaseUrl();
  const jsonLd = [buildWebSiteJsonLd(base), buildOrganizationJsonLd(base)];

  return (
    <div className="space-y-16 pb-12 md:space-y-24">
      {/* El hero de Glamify, tal cual: es el slogan y la cara de la marca (pedido de la dueña). */}
      <GlamifyWelcomeBanner />

      <BrandMarquee brands={brands} />

      <section aria-labelledby="categorias" className="reveal space-y-6">
        <div className="flex items-end justify-between gap-4">
          <SectionTitle id="categorias" lead="Encontrá tu" accent="must" />
          <SeeAll href="/tienda">Ver todo</SeeAll>
        </div>
        <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-5 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-10">
          {tree.map((cat) => (
            <li key={cat.id} className="w-[88px] shrink-0 snap-start md:w-auto">
              <Link
                href={`/tienda/${cat.slug}`}
                className="group block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className="block aspect-square overflow-hidden rounded-full bg-muted ring-2 ring-transparent ring-offset-2 transition duration-300 group-hover:-translate-y-1 group-hover:ring-primary">
                  <ProductImage
                    src={cat.image}
                    alt=""
                    fallbackLabel={cat.name}
                    sizes="(min-width: 1024px) 120px, 88px"
                    className="size-full rounded-none object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </span>
                <span className="mt-2 block text-center text-[14px] font-semibold leading-tight text-foreground transition-colors group-hover:text-accent">
                  {cat.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {shelf.length > 0 && (
        <section aria-labelledby="destacados" className="reveal space-y-6">
          <div className="flex items-end justify-between gap-4">
            {featured.length > 0 ? (
              <SectionTitle id="destacados" lead="Lo que" accent="más aman" tail="las chicas" />
            ) : (
              <SectionTitle id="destacados" lead="Tu nueva" accent="obsesión" />
            )}
            <SeeAll href="/tienda">Ver todo</SeeAll>
          </div>
          <ProductGrid products={shelf} />
        </section>
      )}

      {giftHref && (
        <section
          aria-labelledby="regalos"
          className="reveal relative overflow-hidden rounded-[20px] bg-foreground px-6 py-10 text-center text-white md:px-12 md:py-16"
        >
          <div className="mx-auto max-w-xl space-y-4">
            <h2 id="regalos" className="font-display text-[30px] font-normal leading-tight text-white md:text-[42px]">
              Regalá algo <em className="font-medium text-[#FF4FA3]">divino</em>
            </h2>
            <p className="text-[16px] leading-relaxed text-white/80 md:text-[17px]">
              Ramos y boxes de maquillaje armados a medida: con lo que le encanta y el presupuesto que tengas. Lo charlamos
              por WhatsApp.
            </p>
            <a
              href={giftHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-7 text-[15px] font-semibold text-primary-foreground transition hover:scale-[1.02] hover:bg-primary-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
            >
              Armar mi regalo
              <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>
        </section>
      )}

      <section aria-labelledby="como-compras" className="reveal space-y-8">
        <SectionTitle id="como-compras" lead="Comprar es" accent="re fácil" />
        <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Truck, t: "Envío a todo el país", d: `A tu casa o a la sucursal de Correo Argentino. Gratis desde ${formatPrice(threshold)}.` },
            { icon: PackageCheck, t: "Sale rapidito", d: "Lo preparamos en Luján y lo despachamos en hasta 3 días hábiles." },
            { icon: CreditCard, t: "Pagás con Mercado Pago", d: "Tarjeta o dinero en cuenta, en un solo paso." },
            { icon: RotateCcw, t: "10 días para arrepentirte", d: "Y si algo llega fallado o equivocado, el cambio va por nuestra cuenta." },
          ].map(({ icon: Icon, t, d }) => (
            <li key={t} className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block text-[16px] font-bold text-foreground">{t}</span>
                <span className="mt-0.5 block text-[15px] leading-relaxed text-muted-foreground">{d}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
    </div>
  );
}
