"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Plus, Loader2, Check } from "lucide-react";
import { formatPrice } from "@/lib/money";
import { addToCartAction } from "@/app/(storefront)/actions";
import { track } from "@/lib/analytics/track";
import type { BumpOffer } from "@/lib/catalog/recommend";

/** Order-bump: oferta de un complemento barato para subir el ticket (blueprint 06 §2). */
export function OrderBump({ offer }: { offer: BumpOffer | null }) {
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [pending, startTransition] = useTransition();

  // Si tras agregar el refresh trae otra oferta a este slot, reseteamos el estado "Agregado".
  useEffect(() => setAdded(false), [offer?.variantId]);

  if (!offer) return null;

  const add = () =>
    startTransition(async () => {
      const r = await addToCartAction({ variantId: offer.variantId });
      if (r.ok) {
        track("order_bump_added", { productId: offer.productId });
        setAdded(true);
        router.refresh();
      }
    });

  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-border bg-white p-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-primary">
        <Sparkles className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[17px] text-foreground">
          Completá tu <em className="font-medium text-primary">look</em>
        </p>
        <p className="truncate text-[14px] text-muted-foreground">
          {offer.name} · <span className="font-bold tabular-nums text-foreground">{formatPrice(offer.price)}</span>
        </p>
      </div>
      <button
        type="button"
        onClick={add}
        disabled={pending || added}
        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-foreground px-4 text-[14px] font-semibold text-foreground transition-colors hover:bg-foreground hover:text-white disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : added ? <Check className="size-4 text-success" aria-hidden /> : <Plus className="size-4" aria-hidden />}
        <span>{added ? "Sumado" : "Sumar"}</span>
      </button>
    </div>
  );
}
