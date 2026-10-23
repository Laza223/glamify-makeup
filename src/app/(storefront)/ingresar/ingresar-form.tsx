"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction, signUpAction, signInWithGoogleAction } from "./actions";
import { settleAction } from "@/lib/forms/action-result";

type Mode = "in" | "up";

interface IngresarFormProps {
  initialError?: string | null;
  /** Path interno (ya saneado en el server) al que volver después de ingresar. */
  next?: string;
  /** Solo mostrar "Continuar con Google" si el provider está habilitado en Supabase. */
  googleEnabled?: boolean;
}

export function IngresarForm({ initialError = null, googleEnabled = false, next = "/cuenta" }: IngresarFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("in");
  const [error, setError] = useState<string | null>(initialError);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setInfo(null); setPending(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    try {
      if (mode === "in") {
        const res = await signInAction({ email, password });
        if (!res.ok) { setError(res.error ?? "Error"); return; }
        router.push(next); router.refresh();
      } else {
        const res = await signUpAction({
          email, password,
          name: String(fd.get("name") ?? ""),
          marketingConsent: fd.get("consent") === "on",
        });
        if (!res.ok) { setError(res.error ?? "Error"); return; }
        if (res.needsConfirmation) setInfo("¡Listo! Revisá tu correo para confirmar tu cuenta. Si no lo ves, fijate en la casilla de spam.");
        else { router.push(next); router.refresh(); }
      }
    } catch {
      setError("No pudimos conectarnos. Probá de nuevo en unos segundos.");
    } finally { setPending(false); }
  }

  async function onGoogle() {
    setError(null);
    const res = await settleAction(signInWithGoogleAction());
    if (res.ok && res.url) window.location.href = res.url;
    else setError(res.error ?? "Error con Google.");
  }

  return (
    <div className="space-y-6 rounded-[24px] bg-secondary p-5 md:p-7">
      <div className="grid grid-cols-2 gap-1 rounded-full bg-white p-1 text-[15px] font-semibold">
        {(["in", "up"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => { setMode(m); setError(null); setInfo(null); }}
            className={
              "h-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
              (mode === m ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")
            }
          >
            {m === "in" ? "Ingresar" : "Crear cuenta"}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "up" && (
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" autoComplete="name" required />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} minLength={8} required />
        </div>
        {mode === "up" && (
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[15px] text-muted-foreground">
            <input type="checkbox" name="consent" className="mt-0.5 size-5 shrink-0 accent-primary" />
            Quiero recibir novedades y recordatorios de mi carrito.
          </label>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {info && <p role="status" className="rounded-2xl bg-white p-4 text-[15px] text-foreground">{info}</p>}
        <Button type="submit" variant="ink" size="lg" disabled={pending} className="w-full">
          {pending ? "Un segundo…" : mode === "in" ? "Ingresar" : "Crear mi cuenta"}
        </Button>
      </form>

      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> o <span className="h-px flex-1 bg-border" />
          </div>
          <Button type="button" variant="outline" size="lg" className="w-full rounded-2xl text-[16px]" onClick={onGoogle}>
            Continuar con Google
          </Button>
        </>
      )}
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Al crear una cuenta o continuar con Google aceptás los{" "}
        <Link href="/terminos" className="underline underline-offset-2">Términos y condiciones</Link> y la{" "}
        <Link href="/privacidad" className="underline underline-offset-2">Política de privacidad</Link>.
      </p>
    </div>
  );
}
