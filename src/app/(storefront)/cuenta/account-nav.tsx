"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutAction } from "../ingresar/actions";

const LINKS = [
  { href: "/cuenta", label: "Inicio" },
  { href: "/cuenta/pedidos", label: "Mis pedidos" },
  { href: "/cuenta/favoritos", label: "Favoritos" },
  { href: "/cuenta/datos", label: "Mis datos" },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones de mi cuenta" className="flex items-center gap-3 border-b border-border pb-4">
      <ul className="-mx-4 flex flex-1 gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {LINKS.map((l) => {
          const active = l.href === "/cuenta" ? pathname === "/cuenta" : pathname.startsWith(l.href);
          return (
            <li key={l.href} className="shrink-0">
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center rounded-full border px-5 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-foreground bg-foreground text-white" : "border-border text-foreground hover:border-foreground/30",
                )}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <form action={signOutAction} className="shrink-0">
        <button
          type="submit"
          className="inline-flex h-11 items-center gap-2 rounded-full px-3 text-[15px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="size-[18px]" aria-hidden />
          <span className="hidden sm:inline">Salir</span>
          <span className="sr-only sm:hidden">Salir</span>
        </button>
      </form>
    </nav>
  );
}
