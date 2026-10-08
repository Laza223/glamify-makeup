import Link from "next/link";

/**
 * Tira de marcas en movimiento continuo. El contenido va duplicado para que el loop no tenga corte;
 * la copia es aria-hidden y sin foco. Se pausa con hover/foco y queda quieta con reduced-motion.
 */
export function BrandMarquee({ brands }: { brands: string[] }) {
  if (brands.length === 0) return null;
  // Con pocas marcas, una vuelta no llena el ancho de desktop: se repite hasta ~12 ítems por copia.
  const row = Array.from({ length: Math.ceil(12 / brands.length) }, () => brands).flat();
  const items = (copy: boolean) =>
    row.map((brand, i) => (
      <li key={`${copy ? "b" : "a"}-${i}`} aria-hidden={i >= brands.length || undefined} className="flex shrink-0 items-center">
        <Link
          href={`/tienda?q=${encodeURIComponent(brand)}`}
          tabIndex={copy || i >= brands.length ? -1 : undefined}
          className="inline-flex min-h-11 items-center px-6 font-display text-[26px] italic text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:px-10 md:text-[34px]"
        >
          {brand}
        </Link>
        <span aria-hidden className="size-1.5 rounded-full bg-primary" />
      </li>
    ));

  return (
    <nav aria-label="Marcas" className="group relative -mx-4 overflow-hidden border-y border-border py-3 md:mx-0">
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none">
        <ul className="flex">{items(false)}</ul>
        <ul className="flex" aria-hidden>
          {items(true)}
        </ul>
      </div>
    </nav>
  );
}
