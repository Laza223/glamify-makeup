"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Copia un texto al portapapeles (ej. el número de seguimiento). */
export function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Sin permiso de portapapeles: el número igual está a la vista para copiarlo a mano.
    }
  };
  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} className="gap-1.5">
      {copied ? <Check className="size-4 text-primary" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copied ? "Copiado" : label}
    </Button>
  );
}
