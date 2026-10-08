"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  max?: number;
  initial?: number;
  onChange?: (qty: number) => void;
  className?: string;
}

export function QuantityStepper({ max = 99, initial = 1, onChange, className }: QuantityStepperProps) {
  const [qty, setQty] = useState(Math.min(Math.max(1, initial), max));
  const set = (next: number) => {
    const clamped = Math.min(Math.max(1, next), max);
    setQty(clamped);
    onChange?.(clamped);
  };
  return (
    <div className={cn("inline-flex h-12 items-center rounded-full border border-border bg-white", className)} role="group" aria-label="Cantidad">
      <button
        type="button"
        onClick={() => set(qty - 1)}
        disabled={qty <= 1}
        aria-label="Restar"
        className="grid size-11 place-items-center rounded-full transition-colors hover:bg-secondary disabled:opacity-40"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <span className="min-w-8 text-center text-[16px] font-bold tabular-nums" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        onClick={() => set(qty + 1)}
        disabled={qty >= max}
        aria-label="Sumar"
        className="grid size-11 place-items-center rounded-full transition-colors hover:bg-secondary disabled:opacity-40"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
