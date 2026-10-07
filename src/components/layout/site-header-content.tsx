"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Search, User, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { CategoryNav } from "@/components/layout/category-nav";
import { CartButton } from "@/components/cart/cart-button";
import type { CategoryNode } from "@/lib/catalog/categories";

interface SiteHeaderContentProps {
  tree: CategoryNode[];
  count: number;
}

const iconButton =
  "grid size-11 place-items-center rounded-full text-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Búsqueda por texto: GET a /tienda?q= (el filtro `q` ya existe en el catálogo). */
function SearchForm({ autoFocus, className }: { autoFocus?: boolean; className?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <form action="/tienda" role="search" className={className}>
      <label className="relative block">
        <span className="sr-only">Buscar productos</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          ref={ref}
          type="search"
          name="q"
          placeholder="Buscar labial, rubor, TEI…"
          enterKeyHint="search"
          className="h-11 w-full rounded-full border border-input bg-white pl-10 pr-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 md:text-[15px]"
        />
      </label>
    </form>
  );
}

export function SiteHeaderContent({ tree, count }: SiteHeaderContentProps) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  // Cerrar la búsqueda mobile al navegar.
  useEffect(() => setSearchOpen(false), [pathname]);

  if (pathname.startsWith("/checkout")) {
    return (
      <div className="border-b border-border bg-white">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" aria-label="Glamify Makeup, inicio" className="py-2">
            <Logo size="sm" />
          </Link>
          <Link
            href="/carrito"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Volver al carrito
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border bg-white">
      <div className="container flex h-14 items-center gap-3 md:h-16 lg:gap-6">
        <Link href="/" aria-label="Glamify Makeup, inicio" className="shrink-0 py-2">
          <Logo size="sm" />
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <SearchForm className="hidden w-60 lg:block" />
          <button
            type="button"
            className={`${iconButton} lg:hidden`}
            aria-label={searchOpen ? "Cerrar búsqueda" : "Buscar productos"}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((v) => !v)}
          >
            {searchOpen ? <X className="size-5" aria-hidden /> : <Search className="size-5" aria-hidden />}
          </button>
          <Link href="/cuenta" aria-label="Mi cuenta" className={`${iconButton} hidden md:grid`}>
            <User className="size-5" aria-hidden />
          </Link>
          <CartButton count={count} />
        </div>
      </div>
      <CategoryNav tree={tree} />
      {searchOpen && (
        <div className="container pb-3 lg:hidden">
          <SearchForm autoFocus />
        </div>
      )}
    </div>
  );
}
