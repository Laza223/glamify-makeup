"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { applyCouponAction, removeCouponAction } from "@/app/(storefront)/actions";
import type { ActionResult } from "@/lib/forms/action-result";

export function CouponInput({ applied }: { applied: string | null }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Una action que tira (red, server) no debe caer al error.tsx: se informa acá mismo.
  const run = (action: () => Promise<ActionResult>, fallback: string, onOk?: () => void) =>
    startTransition(async () => {
      setError(null);
      const r = await action().catch((): ActionResult => ({ ok: false }));
      if (!r.ok) {
        setError(r.error ?? fallback);
        return;
      }
      onOk?.();
      router.refresh();
    });
  const apply = () =>
    run(() => applyCouponAction(code), "No pudimos aplicar el cupón. Probá de nuevo.", () => setCode(""));
  const remove = () => run(removeCouponAction, "No pudimos quitar el cupón. Probá de nuevo.");

  const errorMessage = error && <p className="mt-1.5 text-[14px] text-destructive" role="alert">{error}</p>;

  if (applied) {
    return (
      <div>
        <div className="flex min-h-12 items-center justify-between rounded-2xl bg-success/10 pl-4 pr-1 text-[15px]">
          <span>Cupón <strong>{applied}</strong> aplicado</span>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="inline-flex min-h-11 items-center rounded-full px-3 font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Quitar
          </button>
        </div>
        {errorMessage}
      </div>
    );
  }
  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          // Está dentro del <form> del checkout: sin esto, Enter (o "Ir" en el celular) enviaba el pago sin el cupón.
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (code.trim() && !pending) apply();
          }}
          enterKeyHint="done"
          placeholder="¿Tenés un cupón?"
          aria-label="Código de cupón"
          className="h-12 rounded-2xl bg-white text-[16px] uppercase placeholder:normal-case"
        />
        <button
          type="button"
          onClick={apply}
          disabled={pending || !code.trim()}
          className="h-12 shrink-0 rounded-2xl border border-foreground px-5 text-[15px] font-semibold text-foreground transition-colors hover:bg-foreground hover:text-white disabled:border-border disabled:text-muted-foreground disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Aplicar
        </button>
      </div>
      {errorMessage}
    </div>
  );
}
