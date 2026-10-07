"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { VariantSwatchSelector } from "@/components/catalog/variant-swatch-selector";
import { QuantityStepper } from "@/components/catalog/quantity-stepper";
import { useCartUI } from "@/components/cart/cart-provider";
import { MobileStickyBuyBar } from "@/components/catalog/mobile-sticky-buy-bar";
import { addToCartAction } from "@/app/(storefront)/actions";
import { track } from "@/lib/analytics/track";
import type { CatalogVariant } from "@/lib/catalog/types";

interface AddToCartProps {
  variants: CatalogVariant[];
  /** Barra fija mobile: comparte el tono elegido acá (si no, agregaría el primero con stock). */
  stickyBar?: { productName: string; image?: string | null; price: number };
}

export function AddToCart({ variants, stickyBar }: AddToCartProps) {
  const router = useRouter();
  const { openCart } = useCartUI();
  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [variantId, setVariantId] = useState<string | undefined>(firstAvailable?.id);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false); // confirmación breve en el botón

  const selected = variants.find((v) => v.id === variantId) ?? firstAvailable;
  const outOfStock = !selected || selected.stock <= 0;

  const add = () =>
    startTransition(async () => {
      setError(null);
      if (!variantId) { setError("Elegí un tono."); return; }
      const r = await addToCartAction({ variantId, qty });
      if (!r.ok) { setError(r.error ?? "No se pudo agregar."); return; }
      track("add_to_cart", { variantId, qty, variantName: selected?.name });
      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
      router.refresh();
      openCart();
    });

  return (
    <div className="space-y-5">
      {variants.length > 0 && <VariantSwatchSelector variants={variants} onChange={(v) => setVariantId(v.id)} />}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <QuantityStepper max={Math.max(1, selected?.stock ?? 99)} onChange={setQty} />
        <button
          type="button"
          id="main-pdp-cta"
          onClick={add}
          disabled={pending || outOfStock}
          className={cn(
            "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-6 text-[16px] font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            added ? "bg-success" : "bg-foreground hover:bg-foreground/85",
          )}
        >
          {pending ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : added ? (
            <Check className="size-5 animate-in zoom-in-50" aria-hidden />
          ) : (
            <ShoppingBag className="size-5" aria-hidden />
          )}
          <span aria-live="polite">{outOfStock ? "Sin stock" : added ? "¡Agregado!" : "Agregar al carrito"}</span>
        </button>
      </div>
      {error && <p className="text-[15px] font-medium text-destructive" role="alert">{error}</p>}
      {stickyBar && <MobileStickyBuyBar {...stickyBar} variants={variants} selectedVariantId={variantId} />}
    </div>
  );
}
