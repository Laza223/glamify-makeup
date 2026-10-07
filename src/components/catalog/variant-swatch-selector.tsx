"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStockState } from "@/lib/catalog/stock";
import { StockBadge } from "@/components/catalog/stock-badge";
import type { CatalogVariant } from "@/lib/catalog/types";

interface VariantSwatchSelectorProps {
  variants: CatalogVariant[];
  onChange?: (variant: CatalogVariant) => void;
}

export function VariantSwatchSelector({
  variants,
  onChange,
}: VariantSwatchSelectorProps) {
  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [selectedId, setSelectedId] = useState(firstAvailable?.id);
  const selected = variants.find((v) => v.id === selectedId) ?? firstAvailable;
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const select = (v: CatalogVariant) => {
    setSelectedId(v.id);
    onChange?.(v);
  };

  // Índices de tonos con stock; los sin stock se saltean en la navegación por teclado.
  const selectableIdx = variants.flatMap((v, i) => (v.stock > 0 ? [i] : []));

  const moveSelection = (currentIdx: number, dir: 1 | -1 | "home" | "end") => {
    if (selectableIdx.length === 0) return;
    let nextIdx: number;
    if (dir === "home") nextIdx = selectableIdx[0];
    else if (dir === "end") nextIdx = selectableIdx[selectableIdx.length - 1];
    else {
      const pos = selectableIdx.indexOf(currentIdx);
      const base = pos === -1 ? 0 : pos;
      nextIdx =
        selectableIdx[
          (base + dir + selectableIdx.length) % selectableIdx.length
        ];
    }
    select(variants[nextIdx]);
    btnRefs.current[nextIdx]?.focus();
  };

  // Patrón WAI-ARIA radiogroup: flechas mueven la selección, Home/End a los extremos.
  const onKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
  ) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        moveSelection(idx, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        moveSelection(idx, -1);
        break;
      case "Home":
        e.preventDefault();
        moveSelection(idx, "home");
        break;
      case "End":
        e.preventDefault();
        moveSelection(idx, "end");
        break;
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[16px] font-bold text-foreground">
          Tono: <span className="font-normal text-muted-foreground">{selected?.name}</span>
        </span>
        {selected && <StockBadge state={getStockState(selected)} stock={selected.stock} />}
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Elegí un tono">
        {variants.map((v, i) => {
          const out = v.stock <= 0;
          const isSelected = v.id === selected?.id;
          const hex = v.swatchHex;
          return (
            <button
              key={v.id}
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${v.name}${out ? " (sin stock)" : ""}`}
              title={v.name}
              disabled={out}
              // Roving tabindex: un único tab-stop (el tono seleccionado); el resto se alcanza con flechas.
              tabIndex={isSelected && !out ? 0 : -1}
              onClick={() => select(v)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "relative transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95",
                // Con color cargado: círculo del tono. Sin color: píldora con el nombre.
                hex
                  ? cn(
                      "size-11 rounded-full border border-black/10 ring-offset-2",
                      isSelected ? "ring-2 ring-foreground" : "hover:ring-2 hover:ring-border",
                    )
                  : cn(
                      "inline-flex min-h-11 items-center rounded-full border px-4 text-[15px] font-semibold",
                      isSelected ? "border-foreground bg-foreground text-white" : "border-border bg-white text-foreground hover:border-foreground",
                    ),
                out && "cursor-not-allowed opacity-40",
              )}
              style={hex ? { backgroundColor: hex } : undefined}
            >
              {hex ? (
                isSelected && <Check className="mx-auto size-5 stroke-[3] text-white mix-blend-difference" aria-hidden />
              ) : (
                <span className={cn(out && "line-through")}>{v.name}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
