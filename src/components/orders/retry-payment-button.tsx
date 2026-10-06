"use client";

import { useState, useTransition } from "react";
import { retryPaymentAction } from "@/app/(storefront)/actions";
import { Button } from "@/components/ui/button";

/** Vuelve a Mercado Pago para pagar un pedido que quedó pendiente. */
export function RetryPaymentButton({ orderId }: { orderId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const pay = () => {
    setError(null);
    start(async () => {
      const r = await retryPaymentAction(orderId);
      if (r.ok && r.initPoint) window.location.href = r.initPoint;
      else setError(r.error ?? "No se pudo iniciar el pago.");
    });
  };

  return (
    <div className="space-y-2">
      <Button type="button" onClick={pay} disabled={pending}>{pending ? "Abriendo Mercado Pago…" : "Pagar ahora"}</Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
