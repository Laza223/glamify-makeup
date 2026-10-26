"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";
import { ProductImage } from "@/components/catalog/product-image";
import { useCartUI } from "@/components/cart/cart-provider";
import { addBundleToCartAction } from "@/app/(storefront)/actions";
import { getEffectivePrice } from "@/lib/catalog/pricing";
import { BUNDLE_MINIMUM, MAX_BUNDLE_UNITS, computeBundlePricing, type BundleKindKey } from "@/lib/bundle/rules";
import { formatPrice } from "@/lib/money";
import { track } from "@/lib/analytics/track";
import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/lib/catalog/types";

interface BundleBuilderProps {
  kind: BundleKindKey;
  products: CatalogProduct[];
  packagingFee: number;
}

export function BundleBuilder({ kind, products, packagingFee }: BundleBuilderProps) {
  const router = useRouter();
  const { openCart } = useCartUI();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [shownVariant, setShownVariant] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<string>("todas");

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of products) seen.set(p.category.slug, p.category.name);
    return [...seen].map(([slug, name]) => ({ slug, name }));
  }, [products]);
  const visible = category === "todas" ? products : products.filter((p) => p.category.slug === category);

  const variantIndex = useMemo(() => {
    const m = new Map<string, { stock: number; price: number; image: string | null }>();
    for (const p of products) {
      for (const v of p.variants) m.set(v.id, { stock: v.stock, price: getEffectivePrice(p, v), image: v.image });
    }
    return m;
  }, [products]);

  const picked = Object.entries(qtys).filter(([, q]) => q > 0);
  const units = picked.reduce((acc, [, q]) => acc + q, 0);
  const pricing = computeBundlePricing(
    picked.map(([id, qty]) => ({ unitPrice: variantIndex.get(id)?.price ?? 0, qty })),
    packagingFee,
  );

  const change = (variantId: string, delta: number) => {
    setError(null);
    const info = variantIndex.get(variantId);
    if (!info) return;
    if (delta > 0 && units >= MAX_BUNDLE_UNITS) return;
    setQtys((prev) => ({ ...prev, [variantId]: Math.max(0, Math.min(info.stock, (prev[variantId] ?? 0) + delta)) }));
  };

  const submit = () => {
    startTransition(async () => {
      setError(null);
      const items = picked.map(([variantId, qty]) => ({ variantId, qty }));
      try {
        const res = await addBundleToCartAction({ kind, items });
        if (!res.ok) {
          setError(res.error ?? "No pudimos sumar tu regalo al carrito. Probá de nuevo.");
          return;
        }
      } catch {
        setError("No pudimos sumar tu regalo al carrito. Probá de nuevo.");
        return;
      }
      track("add_to_cart", { kind: `bundle_${kind}`, units, total: pricing.total });
      setQtys({});
      router.refresh();
      openCart();
    });
  };

  return (
    <div className="container pb-44 md:pb-32">
      <PageTitle eyebrow={`Desde ${formatPrice(BUNDLE_MINIMUM)}`} lead="Armá tu" accent={kind === "ramo" ? "ramo" : "box"}>
        Elegí tus productos favoritos y lo armamos con cariño. El mínimo es {formatPrice(BUNDLE_MINIMUM)} en productos
        {packagingFee > 0 ? `, más ${formatPrice(packagingFee)} de empaque` : ""}.
      </PageTitle>

      <div className="my-6 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por categoría">
        {[{ slug: "todas", name: "Todo" }, ...categories].map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => setCategory(c.slug)}
            aria-pressed={category === c.slug}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-[15px] font-medium transition",
              category === c.slug ? "border-foreground bg-foreground text-white" : "border-border bg-white text-foreground hover:bg-secondary",
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        {visible.map((p) => {
          const vId = shownVariant[p.id] ?? p.variants[0]?.id;
          const info = vId ? variantIndex.get(vId) : undefined;
          if (!vId || !info) return null;
          const qty = qtys[vId] ?? 0;
          const inProduct = p.variants.reduce((acc, v) => acc + (qtys[v.id] ?? 0), 0);
          return (
            <li key={p.id} className="flex flex-col gap-2">
              <div className={cn("relative aspect-square overflow-hidden rounded-[14px] bg-muted", inProduct > 0 && "ring-2 ring-primary")}>
                <ProductImage
                  src={info.image ?? p.images[0] ?? null}
                  alt={p.name}
                  fallbackLabel={p.name}
                  sizes="(max-width: 1024px) 50vw, 20vw"
                  className="size-full"
                />
                {inProduct > 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-primary px-2.5 py-0.5 text-[14px] font-bold text-primary-foreground">
                    {inProduct}
                  </span>
                )}
              </div>
              <p className="line-clamp-2 min-h-[2.5rem] text-[15px] leading-tight text-foreground">{p.name}</p>
              {p.variants.length > 1 && (
                <select
                  aria-label={`Variante de ${p.name}`}
                  value={vId}
                  onChange={(e) => setShownVariant((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  className="h-11 rounded-xl border border-border bg-white px-2 text-[15px]"
                >
                  {p.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              )}
              <div className="mt-auto flex items-center justify-between gap-2">
                <span className="text-[17px] font-bold tabular-nums">{formatPrice(info.price)}</span>
                <div className="flex items-center gap-1">
                  {qty > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => change(vId, -1)}
                        aria-label={`Quitar una unidad de ${p.name}`}
                        className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-white"
                      >
                        <Minus className="size-4" aria-hidden />
                      </button>
                      <span className="w-5 text-center text-[16px] font-semibold tabular-nums" aria-live="polite">
                        {qty}
                      </span>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => change(vId, 1)}
                    disabled={qty >= info.stock || units >= MAX_BUNDLE_UNITS}
                    aria-label={`Sumar ${p.name}`}
                    className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
                  >
                    <Plus className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-bar border-t border-border bg-white/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.18)] backdrop-blur-md md:bottom-0 md:py-4">
        <div className="container flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-[15px]" aria-live="polite">
            <p className="font-semibold text-foreground">
              {units === 0
                ? "Todavía no elegiste productos"
                : `${units} ${units === 1 ? "producto" : "productos"} · ${formatPrice(pricing.productsTotal)}`}
            </p>
            <p className="text-muted-foreground">
              {pricing.meetsMinimum
                ? packagingFee > 0
                  ? `+ empaque ${formatPrice(packagingFee)} · Total ${formatPrice(pricing.total)}`
                  : `Total ${formatPrice(pricing.total)}`
                : `Te faltan ${formatPrice(pricing.missing)} para llegar al mínimo de ${formatPrice(BUNDLE_MINIMUM)}`}
            </p>
            {error && (
              <p role="alert" className="font-medium text-destructive">
                {error}
              </p>
            )}
          </div>
          <Button type="button" variant="ink" size="lg" onClick={submit} disabled={pending || !pricing.meetsMinimum}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <ShoppingBag aria-hidden />}
            Sumar al carrito
          </Button>
        </div>
      </div>
    </div>
  );
}
