"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingBag, Loader2 } from "lucide-react";
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
}

export function MobileStickyBuyBar({
  productName,
  image,
  price,
  variants,
  selectedVariantId,
}: MobileStickyBuyBarProps) {
  const router = useRouter();
  const { openCart } = useCartUI();
  const [visible, setVisible] = useState(false);
  const [pending, startTransition] = useTransition();

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
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const handleQuickAdd = () => {
    if (!activeVariant || outOfStock) return;
    startTransition(async () => {
      const res = await addToCartAction({ variantId: activeVariant.id, qty: 1 });
      if (res.ok) {
        track("add_to_cart", { variantId: activeVariant.id, qty: 1, variantName: activeVariant.name, source: "mobile_sticky" });
        router.refresh();
        openCart();
      }
    });
  };

  return (
    <div
      className={`fixed bottom-14 left-0 right-0 z-20 border-t border-border bg-white/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.18)] backdrop-blur-md transition-transform duration-300 md:hidden ${
        visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      }`}
    >
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
            <p className="text-[16px] font-bold tabular-nums text-foreground">
              {formatPrice(price)}
              {activeVariant && (
                <span className="ml-1.5 text-[14px] font-normal text-muted-foreground">{activeVariant.name}</span>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleQuickAdd}
          disabled={pending || outOfStock}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-foreground px-5 text-[15px] font-semibold text-white transition active:scale-[0.97] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShoppingBag className="size-4" aria-hidden />}
          <span>{outOfStock ? "Sin stock" : "Agregar"}</span>
        </button>
      </div>
    </div>
  );
}
