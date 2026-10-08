"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";
import { ProductImage } from "@/components/catalog/product-image";
import { getEffectivePrice } from "@/lib/catalog/pricing";
import { formatPrice } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useCartUI } from "@/components/cart/cart-provider";
import { addKitToCartAction, addToCartAction } from "@/app/(storefront)/actions";
import { track } from "@/lib/analytics/track";
import type { CatalogProduct } from "@/lib/catalog/types";

interface CuratedComboItem {
  id: string;
  name: string;
  comboPrice: unknown;
  images: string[];
}

interface KitBuilderProps {
  labios: CatalogProduct[];
  ojos: CatalogProduct[];
  rostro: CatalogProduct[];
  curatedCombos: CuratedComboItem[];
}

interface SelectedSlot {
  product: CatalogProduct;
  variantId: string;
  variantName: string;
  price: number;
  image: string | null;
}

type Step = "labios" | "ojos" | "rostro";

const STEPS: Array<{ key: Step; label: string }> = [
  { key: "labios", label: "Labios" },
  { key: "ojos", label: "Ojos" },
  { key: "rostro", label: "Rostro" },
];

export function KitBuilder({ labios, ojos, rostro, curatedCombos }: KitBuilderProps) {
  const router = useRouter();
  const { openCart } = useCartUI();
  const [activeTab, setActiveTab] = useState<Step>("labios");
  const [pending, startTransition] = useTransition();
  const [slots, setSlots] = useState<Record<Step, SelectedSlot | null>>({ labios: null, ojos: null, rostro: null });

  const productsByStep: Record<Step, CatalogProduct[]> = { labios, ojos, rostro };
  const selectedCount = STEPS.filter((s) => slots[s.key]).length;
  const isComplete = selectedCount === 3;
  const rawSubtotal = STEPS.reduce((sum, s) => sum + (slots[s.key]?.price ?? 0), 0);

  const handleSelectProduct = (step: Step, product: CatalogProduct, variantId?: string, advance = true) => {
    const activeVariants = product.variants.filter((v) => v.active && v.stock > 0);
    const chosenVariant =
      (variantId ? activeVariants.find((v) => v.id === variantId) : null) ??
      activeVariants[0] ??
      product.variants[0];

    if (!chosenVariant) return;

    const slotData: SelectedSlot = {
      product,
      variantId: chosenVariant.id,
      variantName: chosenVariant.name,
      price: getEffectivePrice(product, chosenVariant),
      image: chosenVariant.image ?? product.images[0] ?? null,
    };

    setSlots((prev) => ({ ...prev, [step]: slotData }));
    // Avanza al próximo paso vacío (si lo hay); cambiar solo el tono no salta de paso.
    if (!advance) return;
    const next = STEPS.find((s) => s.key !== step && !slots[s.key]);
    if (next && step !== "rostro") setActiveTab(next.key);
  };

  const handleAddCustomKit = () => {
    const variantIds = STEPS.map((s) => slots[s.key]?.variantId).filter((v): v is string => Boolean(v));
    if (variantIds.length === 0) return;

    startTransition(async () => {
      const res = await addKitToCartAction(variantIds);
      if (res.ok) {
        track("add_to_cart", {
          kind: "custom_kit",
          variantIds,
          total: rawSubtotal,
        });
        router.refresh();
        openCart();
      }
    });
  };

  const handleAddCuratedCombo = (comboId: string, comboName: string, price: number) => {
    startTransition(async () => {
      const res = await addToCartAction({ comboId, qty: 1 });
      if (res.ok) {
        track("add_to_cart", {
          kind: "curated_combo",
          comboId,
          comboName,
          price,
        });
        router.refresh();
        openCart();
      }
    });
  };

  const renderProductStep = (step: Step) => {
    const currentSlot = slots[step];
    return (
      <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-4">
        {productsByStep[step].map((p) => {
          const isSelected = currentSlot?.product.id === p.id;
          const activeVariants = p.variants.filter((v) => v.active && v.stock > 0);
          const firstVariant = activeVariants[0] ?? p.variants[0];
          const shownVariantId = isSelected ? currentSlot.variantId : firstVariant?.id;
          const shownVariant = activeVariants.find((v) => v.id === shownVariantId) ?? firstVariant;
          const price = getEffectivePrice(p, shownVariant);
          const selectId = `kit-tone-${p.id}`;

          return (
            <li key={p.id} className="group flex flex-col">
              <div className={cn("relative overflow-hidden rounded-[14px] ring-2 ring-offset-2 transition", isSelected ? "ring-foreground" : "ring-transparent")}>
                <ProductImage
                  src={shownVariant?.image ?? p.images[0] ?? null}
                  alt={p.name}
                  fallbackLabel={p.name}
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="aspect-[4/5] rounded-none"
                />
                {isSelected && (
                  <span className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-primary text-white shadow-[0_4px_12px_-4px_rgb(0_0_0/0.35)] animate-in zoom-in-50 duration-200">
                    <Check className="size-4 stroke-[3]" aria-hidden />
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-1 flex-col">
                <h3 className="line-clamp-2 font-sans text-[15px] font-semibold leading-snug text-foreground">{p.name}</h3>
                <p className="mt-1 text-[17px] font-bold tabular-nums text-foreground">{formatPrice(price)}</p>
                {activeVariants.length > 1 && (
                  <div className="mt-2">
                    <label htmlFor={selectId} className="sr-only">Tono de {p.name}</label>
                    <select
                      id={selectId}
                      value={shownVariantId}
                      onChange={(e) => handleSelectProduct(step, p, e.target.value, false)}
                      className="h-11 w-full rounded-xl border border-input bg-white px-3 text-[15px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {activeVariants.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <span className="flex-1" aria-hidden />
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleSelectProduct(step, p, shownVariantId)}
                  className={cn(
                    "mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-[15px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
                    isSelected ? "border-foreground bg-foreground text-white" : "border-border bg-white text-foreground hover:border-foreground",
                  )}
                >
                  {isSelected ? (
                    <>
                      <Check className="size-4" aria-hidden /> Elegido
                    </>
                  ) : (
                    "Elegir"
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="space-y-10 pb-48 md:pb-32">
      <PageTitle eyebrow="3 pasos · 1 kit" lead="Armá tu" accent="kit" center>
        Elegí un favorito para labios, uno para ojos y uno para la piel, y sumalo todo al carrito de una.
      </PageTitle>

      {curatedCombos.length > 0 && (
        <section aria-labelledby="kits-listos" className="space-y-4 rounded-[24px] bg-secondary p-5 md:p-6">
          <h2 id="kits-listos" className="font-display text-[24px] leading-snug">
            O llevate uno <em className="font-medium text-primary">listo</em>
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {curatedCombos.map((combo) => {
              const price = Number(combo.comboPrice);
              return (
                <li key={combo.id} className="flex items-center gap-3 rounded-[18px] bg-white p-3">
                  <ProductImage
                    src={combo.images[0] ?? null}
                    alt={combo.name}
                    fallbackLabel={combo.name}
                    sizes="64px"
                    className="size-16 shrink-0 rounded-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-sans text-[15px] font-semibold text-foreground">{combo.name}</h3>
                    <p className="text-[15px] font-bold tabular-nums">{formatPrice(price)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ink"
                    disabled={pending}
                    onClick={() => handleAddCuratedCombo(combo.id, combo.name, price)}
                    className="h-11 shrink-0 px-4 text-[15px]"
                  >
                    Sumar
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Los 3 pasos */}
      <div role="tablist" aria-label="Pasos del kit" className="mx-auto grid max-w-2xl grid-cols-3 gap-2">
        {STEPS.map((s, i) => {
          const slot = slots[s.key];
          const active = activeTab === s.key;
          return (
            <button
              key={s.key}
              type="button"
              role="tab"
              id={`kit-tab-${s.key}`}
              aria-selected={active}
              aria-controls="kit-panel"
              onClick={() => setActiveTab(s.key)}
              className={cn(
                "flex min-h-14 items-center gap-2 rounded-2xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-3 sm:px-4",
                active ? "border-foreground bg-foreground text-white" : "border-border bg-white text-foreground hover:border-foreground/40",
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-bold",
                  slot ? "bg-primary text-white" : active ? "bg-white text-foreground" : "bg-secondary text-foreground",
                )}
              >
                {slot ? <Check className="size-3.5 stroke-[3]" aria-hidden /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold leading-tight">{s.label}</span>
                <span className={cn("hidden truncate text-[13px] sm:block", active ? "text-white/75" : "text-muted-foreground")}>
                  {slot ? slot.product.name : "Elegí uno"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div id="kit-panel" role="tabpanel" aria-labelledby={`kit-tab-${activeTab}`}>
        {renderProductStep(activeTab)}
      </div>

      {/* Barra fija: tu kit + total + CTA. En mobile va arriba del menú inferior. */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t border-border bg-white/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.18)] backdrop-blur-md md:bottom-0 md:py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-3 md:gap-6">
          <ul className="flex shrink-0 items-center gap-1.5" aria-label="Tu kit">
            {STEPS.map((s, i) => {
              const slot = slots[s.key];
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => setActiveTab(s.key)}
                    aria-label={slot ? `${s.label}: ${slot.product.name}, ${slot.variantName}` : `${s.label}: elegir`}
                    className={cn(
                      "relative grid size-11 place-items-center overflow-hidden rounded-xl text-[13px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      slot ? "ring-2 ring-primary ring-offset-1" : "border border-dashed border-foreground/25 bg-secondary text-muted-foreground",
                    )}
                  >
                    {slot ? (
                      <ProductImage src={slot.image} alt="" fallbackLabel={slot.product.name} sizes="44px" className="size-full rounded-none" />
                    ) : (
                      i + 1
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-muted-foreground">{isComplete ? "Tu kit" : `${selectedCount} de 3 elegidos`}</p>
            <p className="text-[18px] font-bold tabular-nums leading-tight" aria-live="polite">{formatPrice(rawSubtotal)}</p>
          </div>

          <Button
            type="button"
            variant="ink"
            size="lg"
            disabled={selectedCount === 0 || pending}
            onClick={handleAddCustomKit}
            className="shrink-0 px-5"
          >
            {pending ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                <span>Sumando…</span>
              </>
            ) : (
              <>
                <ShoppingBag aria-hidden />
                <span className="sm:hidden">{isComplete ? "Sumar kit" : "Sumar"}</span>
                <span className="hidden sm:inline">{isComplete ? "Sumar mi kit al carrito" : `Sumar lo elegido (${selectedCount}/3)`}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
