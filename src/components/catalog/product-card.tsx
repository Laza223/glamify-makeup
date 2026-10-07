"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { WishlistHeart } from "@/components/catalog/wishlist-heart";
import { HangingTag } from "@/components/catalog/hanging-tag";
import { CardQuickStepper } from "@/components/catalog/card-quick-stepper";
import { QuickVariantPicker } from "@/components/catalog/quick-variant-picker";
import { useCartUI } from "@/components/cart/cart-provider";
import { productImageUrl } from "@/lib/images";
import { getEffectivePrice, isOnSale, toNumber } from "@/lib/catalog/pricing";
import { isProductMadeToOrder } from "@/lib/catalog/made-to-order";
import { getProductStockState } from "@/lib/catalog/stock";
import { detectBrand } from "@/lib/catalog/brand";
import { formatPrice } from "@/lib/money";
import type { CatalogListItem } from "@/lib/catalog/types";

const IMAGE_SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw";

/** Cuenta los aumentos de cantidad en el carrito: cada aumento re-dispara el balanceo de la etiqueta. */
function useSwingOnAdd(productId: string): number {
  const { getProductQty } = useCartUI();
  const qty = getProductQty(productId);
  const prev = useRef(qty);
  const [swings, setSwings] = useState(0);
  useEffect(() => {
    if (qty > prev.current) setSwings((n) => n + 1);
    prev.current = qty;
  }, [qty]);
  return swings;
}

export function ProductCard({ product }: { product: CatalogListItem }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const swingKey = useSwingOnAdd(product.id);

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
      <div className="relative">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[14px] bg-muted">
          <div className="absolute inset-0">
            {primaryUrl ? (
              <>
                <Image
                  src={primaryUrl}
                  alt=""
                  fill
                  sizes={IMAGE_SIZES}
                  className={`object-cover transition duration-500 ease-out group-hover:scale-[1.03] ${
                    secondaryUrl ? "group-hover:opacity-0" : ""
                  } ${soldOut ? "opacity-60" : ""}`}
                />
                {secondaryUrl && (
                  <Image
                    src={secondaryUrl}
                    alt=""
                    fill
                    sizes={IMAGE_SIZES}
                    className="object-cover opacity-0 transition duration-500 ease-out group-hover:scale-[1.03] group-hover:opacity-100"
                  />
                )}
              </>
            ) : (
              <span className="grid size-full place-items-center font-display text-5xl text-accent/60">
                {product.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

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

        {/* Etiqueta colgante: cuelga del borde superior de la foto. */}
        <HangingTag muted={soldOut || madeToOrder} swingKey={swingKey} className="top-0">
          {madeToOrder ? (
            "A pedido"
          ) : soldOut ? (
            "Sin stock"
          ) : (
            <>
              <span>{formatPrice(price)}</span>
              {compareAt !== null && (
                <s className="text-[12px] font-medium text-muted-foreground">{formatPrice(compareAt)}</s>
              )}
            </>
          )}
        </HangingTag>
      </div>

      <div className="flex flex-1 flex-col gap-1 pt-2.5">
        <h3 className="line-clamp-2 font-sans text-[15px] font-semibold tracking-normal leading-snug text-foreground">
          <Link
            href={href}
            className="rounded-sm after:absolute after:inset-0 after:z-10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {product.name}
          </Link>
        </h3>
        <p className="text-[14px] text-muted-foreground">
          {[brand, madeToOrder ? "Armalo por WhatsApp" : product.category.name].filter(Boolean).join(" · ")}
        </p>
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
      </div>

      {!madeToOrder && product.variants.length > 1 && (
        <QuickVariantPicker product={product} open={pickerOpen} onOpenChange={setPickerOpen} />
      )}
    </article>
  );
}
