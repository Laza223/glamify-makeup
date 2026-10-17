"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, ShoppingBag, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StockBadge } from "@/components/catalog/stock-badge";
import { getStockState } from "@/lib/catalog/stock";
import { getEffectivePrice, toNumber, isOnSale } from "@/lib/catalog/pricing";
import { productImageUrl } from "@/lib/images";
import { formatARS } from "@/lib/money";
import { useCartUI } from "@/components/cart/cart-provider";
import { cn } from "@/lib/utils";
import type { CatalogListItem } from "@/lib/catalog/types";

interface QuickVariantPickerProps {
  product: CatalogListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialVariantId?: string;
}

export function QuickVariantPicker({
  product,
  open,
  onOpenChange,
  initialVariantId,
}: QuickVariantPickerProps) {
  const { setVariantQty, isUpdating, getError } = useCartUI();
  const firstAvailable =
    product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [selectedId, setSelectedId] = useState<string>(
    initialVariantId ?? firstAvailable?.id ?? "",
  );

  const selected =
    product.variants.find((v) => v.id === selectedId) ?? firstAvailable;
  const outOfStock = !selected || selected.stock <= 0;
  const pending = selected ? isUpdating(selected.id) : false;
  const error = selected ? getError(selected.id) : null;
  const price = getEffectivePrice(product, selected);
  const onSale = isOnSale(product);
  const imageUrl = productImageUrl(
    selected?.image ?? product.images[0] ?? null,
  );

  async function handleAdd() {
    if (!selected || outOfStock) return;
    const ok = await setVariantQty(selected.id, 1, product.id);
    if (ok) {
      onOpenChange(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] rounded-t-3xl border-t border-border/80 bg-white shadow-soft-lg sm:bottom-auto sm:top-1/2 sm:mx-auto sm:max-w-md sm:-translate-y-1/2 sm:rounded-2xl sm:border"
      >
        <SheetHeader className="pb-3 text-left">
          <SheetTitle className="text-base font-bold text-foreground">
            Elegí tu tono
          </SheetTitle>
        </SheetHeader>

        {/* Producto info miniatura */}
        <div className="flex items-center gap-3.5 border-b border-border/60 pb-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-secondary">
            {imageUrl && (
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                sizes="64px"
                className="object-cover"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {product.category.name}
            </p>
            <h4 className="truncate text-sm font-semibold text-foreground">
              {product.name}
            </h4>
            <div className="flex items-baseline gap-2 pt-0.5">
              <span className="text-sm font-bold text-foreground">
                {formatARS(price)}
              </span>
              {onSale && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatARS(toNumber(product.compareAtPrice))}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Selector de tonos */}
        <div className="space-y-3 py-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              Tono:{" "}
              <span className="font-bold text-primary">
                {selected?.name ?? "Seleccioná"}
              </span>
            </span>
            {selected && (
              <StockBadge
                state={getStockState(selected)}
                stock={selected.stock}
              />
            )}
          </div>

          <div
            className="flex max-h-48 flex-wrap gap-2.5 overflow-y-auto py-1"
            role="radiogroup"
            aria-label="Tonos disponibles"
          >
            {product.variants.map((v) => {
              const isOut = v.stock <= 0;
              const isSelected = v.id === selected?.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${v.name}${isOut ? " (sin stock)" : ""}`}
                  disabled={isOut}
                  onClick={() => setSelectedId(v.id)}
                  className={cn(
                    "shadow-2xs relative flex size-11 items-center justify-center rounded-full border-2 bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-95",
                    isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border/80 text-foreground/80 hover:border-neutral-400",
                    isOut && "cursor-not-allowed bg-neutral-100 opacity-40",
                  )}
                >
                  {/* Swatch color o letra */}
                  {v.swatchHex ? (
                    <span
                      className="size-5 rounded-full border border-black/10"
                      style={{ backgroundColor: v.swatchHex }}
                    />
                  ) : (
                    <span className="text-xs font-semibold text-foreground/80">
                      {v.name.replace(/^tono\s*/i, "").trim() ||
                        v.name.charAt(0)}
                    </span>
                  )}

                  {/* Tilde rosa de selección */}
                  {isSelected && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70 backdrop-blur-[1px]">
                      <Check
                        className="size-5 stroke-[3] text-primary"
                        aria-hidden
                      />
                    </span>
                  )}

                  {/* Raya tachada si no hay stock */}
                  {isOut && (
                    <span
                      className="absolute inset-x-0 top-1/2 h-0.5 -rotate-45 bg-foreground/60"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* CTA Agregar al Carrito */}
        <div className="pt-2">
          <div role="status">
            {error && <p className="pb-2 text-[14px] text-destructive">{error}</p>}
          </div>
          <Button
            size="lg"
            className="w-full rounded-2xl bg-primary py-6 text-sm font-semibold text-white shadow-soft transition-all hover:bg-[#E01E7D] hover:shadow-soft-lg"
            onClick={handleAdd}
            disabled={pending || outOfStock}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShoppingBag className="size-4" />
            )}
            <span>
              {outOfStock ? "Sin stock disponible" : "Agregar al carrito"}
            </span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
