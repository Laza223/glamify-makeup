"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, Sparkles, Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { productImageUrl } from "@/lib/images";
import { getEffectivePrice } from "@/lib/catalog/pricing";
import { formatARS } from "@/lib/money";
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

export function KitBuilder({ labios, ojos, rostro, curatedCombos }: KitBuilderProps) {
  const router = useRouter();
  const { openCart } = useCartUI();
  const [activeTab, setActiveTab] = useState<"labios" | "ojos" | "rostro">("labios");
  const [pending, startTransition] = useTransition();

  const [selectedLabios, setSelectedLabios] = useState<SelectedSlot | null>(null);
  const [selectedOjos, setSelectedOjos] = useState<SelectedSlot | null>(null);
  const [selectedRostro, setSelectedRostro] = useState<SelectedSlot | null>(null);

  const selectedCount = [selectedLabios, selectedOjos, selectedRostro].filter(Boolean).length;
  const isComplete = selectedCount === 3;

  const rawSubtotal =
    (selectedLabios?.price ?? 0) +
    (selectedOjos?.price ?? 0) +
    (selectedRostro?.price ?? 0);


  const handleSelectProduct = (step: "labios" | "ojos" | "rostro", product: CatalogProduct, variantId?: string) => {
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

    if (step === "labios") {
      setSelectedLabios(slotData);
      if (!selectedOjos) setActiveTab("ojos");
    } else if (step === "ojos") {
      setSelectedOjos(slotData);
      if (!selectedRostro) setActiveTab("rostro");
    } else {
      setSelectedRostro(slotData);
    }
  };

  const handleAddCustomKit = () => {
    const variantIds = [selectedLabios?.variantId, selectedOjos?.variantId, selectedRostro?.variantId].filter(
      (v): v is string => Boolean(v)
    );
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

  const renderProductStep = (products: CatalogProduct[], step: "labios" | "ojos" | "rostro", currentSlot: SelectedSlot | null) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((p) => {
        const isSelected = currentSlot?.product.id === p.id;
        const activeVariants = p.variants.filter((v) => v.active && v.stock > 0);
        const firstVariant = activeVariants[0] ?? p.variants[0];
        const effectivePrice = getEffectivePrice(p, firstVariant);
        const img = productImageUrl(firstVariant?.image ?? p.images[0]);

        return (
          <div
            key={p.id}
            onClick={() => handleSelectProduct(step, p)}
            className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-3 cursor-pointer transition-all duration-200 select-none ${
              isSelected
                ? "border-primary ring-2 ring-primary shadow-soft-lg"
                : "border-border/70 hover:border-neutral-300 hover:shadow-soft"
            }`}
          >
            {isSelected && (
              <div className="absolute top-2 right-2 z-10 size-6 rounded-full bg-primary text-white flex items-center justify-center shadow-sm">
                <Check className="size-3.5 stroke-[3]" />
              </div>
            )}

            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-secondary mb-2.5">
              {img ? (
                <Image
                  src={img}
                  alt={p.name}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-primary font-bold">
                  {p.name.charAt(0)}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{p.category.name}</p>
              <h4 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-1">{p.name}</h4>
              <p className="text-xs font-bold text-foreground tabular-nums">{formatARS(effectivePrice)}</p>

              {/* Tonos si tiene más de una variante */}
              {activeVariants.length > 1 && (
                <div className="pt-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {activeVariants.slice(0, 4).map((v) => {
                    const isVariantSelected = isSelected && currentSlot?.variantId === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectProduct(step, p, v.id);
                        }}
                        title={v.name}
                        className={`size-4 rounded-full border transition-transform ${
                          isVariantSelected ? "ring-2 ring-primary scale-110" : "border-neutral-300"
                        }`}
                        style={{ backgroundColor: v.swatchHex ?? "#e5e5e5" }}
                      />
                    );
                  })}
                  {activeVariants.length > 4 && (
                    <span className="text-[9px] text-muted-foreground">+{activeVariants.length - 4}</span>
                  )}
                </div>
              )}
            </div>

            <Button
              type="button"
              size="sm"
              variant={isSelected ? "default" : "outline"}
              className={`mt-3 w-full rounded-xl text-xs font-semibold py-1.5 ${
                isSelected ? "bg-primary text-white hover:bg-primary-hover" : "hover:bg-secondary"
              }`}
            >
              {isSelected ? "Seleccionado" : "Elegir"}
            </Button>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-10 pb-32">
      {/* Encabezado Editorial */}
      <header className="space-y-2 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary">
          <Sparkles className="size-3.5" />
          <span>Bundle Builder</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-foreground leading-tight">
          Armá tu Kit Personalizado
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Elegí 1 favorito para <strong>Labios</strong>, 1 para <strong>Ojos</strong> y 1 para <strong>Piel</strong> y sumá el kit completo al carrito de una.
        </p>
      </header>

      {/* Atajos a Kits Precurados (si existen) */}
      {curatedCombos.length > 0 && (
        <section className="space-y-4 rounded-3xl border border-pink-100 bg-gradient-to-b from-pink-50/40 to-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">
              O elegí un kit estrella listo para llevar
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {curatedCombos.map((combo) => {
              const price = Number(combo.comboPrice);
              const img = combo.images[0] ? productImageUrl(combo.images[0]) : null;
              return (
                <div
                  key={combo.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-white p-3 shadow-xs hover:shadow-soft transition-shadow"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-secondary">
                      {img ? (
                        <Image src={img} alt={combo.name} fill className="object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-primary font-bold">K</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-semibold text-foreground truncate">{combo.name}</h3>
                      <p className="text-xs font-bold text-primary">{formatARS(price)}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => handleAddCuratedCombo(combo.id, combo.name, price)}
                    className="shrink-0 rounded-xl bg-[#161413] text-white hover:bg-neutral-800 text-xs px-3"
                  >
                    Agregar
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Tabs de Navegación de los 3 Pasos */}
      <div className="flex justify-center border-b border-border">
        <div className="flex gap-2 sm:gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("labios")}
            className={`flex items-center gap-2 pb-3 text-xs sm:text-sm font-bold tracking-wide transition-all border-b-2 ${
              activeTab === "labios"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={`size-5 rounded-full text-[10px] font-bold flex items-center justify-center ${selectedLabios ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
              {selectedLabios ? "✓" : "1"}
            </span>
            <span>1. Labios</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ojos")}
            className={`flex items-center gap-2 pb-3 text-xs sm:text-sm font-bold tracking-wide transition-all border-b-2 ${
              activeTab === "ojos"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={`size-5 rounded-full text-[10px] font-bold flex items-center justify-center ${selectedOjos ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
              {selectedOjos ? "✓" : "2"}
            </span>
            <span>2. Ojos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rostro")}
            className={`flex items-center gap-2 pb-3 text-xs sm:text-sm font-bold tracking-wide transition-all border-b-2 ${
              activeTab === "rostro"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={`size-5 rounded-full text-[10px] font-bold flex items-center justify-center ${selectedRostro ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
              {selectedRostro ? "✓" : "3"}
            </span>
            <span>3. Rostro</span>
          </button>
        </div>
      </div>

      {/* Contenido del paso activo */}
      <div>
        {activeTab === "labios" && renderProductStep(labios, "labios", selectedLabios)}
        {activeTab === "ojos" && renderProductStep(ojos, "ojos", selectedOjos)}
        {activeTab === "rostro" && renderProductStep(rostro, "rostro", selectedRostro)}
      </div>

      {/* Sticky Bottom Bar con los 3 Slots y CTA de Compra */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-white/95 backdrop-blur-md p-3 sm:p-4 shadow-soft-lg">
        <div className="container max-w-4xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Slots visuales de los 3 productos */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Slot 1 */}
            <div
              onClick={() => setActiveTab("labios")}
              className={`flex items-center gap-2 rounded-xl border p-1.5 cursor-pointer transition-all ${
                selectedLabios ? "border-primary bg-primary/5" : "border-dashed border-border bg-secondary/60 text-muted-foreground"
              }`}
            >
              <div className="relative size-9 rounded-lg overflow-hidden bg-white shrink-0">
                {selectedLabios?.image ? (
                  <Image src={productImageUrl(selectedLabios.image) ?? ""} alt="" fill className="object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[10px] font-bold">1</div>
                )}
              </div>
              <div className="hidden sm:block text-left pr-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Labios</p>
                <p className="text-xs font-semibold text-foreground truncate max-w-[90px]">
                  {selectedLabios ? selectedLabios.product.name : "Elegir"}
                </p>
              </div>
            </div>

            {/* Slot 2 */}
            <div
              onClick={() => setActiveTab("ojos")}
              className={`flex items-center gap-2 rounded-xl border p-1.5 cursor-pointer transition-all ${
                selectedOjos ? "border-primary bg-primary/5" : "border-dashed border-border bg-secondary/60 text-muted-foreground"
              }`}
            >
              <div className="relative size-9 rounded-lg overflow-hidden bg-white shrink-0">
                {selectedOjos?.image ? (
                  <Image src={productImageUrl(selectedOjos.image) ?? ""} alt="" fill className="object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[10px] font-bold">2</div>
                )}
              </div>
              <div className="hidden sm:block text-left pr-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Ojos</p>
                <p className="text-xs font-semibold text-foreground truncate max-w-[90px]">
                  {selectedOjos ? selectedOjos.product.name : "Elegir"}
                </p>
              </div>
            </div>

            {/* Slot 3 */}
            <div
              onClick={() => setActiveTab("rostro")}
              className={`flex items-center gap-2 rounded-xl border p-1.5 cursor-pointer transition-all ${
                selectedRostro ? "border-primary bg-primary/5" : "border-dashed border-border bg-secondary/60 text-muted-foreground"
              }`}
            >
              <div className="relative size-9 rounded-lg overflow-hidden bg-white shrink-0">
                {selectedRostro?.image ? (
                  <Image src={productImageUrl(selectedRostro.image) ?? ""} alt="" fill className="object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[10px] font-bold">3</div>
                )}
              </div>
              <div className="hidden sm:block text-left pr-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Rostro</p>
                <p className="text-xs font-semibold text-foreground truncate max-w-[90px]">
                  {selectedRostro ? selectedRostro.product.name : "Elegir"}
                </p>
              </div>
            </div>
          </div>

          {/* Precio y CTA */}
          <div className="flex items-center justify-between sm:justify-end gap-4">
            <div className="text-left sm:text-right">
              <div>
                <p className="text-xs text-muted-foreground">
                  {isComplete ? "Total del kit" : `${selectedCount} de 3 elegidos`}
                </p>
                <p className="text-base sm:text-lg font-bold text-foreground tabular-nums">
                  {formatARS(rawSubtotal)}
                </p>
              </div>
            </div>

            <Button
              type="button"
              size="lg"
              disabled={selectedCount === 0 || pending}
              onClick={handleAddCustomKit}
              className="rounded-2xl bg-[#161413] text-white hover:bg-neutral-800 px-6 py-5 text-sm font-semibold shadow-soft"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  <span>Agregando...</span>
                </>
              ) : isComplete ? (
                <>
                  <ShoppingBag className="size-4 mr-2" />
                  <span>Agregar Kit al Carrito</span>
                </>
              ) : (
                <span>Agregar Selección ({selectedCount}/3)</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
