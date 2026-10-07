import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CategoryNode } from "@/lib/catalog/categories";

interface CategoryChipsNavProps {
  categories: CategoryNode[];
  activeSlug?: string;
  className?: string;
}

const CHIP =
  "inline-flex min-h-11 select-none items-center justify-center rounded-full border px-5 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const ON = "border-foreground bg-foreground text-white";
const OFF = "border-border bg-white text-foreground hover:border-primary hover:text-accent";

/** Chips de categorías del listado: la activa en negro, el resto con borde fino y hover rosa. */
export function CategoryChipsNav({ categories, activeSlug, className }: CategoryChipsNavProps) {
  return (
    <nav aria-label="Categorías" className={cn("-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0", className)}>
      <ul className="flex min-w-max items-center gap-2 py-1">
        <li>
          <Link href="/tienda" aria-current={!activeSlug ? "page" : undefined} className={cn(CHIP, !activeSlug ? ON : OFF)}>
            Todo
          </Link>
        </li>
        {categories.map((cat) => {
          const isActive = activeSlug === cat.slug;
          return (
            <li key={cat.id}>
              <Link
                href={`/tienda/${cat.slug}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(CHIP, isActive ? ON : OFF)}
              >
                {cat.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
