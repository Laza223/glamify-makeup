import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export function EmptyCart() {
  return (
    <div className="flex flex-col items-center gap-5 py-12 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-secondary text-primary">
        <ShoppingBag className="size-7" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="font-display text-[26px] text-foreground">
          Tu carrito está <em className="font-medium text-primary">vacío</em>
        </p>
        <p className="text-[16px] text-muted-foreground">Date una vuelta y sumá tus favoritos.</p>
      </div>
      <Link
        href="/tienda"
        className="inline-flex h-12 items-center rounded-2xl bg-foreground px-7 text-[16px] font-semibold text-white transition hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Ir a la tienda
      </Link>
    </div>
  );
}
