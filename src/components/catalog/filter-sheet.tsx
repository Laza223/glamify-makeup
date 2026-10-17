"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FILTER_KEYS, activeFilterKeys, parsePriceParam, validatePriceRange } from "@/lib/catalog/filters";
import { cn } from "@/lib/utils";

/** Filtros del listado. Mobile: panel desde abajo; desktop: panel lateral. Se aplican al tocar "Ver productos". */
export function FilterSheet() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"bottom" | "right">("bottom");
  // Estado del form = lo que la URL aplica de verdad (precios inválidos se ignoran). Se re-sincroniza al abrir.
  const urlMin = String(parsePriceParam(params.get("min")) ?? "");
  const urlMax = String(parsePriceParam(params.get("max")) ?? "");
  const urlOferta = params.get("oferta") === "1";
  const urlDisponible = params.get("disponible") === "1";
  const [min, setMin] = useState(urlMin);
  const [max, setMax] = useState(urlMax);
  const [oferta, setOferta] = useState(urlOferta);
  const [disponible, setDisponible] = useState(urlDisponible);
  const [error, setError] = useState<string | null>(null);
  const activeCount = activeFilterKeys((k) => params.get(k)).length;

  const push = (next: URLSearchParams) => {
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
    setOpen(false);
  };

  const apply = () => {
    const range = validatePriceRange(min, max);
    if (range.error) {
      setError(range.error);
      return;
    }
    const next = new URLSearchParams(params.toString());
    const setOrDel = (k: string, v: string | number | boolean | undefined) => {
      if (v === undefined || v === "" || v === false) next.delete(k);
      else next.set(k, v === true ? "1" : String(v));
    };
    setOrDel("min", range.min);
    setOrDel("max", range.max);
    setOrDel("oferta", oferta);
    setOrDel("disponible", disponible);
    push(next);
  };

  const clear = () => {
    setMin("");
    setMax("");
    setOferta(false);
    setDisponible(false);
    setError(null);
    const next = new URLSearchParams(params.toString());
    FILTER_KEYS.forEach((k) => next.delete(k));
    push(next);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        // El lado se decide al abrir: panel desde abajo en el celu, lateral en desktop.
        if (o) {
          setSide(window.matchMedia("(min-width: 768px)").matches ? "right" : "bottom");
          setMin(urlMin);
          setMax(urlMax);
          setOferta(urlOferta);
          setDisponible(urlDisponible);
          setError(null);
        }
        setOpen(o);
      }}
    >
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-full border px-5 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            activeCount > 0 ? "border-foreground bg-foreground text-white" : "border-border bg-white text-foreground hover:border-foreground",
          )}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filtros
          {activeCount > 0 && (
            <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[12px] font-bold tabular-nums text-white">
              {activeCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent
        side={side}
        className={side === "bottom" ? "rounded-t-[24px]" : "flex w-[400px] flex-col rounded-l-[24px] sm:max-w-[400px]"}
      >
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-[28px] font-normal">
            Filtrá a <em className="font-medium text-primary">tu gusto</em>
          </SheetTitle>
          <SheetDescription className="text-[15px]">Elegí y tocá “Ver productos”.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-6 py-6">
          <fieldset className="space-y-3">
            <legend className="mb-3 text-[16px] font-bold text-foreground">Precio</legend>
            <div className="flex items-center gap-3">
              <label className="flex-1">
                <span className="mb-1 block text-[14px] text-muted-foreground">Desde $</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="0"
                  value={min}
                  onChange={(e) => {
                    setMin(e.target.value);
                    setError(null);
                  }}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "filtro-precio-error" : undefined}
                  className="h-12 rounded-xl text-[16px]"
                />
              </label>
              <label className="flex-1">
                <span className="mb-1 block text-[14px] text-muted-foreground">Hasta $</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="Sin tope"
                  value={max}
                  onChange={(e) => {
                    setMax(e.target.value);
                    setError(null);
                  }}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "filtro-precio-error" : undefined}
                  className="h-12 rounded-xl text-[16px]"
                />
              </label>
            </div>
            {error && (
              <p id="filtro-precio-error" role="alert" className="text-[14px] font-semibold text-destructive">
                {error}
              </p>
            )}
          </fieldset>
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-xl">
            <span className="text-[16px] font-semibold">Solo con descuento</span>
            <Switch checked={oferta} onCheckedChange={setOferta} />
          </label>
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-xl">
            <span className="text-[16px] font-semibold">Solo lo que hay en stock</span>
            <Switch checked={disponible} onCheckedChange={setDisponible} />
          </label>
        </div>
        <SheetFooter className="flex-row gap-3 sm:space-x-0">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clear}
              className="h-12 flex-1 rounded-2xl border border-border text-[15px] font-semibold text-foreground transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Limpiar
            </button>
          )}
          <button
            type="button"
            onClick={apply}
            className="h-12 flex-[2] rounded-2xl bg-foreground text-[15px] font-semibold text-white transition hover:bg-foreground/85 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Ver productos
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
