"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { CategoryNode } from "@/lib/catalog/categories";

/** Segunda fila del header (md+): todas las categorías en una línea, con submenú al pasar o enfocar. */
export function CategoryNav({ tree }: { tree: CategoryNode[] }) {
  const pathname = usePathname();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <nav
      aria-label="Categorías"
      className="hidden border-t border-border md:block"
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpenId(null);
      }}
    >
      <ul className="container flex h-11 items-center gap-1 overflow-x-auto [scrollbar-width:none] lg:gap-2 xl:overflow-visible">
        <li>
          <Link
            href="/tienda"
            aria-current={pathname === "/tienda" ? "page" : undefined}
            className="inline-flex h-9 items-center rounded-full px-3 text-[15px] font-semibold text-foreground transition-colors hover:bg-muted hover:text-primary aria-[current=page]:bg-secondary"
          >
            Todo
          </Link>
        </li>
        {tree.map((cat) => {
          const hasChildren = cat.children.length > 0;
          const isOpen = openId === cat.id;
          const active = pathname.startsWith(`/tienda/${cat.slug}`);
          return (
            <li
              key={cat.id}
              className="relative"
              onMouseEnter={() => setOpenId(hasChildren ? cat.id : null)}
              onMouseLeave={() => setOpenId((cur) => (cur === cat.id ? null : cur))}
              onFocus={() => setOpenId(hasChildren ? cat.id : null)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setOpenId((cur) => (cur === cat.id ? null : cur));
                }
              }}
            >
              <Link
                href={`/tienda/${cat.slug}`}
                aria-expanded={hasChildren ? isOpen : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center whitespace-nowrap rounded-full px-3 text-[15px] font-medium text-foreground transition-colors hover:bg-muted hover:text-primary",
                  active && "bg-secondary font-semibold",
                )}
              >
                {cat.name}
              </Link>
              {hasChildren && isOpen && (
                <ul className="absolute left-0 top-full z-20 min-w-52 rounded-[14px] border border-border bg-white p-1.5 shadow-[0_8px_24px_-12px_rgb(110_10_60/0.25)]">
                  {cat.children.map((sub) => (
                    <li key={sub.id}>
                      <Link
                        href={`/tienda/${cat.slug}/${sub.slug}`}
                        className="flex min-h-11 items-center rounded-[10px] px-3 text-[15px] text-foreground transition-colors hover:bg-muted hover:text-primary"
                      >
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
