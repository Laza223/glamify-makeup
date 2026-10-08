import type { Metadata } from "next";
import { getCartView } from "@/lib/cart/cart-view";
import { round2 } from "@/lib/money";
import { productImageUrl } from "@/lib/images";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { CartLineItem } from "@/components/cart/cart-line-item";
import { FreeShippingBar } from "@/components/cart/free-shipping-bar";
import { CouponInput } from "@/components/cart/coupon-input";
import { CartSummary } from "@/components/cart/cart-summary";
import { EmptyCart } from "@/components/cart/empty-cart";
import { OrderBump } from "@/components/cart/order-bump";
import { CrossSell } from "@/components/catalog/cross-sell";
import { getOrderBumpOffers, getCartCrossSell } from "@/lib/catalog/recommendations";
import { selectOrderBump } from "@/lib/catalog/recommend";

export const metadata: Metadata = { title: "Tu carrito" };

export default async function CarritoPage() {
  const { cart, subtotal, physicalSubtotal, digitalOnly, count, threshold, coupon } = await getCartView();

  if (!cart || count === 0) {
    return (
      <div className="mx-auto max-w-md py-8">
        <h1 className="mb-6 text-center font-display text-[34px] font-normal">
          Tu <em className="font-medium text-primary">carrito</em>
        </h1>
        <EmptyCart />
      </div>
    );
  }

  const discount = coupon?.discount ?? 0;
  const total = round2(subtotal - discount);

  const cartVariantIds = cart.items.map((i) => i.variantId).filter((v): v is string => Boolean(v));
  const cartCategoryIds = [...new Set(cart.items.map((i) => i.variant?.product.categoryId).filter((v): v is string => Boolean(v)))];
  const cartProductIds = cart.items.map((i) => i.variant?.product.id).filter((v): v is string => Boolean(v));
  const [bump, related] = await Promise.all([
    getOrderBumpOffers().then((offers) => selectOrderBump(offers, cartVariantIds)),
    getCartCrossSell(cartCategoryIds, cartProductIds, 4),
  ]);

  return (
    <div className="mx-auto max-w-5xl py-6">
      <h1 className="mb-6 font-display text-[34px] font-normal leading-tight md:text-[44px]">
        Tu <em className="font-medium text-primary">carrito</em>{" "}
        <span className="font-sans text-[18px] font-semibold text-muted-foreground">
          ({count === 1 ? "1 producto" : `${count} productos`})
        </span>
      </h1>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {!digitalOnly && <FreeShippingBar subtotal={physicalSubtotal} threshold={threshold} />}
          <div className="divide-y divide-border rounded-[20px] border border-border px-4 md:px-5">
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
        </div>
        <aside className="space-y-4 rounded-[20px] bg-secondary p-5 lg:sticky lg:top-32 lg:self-start md:p-6">
          <CouponInput applied={coupon?.code ?? null} />
          <Separator />
          <CartSummary subtotal={subtotal} discount={discount} shippingCost={digitalOnly ? 0 : null} total={total} freeShipping={coupon?.freeShipping} />
          <p className="text-[14px] text-muted-foreground">El envío se calcula en el checkout con tu código postal.</p>
          <Link
            href="/checkout"
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-foreground px-6 text-[16px] font-semibold text-white transition hover:bg-foreground/85 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Iniciar compra
          </Link>
        </aside>
      </div>
      <div className="mt-10">
        <CrossSell products={related} />
      </div>
    </div>
  );
}
