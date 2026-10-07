"use client";

import { useMemo } from "react";
import { Plus, Minus, Loader2 } from "lucide-react";
import { useCartUI } from "@/components/cart/cart-provider";
import { cn } from "@/lib/utils";
import type { CatalogVariant } from "@/lib/catalog/types";

interface CardQuickStepperProps {
  productId: string;
  variants: CatalogVariant[];
  selectedVariantId?: string;
  onOpenPicker?: () => void;
  className?: string;
}

export function CardQuickStepper({
  productId,
  variants,
  selectedVariantId,
  onOpenPicker,
  className,
}: CardQuickStepperProps) {
  const { getVariantQty, getProductQty, setVariantQty, isUpdating } =
    useCartUI();

  // Encontrar la variante activa para operar:
  // 1. Si hay una variante seleccionada explícitamente en la card
  // 2. O la primera variante que ya esté en el carrito
  // 3. O la primera variante disponible con stock
  const activeVariant = useMemo(() => {
    if (selectedVariantId) {
      const found = variants.find((v) => v.id === selectedVariantId);
      if (found) return found;
    }
    const inCart = variants.find((v) => getVariantQty(v.id) > 0);
    if (inCart) return inCart;
    return variants.find((v) => v.stock > 0) ?? variants[0];
  }, [variants, selectedVariantId, getVariantQty]);

  const hasMultipleVariants = variants.length > 1;
  const isSelectedExplicitly = Boolean(selectedVariantId);

  // Cantidad actual: si la variante activa está en carrito, usamos esa.
  // Si no hay variante específica pero hay unidades del producto en carrito, usamos el total.
  const currentQty = activeVariant
    ? getVariantQty(activeVariant.id)
    : getProductQty(productId);

  const pending = activeVariant ? isUpdating(activeVariant.id) : false;
  const maxStock = activeVariant?.stock ?? 99;
  const canIncrement = currentQty < maxStock;

  const handleInitialClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Si tiene múltiples variantes y no se seleccionó una explícitamente:
    if (hasMultipleVariants && !isSelectedExplicitly && currentQty === 0) {
      onOpenPicker?.();
      return;
    }

    if (activeVariant && activeVariant.stock > 0) {
      void setVariantQty(activeVariant.id, 1, productId);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canIncrement || !activeVariant) return;
    void setVariantQty(activeVariant.id, currentQty + 1, productId);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!activeVariant) return;
    void setVariantQty(
      activeVariant.id,
      Math.max(0, currentQty - 1),
      productId,
    );
  };

  const isExpanded = currentQty > 0;

  return (
    <div
      className={cn("relative inline-flex items-center justify-end", className)}
      role="group"
      aria-label="Agregar al carrito"
    >
      {/* Contenedor animado: botón + que se abre en stepper, targets de 44 px */}
      <div
        className={cn(
          "relative flex items-center overflow-hidden transition-all duration-300 ease-out",
          isExpanded
            ? "h-11 w-[140px] justify-between rounded-full border-2 border-primary bg-white"
            : "h-11 w-11 justify-center rounded-full bg-primary text-primary-foreground shadow-[0_3px_8px_-3px_rgb(224_23_122/0.6)] hover:bg-primary-hover active:scale-95",
        )}
      >
        {/* ESTADO NO EXPANDIDO (Qty = 0): Botón circular [+] */}
        {!isExpanded && (
          <button
            type="button"
            onClick={handleInitialClick}
            disabled={pending || !activeVariant || activeVariant.stock <= 0}
            aria-label="Agregar al carrito"
            className="flex size-full items-center justify-center text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-5 stroke-[2.5]" aria-hidden />
            )}
          </button>
        )}

        {/* ESTADO EXPANDIDO (Qty > 0): [-] [qty] [+] */}
        {isExpanded && (
          <>
            {/* Botón [-] Restar */}
            <button
              type="button"
              onClick={handleDecrement}
              disabled={pending}
              aria-label={
                currentQty === 1 ? "Eliminar del carrito" : "Restar una unidad"
              }
              className="grid h-full w-11 place-items-center rounded-full text-accent transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-90"
            >
              <Minus className="size-3.5 stroke-[2.5]" aria-hidden />
            </button>

            {/* Número central con microanimación de pop */}
            <span
              className="flex min-w-[22px] select-none items-center justify-center text-center text-[15px] font-bold tabular-nums text-foreground"
              aria-live="polite"
            >
              {pending ? (
                <Loader2 className="size-3 animate-spin text-primary" />
              ) : (
                <span
                  key={currentQty}
                  className="inline-block duration-150 animate-in zoom-in-75"
                >
                  {currentQty}
                </span>
              )}
            </span>

            {/* Botón [+] Sumar */}
            <button
              type="button"
              onClick={handleIncrement}
              disabled={pending || !canIncrement}
              aria-label="Sumar una unidad"
              className={cn(
                "grid h-full w-11 place-items-center rounded-full text-accent transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-90",
                (!canIncrement || pending) &&
                  "cursor-not-allowed opacity-30 hover:bg-transparent",
              )}
            >
              <Plus className="size-3.5 stroke-[2.5]" aria-hidden />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
