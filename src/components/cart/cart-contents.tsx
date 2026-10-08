import Link from "next/link";
import { Lock } from "lucide-react";
import { getCartView } from "@/lib/cart/cart-view";
import { round2, formatPrice } from "@/lib/money";
import { productImageUrl } from "@/lib/images";
import { CouponInput } from "@/components/cart/coupon-input";
import { Separator } from "@/components/ui/separator";
import { CartLineItem } from "@/components/cart/cart-line-item";
import { FreeShippingBar } from "@/components/cart/free-shipping-bar";
import { CartSummary } from "@/components/cart/cart-summary";
import { EmptyCart } from "@/components/cart/empty-cart";
import { OrderBump } from "@/components/cart/order-bump";
import { getOrderBumpOffers } from "@/lib/catalog/recommendations";
import { selectOrderBump } from "@/lib/catalog/recommend";

/** Contenido del carrito para el drawer (server component, se refresca con router.refresh). */
export async function CartContents() {
  const { cart, subtotal, physicalSubtotal, digitalOnly, count, threshold, coupon } = await getCartView();
  if (!cart || count === 0) return <EmptyCart />;

  const discount = coupon?.discount ?? 0;
  const total = round2(subtotal - discount);

  const cartVariantIds = cart.items.map((i) => i.variantId).filter((v): v is string => Boolean(v));
  const bump = selectOrderBump(await getOrderBumpOffers(), cartVariantIds);

  return (
    <div className="flex h-full flex-col gap-4">
      {!digitalOnly && <FreeShippingBar subtotal={physicalSubtotal} threshold={threshold} />}
      <div className="flex-1 divide-y divide-border">
        {cart.items.map((item) => (
          <CartLineItem
            key={item.id}
            item={{
              id: item.id,
              name: item.combo ? item.combo.name : item.variant!.product.name,
              variantName: item.combo ? null : item.variant!.name,
              unitPrice: Number(item.unitPriceSnapshot),
              qty: item.qty,
              image: productImageUrl(item.combo ? item.combo.images[0] ?? null : item.variant!.image ?? item.variant!.product.images[0] ?? null),
            }}
          />
        ))}
      </div>
      {bump && <OrderBump offer={bump} />}
      <Separator />
      <CouponInput applied={coupon?.code ?? null} />
      <CartSummary subtotal={subtotal} discount={discount} shippingCost={digitalOnly ? 0 : null} total={total} freeShipping={coupon?.freeShipping} />
      
      <div className="grid gap-2 pt-2">
        <Link
          href="/checkout"
          className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-foreground px-6 text-[16px] font-semibold text-white transition hover:bg-foreground/85 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Finalizar compra · <span className="ml-1 tabular-nums">{formatPrice(total)}</span>
        </Link>
        <Link
          href="/carrito"
          className="inline-flex h-11 w-full items-center justify-center rounded-2xl text-[15px] font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ver carrito completo
        </Link>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-[14px] text-muted-foreground">
        <Lock className="size-4 text-success" aria-hidden />
        Pagás seguro con Mercado Pago
      </p>
    </div>
  );
}
