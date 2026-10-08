import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getProductBySlug, resolveCategoryPath } from "@/lib/catalog/queries";
import { getRelatedProducts } from "@/lib/catalog/recommendations";
import { buildBreadcrumbs, type CategoryNode } from "@/lib/catalog/categories";
import { getEffectivePrice, isOnSale, getDiscountPercent, toNumber } from "@/lib/catalog/pricing";
import { isProductMadeToOrder } from "@/lib/catalog/made-to-order";
import { isProductGiftCard } from "@/lib/catalog/gift-card";
import { storeWhatsappUrl } from "@/lib/email/whatsapp-url";
import { CatalogBreadcrumbs } from "@/components/catalog/catalog-breadcrumbs";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { detectBrand } from "@/lib/catalog/brand";
import { getFreeShippingThreshold } from "@/lib/orders/checkout-data";
import { formatPrice } from "@/lib/money";
import { AddToCart } from "@/components/cart/add-to-cart";
import { WishlistHeart } from "@/components/catalog/wishlist-heart";
import { TrustBadges } from "@/components/catalog/trust-badges";
import { PdpAccordions } from "@/components/catalog/pdp-accordions";
import { CrossSell } from "@/components/catalog/cross-sell";
import { isWishlisted } from "@/app/(storefront)/cuenta/favoritos/actions";
import { getApprovedReviews } from "@/lib/reviews/queries";
import { getCustomer } from "@/lib/customer/auth";
import { prisma } from "@/lib/prisma";
import { RatingStars } from "@/components/ui/rating-stars";
import { ReviewCard } from "@/components/catalog/review-card";
import { buildProductJsonLd, serializeJsonLd } from "@/lib/seo/jsonld";
import { absoluteUrl } from "@/lib/seo/url";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { ReviewForm } from "./review-form";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Producto" };
  const description = product.seoDescription ?? product.description ?? undefined;
  const image = product.images[0] ? absoluteUrl(product.images[0]) : undefined;
  return {
    title: product.seoTitle ? { absolute: product.seoTitle } : product.name,
    description,
    alternates: { canonical: absoluteUrl(`/producto/${slug}`) },
    openGraph: {
      type: "website",
      title: product.name,
      description,
      url: absoluteUrl(`/producto/${slug}`),
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const madeToOrder = isProductMadeToOrder(product);
  const giftCard = isProductGiftCard(product);
  const whatsappUrl = madeToOrder ? await storeWhatsappUrl(`¡Hola! Quiero armar un ${product.name}`) : null;
  const price = getEffectivePrice(product);
  const onSale = isOnSale(product);
  const [wishlisted, threshold] = await Promise.all([isWishlisted(product.id), getFreeShippingThreshold()]);
  const brand = detectBrand(product.name);
  const discount = onSale ? getDiscountPercent(product) : 0;

  // Ubicar la categoría del producto en el árbol para los breadcrumbs.
  const { tree } = await resolveCategoryPath();
  let category: CategoryNode | null = null;
  let subcategory: CategoryNode | undefined;
  for (const top of tree) {
    if (top.id === product.categoryId) {
      category = top;
      break;
    }
    const child = top.children.find((c) => c.id === product.categoryId);
    if (child) {
      category = top;
      subcategory = child;
      break;
    }
  }
  const crumbs = buildBreadcrumbs({ category, subcategory, product: { name: product.name, slug: product.slug } });

  // Reseñas (display) + contexto de alta (abierta + moderación).
  const [{ reviews, count, average }, related] = await Promise.all([
    getApprovedReviews(product.id),
    getRelatedProducts(product.id, product.categoryId, 4),
  ]);
  const customer = await getCustomer();
  let alreadyReviewed = false;
  if (customer) {
    const existing = await prisma.review.findUnique({
      where: { customerId_productId: { customerId: customer.id, productId: product.id } },
    });
    alreadyReviewed = Boolean(existing);
  }

  const inStock = product.variants.some((v) => v.active && v.stock > 0);
  const jsonLd = buildProductJsonLd(
    {
      name: product.name,
      description: product.seoDescription ?? product.description,
      images: product.images.map((img) => absoluteUrl(img)),
      sku: product.variants[0]?.sku ?? null,
      price,
      inStock,
      url: absoluteUrl(`/producto/${slug}`),
      madeToOrder,
    },
    { average, count },
  );

  return (
    <article className="space-y-10 pb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <TrackOnMount event="product_viewed" props={{ productId: product.id, slug: product.slug, name: product.name }} />
      
      <CatalogBreadcrumbs items={crumbs} />

      {/* 50/50 Desktop Sticky Layout */}
      <div className="grid gap-10 lg:grid-cols-12 items-start">
        <div className="lg:col-span-7">
          <ProductGallery images={product.images} name={product.name} />
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-6">
          <header className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <p className="pt-2 text-[13px] font-bold uppercase tracking-[0.1em] text-accent">
                {[brand, product.category.name].filter(Boolean).join(" · ")}
              </p>
              <WishlistHeart productId={product.id} initial={wishlisted} className="shrink-0 border border-border" />
            </div>

            <h1 className="font-display text-[32px] font-normal leading-tight text-foreground md:text-[40px]">
              {product.name}
            </h1>

            {count > 0 && (
              <a href="#opiniones" className="inline-flex min-h-11 items-center gap-2 text-[15px] text-muted-foreground hover:text-foreground">
                <RatingStars value={average} size="sm" />
                {average.toFixed(1)} · {count === 1 ? "1 opinión" : `${count} opiniones`}
              </a>
            )}
          </header>

          {madeToOrder ? (
            <div className="space-y-3">
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-6 text-[16px] font-semibold text-white transition hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <MessageCircle className="size-5" aria-hidden />
                  Armalo por WhatsApp
                </a>
              ) : (
                <p className="text-[16px] font-semibold text-foreground">Escribinos por WhatsApp para armarlo</p>
              )}
              <p className="text-[16px] text-muted-foreground">
                Lo armamos a tu gusto: elegís los productos y te pasamos el precio por WhatsApp.
              </p>
            </div>
          ) : (
            <>
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[30px] font-bold tabular-nums text-foreground">{formatPrice(price)}</span>
                {onSale && (
                  <>
                    <s className="text-[18px] tabular-nums text-muted-foreground">
                      {formatPrice(toNumber(product.compareAtPrice))}
                    </s>
                    {discount > 0 && (
                      <span className="rounded-full bg-primary px-2.5 py-0.5 text-[14px] font-bold text-primary-foreground">
                        -{discount}%
                      </span>
                    )}
                  </>
                )}
              </p>

              {giftCard && (
                <p className="rounded-[18px] bg-secondary p-4 text-[15px] leading-relaxed text-foreground">
                  Llega por mail con un código. Un solo uso, vence a los 6 meses y descuenta productos (no el envío). Si
                  la compra es menor, el saldo no se conserva.
                </p>
              )}

              <AddToCart
                variants={product.variants}
                stickyBar={{ productName: product.name, image: product.images[0], price }}
              />
            </>
          )}

          <TrustBadges freeShippingThreshold={threshold} />

          <PdpAccordions description={product.description} />
        </div>
      </div>

      {/* Sección de Reseñas */}
      <section id="opiniones" className="scroll-mt-32 border-t border-border pt-12">
        <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-[30px] font-normal leading-tight md:text-[38px]">
              Lo que <em className="font-medium text-primary">opinan</em>
            </h2>
            <p className="mt-1 text-[15px] text-muted-foreground">Las chicas que ya lo probaron</p>
          </div>
          {count > 0 && (
            <span className="flex items-center gap-2 text-[16px] font-semibold">
              <RatingStars value={average} size="sm" /> {average.toFixed(1)} · {count === 1 ? "1 opinión" : `${count} opiniones`}
            </span>
          )}
        </div>

        {customer && alreadyReviewed ? (
          <p className="rounded-[18px] bg-secondary p-4 text-[15px] text-foreground">
            Ya dejaste tu reseña sobre este producto. ¡Muchas gracias por tu recomendación!
          </p>
        ) : (
          <ReviewForm productId={product.id} slug={product.slug} isLoggedIn={Boolean(customer)} />
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.length === 0 ? (
            <p className="col-span-full rounded-[18px] bg-secondary p-6 text-center text-[16px] text-muted-foreground">
              Todavía no hay opiniones. ¡Contanos qué te pareció y sé la primera!
            </p>
          ) : (
            reviews.map((r) => <ReviewCard key={r.id} review={r} />)
          )}
        </div>
      </section>

      {/* Productos Relacionados */}
      <CrossSell products={related} />

    </article>
  );
}
