"use client";

import { useEffect, useState, useTransition } from "react";
import { retryPaymentAction } from "@/app/(storefront)/actions";
import { Button } from "@/components/ui/button";

/** Vuelve a Mercado Pago para pagar un pedido que quedó pendiente. */
export function RetryPaymentButton({ orderId }: { orderId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Entre recibir el link de MP y salir de la página el botón sigue bloqueado: un segundo click crearía otra preference.
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Volver con "atrás" desde MP restaura la página del bfcache con el botón bloqueado: se libera.
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) setRedirecting(false); };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const pay = () => {
    if (pending || redirecting) return;
    setError(null);
    start(async () => {
      try {
        const r = await retryPaymentAction(orderId);
        if (r.ok && r.initPoint) { setRedirecting(true); window.location.href = r.initPoint; }
        else setError(r.error ?? "No se pudo iniciar el pago.");
      } catch {
        setError("No se pudo iniciar el pago. Revisá tu conexión y probá de nuevo.");
      }
    });
  };

  return (
    <div className="space-y-2">
      <Button type="button" onClick={pay} disabled={pending || redirecting}>{pending || redirecting ? "Abriendo Mercado Pago…" : "Pagar ahora"}</Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
