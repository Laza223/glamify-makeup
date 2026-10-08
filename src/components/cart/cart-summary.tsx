import { formatPrice } from "@/lib/money";

export interface CartSummaryProps {
  subtotal: number;
  discount: number;
  shippingCost: number | null; // null = "se calcula en checkout"
  total: number;
  freeShipping?: boolean;
}

export function CartSummary({ subtotal, discount, shippingCost, total, freeShipping }: CartSummaryProps) {
  return (
    <dl className="space-y-2.5 text-[16px]">
      <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{formatPrice(subtotal)}</dd></div>
      {discount > 0 && (
        <div className="flex justify-between font-semibold text-accent"><dt>Descuento</dt><dd className="tabular-nums">−{formatPrice(discount)}</dd></div>
      )}
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Envío</dt>
        <dd className="tabular-nums">{freeShipping ? "Gratis" : shippingCost == null ? "A calcular" : formatPrice(shippingCost)}</dd>
      </div>
      <div className="flex items-baseline justify-between border-t border-border pt-3 text-[18px] font-bold">
        <dt>Total</dt><dd className="text-[22px] tabular-nums">{formatPrice(total)}</dd>
      </div>
    </dl>
  );
}
