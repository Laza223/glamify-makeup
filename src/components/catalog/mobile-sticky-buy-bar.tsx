"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingBag, Loader2, Check } from "lucide-react";
import { formatPrice } from "@/lib/money";
import { productImageUrl } from "@/lib/images";
import { useCartUI } from "@/components/cart/cart-provider";
import { addToCartAction } from "@/app/(storefront)/actions";
import { track } from "@/lib/analytics/track";
import type { CatalogVariant } from "@/lib/catalog/types";

interface MobileStickyBuyBarProps {
  productName: string;
  image?: string | null;
  price: number;
  variants: CatalogVariant[];
  selectedVariantId?: string;
  /** Cantidad elegida en el stepper de la ficha. */
  qty?: number;
}

export function MobileStickyBuyBar({
  productName,
  image,
  price,
  variants,
  selectedVariantId,
  qty = 1,
}: MobileStickyBuyBarProps) {
  const router = useRouter();
  const { openCart } = useCartUI();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false); // misma confirmación breve que el CTA principal

  const activeVariant =
    variants.find((v) => v.id === selectedVariantId) ??
    variants.find((v) => v.stock > 0) ??
    variants[0];

  const outOfStock = !activeVariant || activeVariant.stock <= 0;
  const imgUrl = productImageUrl(activeVariant?.image ?? image);

  useEffect(() => {
    const target = document.getElementById("main-pdp-cta");
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Si el botón principal no está en el viewport, mostramos la barra sticky
        setVisible(!entry.isIntersecting);
        if (entry.isIntersecting) setError(null);
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const handleQuickAdd = () => {
    if (!activeVariant || outOfStock) return;
    startTransition(async () => {
      setError(null);
      try {
        const res = await addToCartAction({ variantId: activeVariant.id, qty });
        if (!res.ok) {
          setError(res.error ?? "No se pudo agregar.");
          return;
        }
      } catch {
        setError("No se pudo agregar. Probá de nuevo.");
        return;
      }
      track("add_to_cart", { variantId: activeVariant.id, qty, variantName: activeVariant.name, source: "mobile_sticky" });
      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
      router.refresh();
      openCart();
    });
  };

  return (
    <div
      data-testid="sticky-buy-bar"
      // Oculta (CTA principal a la vista): fuera del foco y de los lectores, no solo transparente.
      inert={!visible}
      className={`fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-bar border-t border-border bg-white/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.18)] backdrop-blur-md transition-transform duration-300 motion-reduce:transition-none md:hidden ${
        visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      {error && (
        <p role="alert" className="pb-2 text-[15px] font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-muted">
            {imgUrl ? (
              <Image src={imgUrl} alt="" fill sizes="48px" className="object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-xs font-bold text-muted-foreground">
                G
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-foreground">{productName}</p>
            <p className="flex items-baseline gap-1.5">
              <span className="shrink-0 text-[16px] font-bold tabular-nums text-foreground">{formatPrice(price)}</span>
              {activeVariant && (
                <span className="min-w-0 truncate text-[14px] text-muted-foreground">{activeVariant.name}</span>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleQuickAdd}
          disabled={pending || outOfStock}
          className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl px-5 text-[15px] font-semibold text-white transition active:scale-[0.97] motion-reduce:transition-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            added ? "bg-success" : "bg-foreground"
          }`}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : added ? (
            <Check className="size-4 animate-in zoom-in-50 motion-reduce:animate-none" aria-hidden />
          ) : (
            <ShoppingBag className="size-4" aria-hidden />
          )}
          <span aria-live="polite">{outOfStock ? "Sin stock" : added ? "¡Agregado!" : qty > 1 ? `Agregar (${qty})` : "Agregar"}</span>
        </button>
      </div>
    </div>
  );
}
