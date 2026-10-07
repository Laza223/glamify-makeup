"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { WishlistHeart } from "@/components/catalog/wishlist-heart";
import { CardQuickStepper } from "@/components/catalog/card-quick-stepper";
import { QuickVariantPicker } from "@/components/catalog/quick-variant-picker";
import { productImageUrl } from "@/lib/images";
import { getEffectivePrice, isOnSale, toNumber } from "@/lib/catalog/pricing";
import { isProductMadeToOrder } from "@/lib/catalog/made-to-order";
import { getProductStockState } from "@/lib/catalog/stock";
import { detectBrand } from "@/lib/catalog/brand";
import { formatPrice } from "@/lib/money";
import type { CatalogListItem } from "@/lib/catalog/types";

const IMAGE_SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw";

export function ProductCard({ product }: { product: CatalogListItem }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [broken, setBroken] = useState(false); // foto que no carga → inicial en vez del ícono roto

  const price = getEffectivePrice(product);
  const compareAt = isOnSale(product) ? toNumber(product.compareAtPrice) : null;
  const madeToOrder = isProductMadeToOrder(product);
  const soldOut = !madeToOrder && getProductStockState(product.variants) === "out_of_stock";
  const brand = detectBrand(product.name);
  const swatches = product.variants.filter((v) => v.swatchHex).slice(0, 5);

  const primaryUrl = productImageUrl(product.images[0]);
  const secondaryUrl = product.images[1] ? productImageUrl(product.images[1]) : null;
  const href = `/producto/${product.slug}`;

  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[14px] bg-muted">
        {primaryUrl && !broken ? (
          <>
            <Image
              src={primaryUrl}
              alt=""
              fill
              sizes={IMAGE_SIZES}
              onError={() => setBroken(true)}
              className={`object-cover transition duration-700 ease-out group-hover:scale-[1.04] ${
                secondaryUrl ? "group-hover:opacity-0" : ""
              } ${soldOut ? "opacity-60" : ""}`}
            />
            {secondaryUrl && (
              <Image
                src={secondaryUrl}
                alt=""
                fill
                sizes={IMAGE_SIZES}
                className="object-cover opacity-0 transition duration-700 ease-out group-hover:scale-[1.04] group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <span className="grid size-full place-items-center font-display text-5xl italic text-primary/50">
            {product.name.charAt(0).toUpperCase()}
          </span>
        )}

        {(soldOut || madeToOrder) && (
          <span className="absolute left-2.5 top-2.5 z-20 rounded-full bg-white px-3 py-1 text-[13px] font-semibold text-foreground shadow-sm">
            {soldOut ? "Sin stock" : "A pedido"}
          </span>
        )}

        <WishlistHeart productId={product.id} className="absolute right-2 top-2 z-20" />

        {!madeToOrder && !soldOut && (
          <CardQuickStepper
            productId={product.id}
            variants={product.variants}
            onOpenPicker={() => setPickerOpen(true)}
            className="absolute bottom-2 right-2 z-20"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 pt-3">
        {brand && (
          <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-accent">{brand}</p>
        )}
        <h3 className="line-clamp-2 font-sans text-[15px] font-semibold leading-snug tracking-normal text-foreground">
          <Link
            href={href}
            className="rounded-sm after:absolute after:inset-0 after:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {product.name}
          </Link>
        </h3>
        {swatches.length > 0 && (
          <p className="flex items-center gap-1.5 pt-0.5" aria-label={`${product.variants.length} tonos`}>
            {swatches.map((v) => (
              <span
                key={v.id}
                title={v.name}
                className="size-3.5 rounded-full border border-black/10"
                style={{ backgroundColor: v.swatchHex ?? undefined }}
              />
            ))}
            {product.variants.length > swatches.length && (
              <span className="text-[12px] text-muted-foreground">+{product.variants.length - swatches.length}</span>
            )}
          </p>
        )}
        <p className="mt-auto flex items-baseline gap-2 pt-1">
          {madeToOrder ? (
            <span className="text-[14px] text-muted-foreground">Lo armamos por WhatsApp</span>
          ) : (
            <>
              <span className="text-[17px] font-bold tabular-nums text-foreground">{formatPrice(price)}</span>
              {compareAt !== null && (
                <s className="text-[14px] tabular-nums text-muted-foreground">{formatPrice(compareAt)}</s>
              )}
            </>
          )}
        </p>
      </div>

      {!madeToOrder && product.variants.length > 1 && (
        <QuickVariantPicker product={product} open={pickerOpen} onOpenChange={setPickerOpen} />
      )}
    </article>
  );
}
