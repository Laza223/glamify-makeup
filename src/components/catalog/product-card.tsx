"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { WishlistHeart } from "@/components/catalog/wishlist-heart";
import { PriceTag } from "@/components/catalog/price-tag";
import { StockBadge } from "@/components/catalog/stock-badge";
import { CardQuickStepper } from "@/components/catalog/card-quick-stepper";
import { QuickVariantPicker } from "@/components/catalog/quick-variant-picker";
import { productImageUrl } from "@/lib/images";
import {
  getEffectivePrice,
  isOnSale,
  getDiscountPercent,
  toNumber,
} from "@/lib/catalog/pricing";
import { isProductMadeToOrder } from "@/lib/catalog/made-to-order";
import { getProductStockState } from "@/lib/catalog/stock";
import { cn } from "@/lib/utils";
import type { CatalogListItem } from "@/lib/catalog/types";

export function ProductCard({ product }: { product: CatalogListItem }) {
  const [selectedVariantId, setSelectedVariantId] = useState<
    string | undefined
  >(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectedVariant = selectedVariantId
    ? product.variants.find((v) => v.id === selectedVariantId)
    : undefined;

  const price = getEffectivePrice(product, selectedVariant);
  const onSale = isOnSale(product);
  const madeToOrder = isProductMadeToOrder(product);
  const stockState = getProductStockState(product.variants);
  const swatches = product.variants.filter((v) => v.swatchHex).slice(0, 5);

  const primaryUrl = productImageUrl(
    selectedVariant?.image ?? product.images[0],
  );
  const secondaryUrl =
    product.images[1] && !selectedVariant?.image
      ? productImageUrl(product.images[1])
      : null;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-white transition-all duration-300 hover:border-border hover:shadow-soft-lg">
      {/* Contenedor de imagen */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-secondary">
        <Link
          href={`/producto/${product.slug}`}
          className="absolute inset-0 z-0 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Ver detalles de ${product.name}`}
        >
          {primaryUrl ? (
            <>
              <Image
                src={primaryUrl}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className={`object-cover transition-all duration-500 ease-out group-hover:scale-105 ${
                  secondaryUrl ? "group-hover:opacity-0" : ""
                }`}
              />
              {secondaryUrl && (
                <Image
                  src={secondaryUrl}
                  alt={`${product.name} - detalle`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover opacity-0 transition-all duration-500 ease-out group-hover:scale-105 group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <div className="relative flex aspect-[4/5] items-center justify-center bg-gradient-to-br from-secondary via-muted to-white">
              <span className="font-display text-5xl font-bold text-primary/70">
                {product.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </Link>

        {/* Badge superior descuento */}
        <div className="pointer-events-none absolute left-2.5 top-2.5 z-10 flex flex-col gap-1">
          {onSale && (
            <span className="rounded-full bg-[#161413] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              -{getDiscountPercent(product)}% OFF
            </span>
          )}
        </div>

        {/* Badge sin stock */}
        {!madeToOrder && stockState === "out_of_stock" && (
          <span className="pointer-events-none absolute right-2.5 top-2.5 z-10">
            <StockBadge state="out_of_stock" />
          </span>
        )}

        {/* Favoritos */}
        <span className="absolute bottom-2.5 right-2.5 z-20">
          <WishlistHeart productId={product.id} />
        </span>
      </div>

      {/* Contenido de la card */}
      <div className="flex flex-1 flex-col justify-between space-y-2 bg-white p-3.5">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {product.category.name}
          </p>
          <Link
            href={`/producto/${product.slug}`}
            className="group/title block rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug text-foreground transition-colors group-hover/title:text-primary md:text-[15px]">
              {product.name}
            </h3>
          </Link>
          {madeToOrder ? (
            <p className="pt-0.5 text-[12px] text-muted-foreground">
              Armalo a tu gusto por WhatsApp
            </p>
          ) : (
            <div className="pt-0.5">
              <PriceTag
                price={price}
                compareAtPrice={
                  onSale ? toNumber(product.compareAtPrice) : null
                }
                discountPercent={0}
                size="sm"
              />
            </div>
          )}
        </div>

        {madeToOrder ? (
          <div className="mt-1 flex items-center border-t border-border/40 pt-2">
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              A pedido
            </span>
          </div>
        ) : (
          <>
            {/* Fila inferior: Swatches a la izquierda + Stepper estilo PedidosYa a la derecha */}
            <div className="mt-1 flex items-center justify-between gap-2 border-t border-border/40 pt-2">
              {swatches.length > 0 ? (
                <div
                  className="flex items-center gap-1.5"
                  aria-label={`${product.variants.length} tonos disponibles`}
                >
                  {swatches.map((v) => {
                    const isSelected = selectedVariantId === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        title={v.name}
                        aria-label={`Tono ${v.name}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedVariantId(isSelected ? undefined : v.id);
                        }}
                        className={cn(
                          "size-3.5 rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                          isSelected
                            ? "scale-125 border-primary ring-2 ring-primary"
                            : "shadow-2xs hover:scale-115 border-neutral-300/80",
                        )}
                        style={{ backgroundColor: v.swatchHex ?? undefined }}
                      />
                    );
                  })}
                  {product.variants.length > swatches.length && (
                    <span className="text-[11px] font-medium text-muted-foreground">
                      +{product.variants.length - swatches.length}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[11px] font-medium text-muted-foreground">
                  {stockState === "out_of_stock" ? "Agotado" : "Disponible"}
                </span>
              )}

              {/* Stepper interactivo animado */}
              {stockState === "out_of_stock" ? (
                <span className="select-none rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground/70">
                  Sin stock
                </span>
              ) : (
                <CardQuickStepper
                  productId={product.id}
                  variants={product.variants}
                  selectedVariantId={selectedVariantId}
                  onOpenPicker={() => setPickerOpen(true)}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Picker modal de variantes si tiene más de 1 variante */}
      {!madeToOrder && product.variants.length > 1 && (
        <QuickVariantPicker
          product={product}
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          initialVariantId={selectedVariantId}
        />
      )}
    </div>
  );
}
