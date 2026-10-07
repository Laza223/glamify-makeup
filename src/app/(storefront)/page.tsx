import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductGrid } from "@/components/catalog/product-grid";
import { ProductImage } from "@/components/catalog/product-image";
import { FeriaHero } from "@/components/marketing/feria-hero";
import { getActiveProducts, getCategoryTree } from "@/lib/catalog/queries";
import { filterVisibleInNav } from "@/lib/catalog/categories";
import { isSellableNow, lowestSellablePrice } from "@/lib/catalog/showcase";
import { detectBrand } from "@/lib/catalog/brand";
import { getFreeShippingThreshold } from "@/lib/orders/checkout-data";
import { prisma } from "@/lib/prisma";
import { whatsappLink } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/money";
import { buildWebSiteJsonLd, buildOrganizationJsonLd, serializeJsonLd } from "@/lib/seo/jsonld";
import { appBaseUrl } from "@/lib/seo/url";
import type { CatalogProduct } from "@/lib/catalog/types";

/** Las 3 marcas con más productos a la venta hoy (dato real del catálogo, no una lista fija). */
function topBrands(products: CatalogProduct[], n = Infinity): string[] {
  const counts = new Map<string, number>();
  for (const p of products) {
    const b = detectBrand(p.name);
    if (b) counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([b]) => b);
}

function SectionHead({ id, title, href, linkLabel }: { id: string; title: string; href: string; linkLabel: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 id={id} className="text-[28px] font-semibold leading-tight md:text-[36px]">
        {title}
      </h2>
      <Link
        href={href}
        className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-[10px] text-[15px] font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {linkLabel}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
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
  const withPhoto = sellable.filter((p) => p.images.length > 0);
  const featured = sellable.filter((p) => p.isFeatured);
  const shelf = (featured.length > 0 ? featured : sellable).slice(0, 8);
  const giftHref = whatsappLink(setting?.whatsappNumber, "¡Hola! Quiero armar un ramo o una box de maquillaje para regalar");
  const brands = topBrands(sellable, 8);
  const base = appBaseUrl();
  const jsonLd = [buildWebSiteJsonLd(base), buildOrganizationJsonLd(base)];

  return (
    <div className="pb-12 [&>section+section]:mt-14 md:[&>section+section]:mt-20">

      <FeriaHero brands={brands.slice(0, 3)} showcase={withPhoto} fromPrice={lowestSellablePrice(products)} />

      <section aria-labelledby="categorias" className="!mt-4 md:!mt-6">
        <h2 id="categorias" className="sr-only">
          Categorías
        </h2>
        <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-10">
          {tree.map((cat) => (
            <li key={cat.id} className="w-[84px] shrink-0 md:w-auto">
              <Link
                href={`/tienda/${cat.slug}`}
                className="group block rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="block aspect-square overflow-hidden rounded-[14px] bg-muted">
                  <ProductImage
                    src={cat.image}
                    alt=""
                    fallbackLabel={cat.name}
                    sizes="(min-width: 1024px) 120px, 84px"
                    className="size-full rounded-none object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </span>
                <span className="mt-1.5 block text-center text-[13px] font-medium leading-tight text-foreground group-hover:text-accent">
                  {cat.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {shelf.length > 0 && (
        <section aria-labelledby="destacados" className="space-y-6">
          <SectionHead
            id="destacados"
            title={featured.length > 0 ? "Destacados" : "Lo nuevo"}
            href="/tienda"
            linkLabel="Ver todo"
          />
          <ProductGrid products={shelf} />
        </section>
      )}

      {brands.length > 0 && (
        <section aria-labelledby="marcas" className="space-y-5">
          <h2 id="marcas" className="text-[28px] font-semibold leading-tight md:text-[36px]">
            Marcas que ya conocés
          </h2>
          {/* Carteles de marca: una placa por marca, inclinación alternada, cada una lleva a sus productos. */}
          <ul className="flex flex-wrap gap-3 md:gap-4">
            {brands.map((brand, i) => (
              <li key={brand} style={{ transform: `rotate(${[-1.5, 1, -0.75, 1.25][i % 4]}deg)` }}>
                <Link
                  href={`/tienda?q=${encodeURIComponent(brand)}`}
                  className="inline-flex min-h-12 items-center rounded-[14px] bg-secondary px-5 font-display text-[22px] font-semibold text-foreground shadow-[0_6px_16px_-8px_hsl(var(--accent)/0.35)] transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:px-6 md:text-[26px]"
                >
                  {brand}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {giftHref && (
        <section
          aria-labelledby="regalos"
          className="grid gap-5 rounded-[14px] bg-secondary px-5 py-7 md:grid-cols-[1fr_auto] md:items-center md:px-10 md:py-9"
        >
          <div className="space-y-2">
            <h2 id="regalos" className="text-[28px] font-semibold leading-tight md:text-[34px]">
              ¿Es para regalar?
            </h2>
            <p className="max-w-[52ch] text-[16px] text-foreground">
              Armamos ramos y boxes de maquillaje a medida, con lo que le guste y el presupuesto que tengas. Lo charlamos por
              WhatsApp.
            </p>
          </div>
          <a
            href={giftHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-[14px] bg-primary px-7 text-[16px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-secondary"
          >
            Armar un regalo
          </a>
        </section>
      )}

      <section aria-labelledby="como-compras" className="space-y-6">
        <h2 id="como-compras" className="text-[28px] font-semibold leading-tight md:text-[36px]">
          Cómo comprás
        </h2>
        <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {[
            { t: "Envío a todo el país", d: `Con Correo Argentino, a tu casa o a la sucursal. Gratis desde ${formatPrice(threshold)}.` },
            { t: "Despacho rápido", d: "Preparamos tu pedido en Luján y lo despachamos en hasta 3 días hábiles." },
            { t: "Pagás con Mercado Pago", d: "Con tarjeta o dinero en cuenta, en un solo paso." },
            { t: "10 días para arrepentirte", d: "Y si algo llega fallado o equivocado, el cambio corre por nuestra cuenta." },
          ].map((item) => (
            <div key={item.t} className="border-t-2 border-secondary pt-3">
              <dt className="text-[17px] font-semibold text-foreground">{item.t}</dt>
              <dd className="mt-1 text-[16px] text-muted-foreground">{item.d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
    </div>
  );
}
