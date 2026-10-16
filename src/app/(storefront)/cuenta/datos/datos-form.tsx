"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction } from "./actions";

export function DatosForm({ initial }: { initial: { name: string; phone: string; email: string } }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false); setError(null); setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await updateProfileAction({ name: String(fd.get("name") ?? ""), phone: String(fd.get("phone") ?? "") });
    setPending(false);
    if (res.ok) setSaved(true); else setError(res.error ?? "Error");
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-5 rounded-[20px] bg-secondary p-5 md:p-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" defaultValue={initial.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={initial.phone} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={initial.email} readOnly disabled aria-describedby="email-hint" />
        <p id="email-hint" className="text-[14px] text-muted-foreground">Es el mail con el que entrás; no se puede cambiar desde acá.</p>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {saved && (
        <p role="status" className="flex items-center gap-2 text-[15px] font-semibold text-[#0E6B45]">
          <Check className="size-4" aria-hidden /> Guardado
        </p>
      )}
      <Button type="submit" variant="ink" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
