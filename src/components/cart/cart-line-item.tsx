"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/money";
import { QuantityStepper } from "@/components/catalog/quantity-stepper";
import { ProductImage } from "@/components/catalog/product-image";
import { updateCartItemAction, removeCartItemAction } from "@/app/(storefront)/actions";
import type { ActionResult } from "@/lib/forms/action-result";

export interface CartLineItemView {
  id: string;
  name: string;
  variantName?: string | null;
  unitPrice: number;
  qty: number;
  image?: string | null;
}

export function CartLineItem({ item }: { item: CartLineItemView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [error, setError] = useState<string | null>(null);
  // Sube cuando falla un cambio: remonta el stepper con la cantidad que sigue vigente en el server.
  const [stepperKey, setStepperKey] = useState(0);

  const run = (action: () => Promise<ActionResult>) =>
    startTransition(async () => {
      setError(null);
      const r = await action().catch((): ActionResult => ({ ok: false }));
      // También al fallar: la línea pudo cambiar en otra pestaña y sin refrescar queda una fantasma.
      router.refresh();
      if (r.ok) return;
      setError(r.error ?? "No pudimos actualizar tu carrito. Probá de nuevo.");
      setStepperKey((k) => k + 1);
    });
  const setQty = (qty: number) => run(() => updateCartItemAction(item.id, qty));
  const remove = () => run(() => removeCartItemAction(item.id));

  return (
    <div className="flex gap-4 py-4 transition-opacity data-[pending]:opacity-60" data-pending={pending ? "" : undefined}>
      <div className="size-20 shrink-0 overflow-hidden rounded-[14px] bg-muted">
        <ProductImage src={item.image} alt={item.name} fallbackLabel={item.name} sizes="80px" className="size-full" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="line-clamp-2 break-words text-[15px] font-semibold leading-snug text-foreground">{item.name}</p>
            {item.variantName && <p className="break-words text-[14px] text-muted-foreground">{item.variantName}</p>}
          </div>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label={`Sacar ${item.name} del carrito`}
            className="-mt-2 grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Trash2 className="size-[18px]" aria-hidden />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <QuantityStepper key={stepperKey} initial={item.qty} max={99} onChange={setQty} />
          <span className="text-[16px] font-bold tabular-nums">{formatPrice(item.unitPrice * item.qty)}</span>
        </div>
        {error && <p role="alert" className="text-[14px] text-destructive">{error}</p>}
      </div>
    </div>
  );
}
