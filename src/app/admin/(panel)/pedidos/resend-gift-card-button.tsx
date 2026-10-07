"use client";

import { useState, useTransition } from "react";
import { Mail, AlertCircle, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resendGiftCardEmailAction } from "./actions";

/** Reenvía a la clienta el mail con sus gift cards sin usar. */
export function ResendGiftCardButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const resend = () => {
    setError(null);
    setSent(false);
    startTransition(async () => {
      const r = await resendGiftCardEmailAction(orderId);
      if (!r.ok) setError(r.error ?? "No se pudo reenviar el mail.");
      else setSent(true);
    });
  };

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={resend} disabled={pending}>
        <Mail className="size-4" aria-hidden />
        Reenviar mail
      </Button>
      {sent ? (
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <CircleCheck className="size-4 shrink-0 text-emerald-600" aria-hidden />
          Mail reenviado.
        </p>
      ) : null}
      {error ? (
        <p className="flex items-center gap-1.5 text-sm font-medium text-destructive" role="alert">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}
