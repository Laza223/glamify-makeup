"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Store,
  Sparkles,
  ShoppingBag,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartUI } from "@/components/cart/cart-provider";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  enabled: boolean;
}

const ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: Home, enabled: true },
  { href: "/tienda", label: "Tienda", icon: Store, enabled: true },
  { href: "/arma-tu-kit", label: "Armá tu kit", icon: Sparkles, enabled: true },
  { href: "/carrito", label: "Carrito", icon: ShoppingBag, enabled: true },
  { href: "/cuenta", label: "Cuenta", icon: User, enabled: true },
];

export function BottomNav({ cartCount = 0 }: { cartCount?: number }) {
  const pathname = usePathname();
  const { openCart, cartCount: ctxCount } = useCartUI();
  const effectiveCount = typeof ctxCount === "number" ? ctxCount : cartCount;

  if (pathname.startsWith("/checkout")) return null;

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const isCart = item.label === "Carrito";
          const active =
            item.enabled &&
            (item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href));
          const Icon = item.icon;
          const content = (
            <span
              className={cn(
                "relative flex h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors",
                active ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-secondary text-accent")}>
                <Icon className="size-5" aria-hidden />
              </span>
              {isCart && effectiveCount > 0 && (
                <span className="absolute right-[22%] top-1 grid min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[11px] font-bold leading-[18px] tabular-nums text-primary-foreground">
                  {effectiveCount}
                </span>
              )}
              <span>{item.label}</span>
            </span>
          );

          if (isCart) {
            return (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={openCart}
                  aria-label={`Carrito${effectiveCount > 0 ? ` (${effectiveCount})` : ""}`}
                  className="w-full"
                >
                  {content}
                </button>
              </li>
            );
          }
          return (
            <li key={item.label}>
              {item.enabled ? (
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                >
                  {content}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  title="Próximamente"
                  className="cursor-not-allowed opacity-40"
                >
                  {content}
                  <span className="sr-only">Próximamente</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
