"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/money";
import { QuantityStepper } from "@/components/catalog/quantity-stepper";
import { updateCartItemAction, removeCartItemAction } from "@/app/(storefront)/actions";

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

  const setQty = (qty: number) =>
    startTransition(async () => {
      await updateCartItemAction(item.id, qty);
      router.refresh();
    });
  const remove = () =>
    startTransition(async () => {
      await removeCartItemAction(item.id);
      router.refresh();
    });

  return (
    <div className="flex gap-4 py-4 transition-opacity data-[pending]:opacity-60" data-pending={pending ? "" : undefined}>
      <div className="size-20 shrink-0 overflow-hidden rounded-[14px] bg-muted">
        {item.image ? <img src={item.image} alt="" className="size-full object-cover" /> : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[15px] font-semibold leading-snug text-foreground">{item.name}</p>
            {item.variantName && <p className="text-[14px] text-muted-foreground">{item.variantName}</p>}
          </div>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label={`Sacar ${item.name} del carrito`}
            className="-mr-2 -mt-2 grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Trash2 className="size-[18px]" aria-hidden />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <QuantityStepper initial={item.qty} max={99} onChange={setQty} />
          <span className="text-[16px] font-bold tabular-nums">{formatPrice(item.unitPrice * item.qty)}</span>
        </div>
      </div>
    </div>
  );
}
