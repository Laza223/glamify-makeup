"use client";

import { useState } from "react";
import { ProductImage } from "@/components/catalog/product-image";
import { cn } from "@/lib/utils";

/** Galería de la ficha: foto grande con fundido al cambiar y miniaturas de 64 px (targets ≥ 44). */
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const slides = images.length > 0 ? images : [""];
  const [active, setActive] = useState(0);
  return (
    <div className="space-y-3 md:flex md:flex-row-reverse md:gap-4 md:space-y-0">
      <div className="overflow-hidden rounded-[20px] bg-muted md:flex-1">
        <div key={active} className="animate-in fade-in-0 duration-300">
          <ProductImage
            src={slides[active] || null}
            alt={name}
            fallbackLabel={name}
            className="rounded-none"
            sizes="(max-width:1024px) 100vw, 50vw"
            priority
          />
        </div>
      </div>
      {slides.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none] md:flex-col md:overflow-visible" aria-label="Fotos">
          {slides.map((src, i) => (
            <li key={i} className="shrink-0">
              <button
                type="button"
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === active}
                onClick={() => setActive(i)}
                className={cn(
                  "size-16 overflow-hidden rounded-xl border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  i === active ? "border-foreground" : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <ProductImage src={src || null} alt="" fallbackLabel={name} className="rounded-none" sizes="64px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
