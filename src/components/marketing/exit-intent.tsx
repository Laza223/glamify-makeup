"use client";

import { useEffect, useRef, useState } from "react";
import { Gift, Copy, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { track } from "@/lib/analytics/track";
import { captureExitIntentAction } from "@/app/(storefront)/marketing-actions";

const SEEN_KEY = "glamify_exit_seen";
const CONSENT_KEY = "glamify_analytics";

/** La elección de consentimiento se guarda en cookie (fuente de verdad) + localStorage (best-effort). */
function consentDecided(): boolean {
  if (
    typeof document !== "undefined" &&
    new RegExp("(?:^|; )" + CONSENT_KEY + "=").test(document.cookie)
  )
    return true;
  try {
    return Boolean(localStorage.getItem(CONSENT_KEY));
  } catch {
    return false;
  }
}

/** Popup sutil de salida (una sola vez): captura email + revela cupón de bienvenida (blueprint 06 §8). */
export function ExitIntent() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const armed = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(SEEN_KEY)) return;

    const trigger = () => {
      if (armed.current) return;
      // No solaparse con el banner de consentimiento (todavía sin elección).
      if (!consentDecided()) return;
      if (localStorage.getItem(SEEN_KEY)) return;
      armed.current = true;
      localStorage.setItem(SEEN_KEY, "1");
      setOpen(true);
      track("exit_intent_shown");
    };

    const hasHover = window.matchMedia("(hover: hover)").matches;
    let idle: ReturnType<typeof setTimeout> | undefined;

    // `mouseout` con relatedTarget null = el puntero salió del documento (mouseleave en `document` no es fiable).
    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) trigger();
    };
    const resetIdle = () => {
      if (idle) clearTimeout(idle);
      idle = setTimeout(trigger, 25000);
    };

    if (hasHover) {
      document.addEventListener("mouseout", onMouseOut);
    } else {
      // Mobile (sin hover): disparo por inactividad como mejor esfuerzo.
      resetIdle();
      window.addEventListener("scroll", resetIdle, { passive: true });
      window.addEventListener("touchstart", resetIdle, { passive: true });
    }

    return () => {
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("scroll", resetIdle);
      window.removeEventListener("touchstart", resetIdle);
      if (idle) clearTimeout(idle);
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await captureExitIntentAction({ email });
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo guardar tu email.");
      return;
    }
    setDone(true);
    setCoupon(res.couponCode ?? null);
    track("exit_intent_submitted");
  }

  async function copyCode() {
    if (!coupon) return;
    try {
      await navigator.clipboard.writeText(coupon);
      setCopied(true);
    } catch {
      /* sin clipboard: la clienta puede copiar a mano */
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="center"
        className="overflow-hidden rounded-3xl border border-border/80 bg-card p-0 shadow-soft-lg sm:max-w-lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-12">
          <div className="flex flex-col justify-center p-6 sm:p-8 md:col-span-12">
            <SheetHeader className="space-y-2 text-left">
              <div className="inline-flex size-9 items-center justify-center rounded-2xl bg-secondary text-primary">
                <Gift className="size-[18px]" aria-hidden />
              </div>
              <SheetTitle className="font-display text-2xl font-bold leading-tight text-foreground">
                Un descuento para tu primer pedido
              </SheetTitle>
              <SheetDescription className="text-xs leading-relaxed text-muted-foreground">
                Dejanos tu email para recibir tu cupón de bienvenida. Tus datos
                están protegidos, sin spam.
              </SheetDescription>
            </SheetHeader>

            {!done ? (
              <form onSubmit={onSubmit} className="mt-5 space-y-3">
                <div className="space-y-1.5 text-left">
                  <Label
                    htmlFor="exit-email"
                    className="text-xs font-semibold text-foreground"
                  >
                    Tu correo electrónico
                  </Label>
                  <Input
                    id="exit-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    autoComplete="email"
                    className="h-11 rounded-xl border-border/80 bg-background/50 text-sm focus-visible:ring-primary"
                  />
                </div>
                {error && (
                  <p
                    role="alert"
                    className="text-xs font-medium text-destructive"
                  >
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-[#161413] text-xs font-bold text-white shadow-soft hover:bg-neutral-800"
                  disabled={pending}
                >
                  {pending ? "Generando cupón…" : "Quiero mi cupón"}
                </Button>
              </form>
            ) : (
              <div className="mt-5 space-y-4 text-center">
                {coupon ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Tu código de descuento:
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="rounded-xl border border-border bg-secondary/80 px-4 py-2 font-mono text-base font-bold tracking-widest text-foreground">
                        {coupon}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={copyCode}
                        aria-label="Copiar código"
                        className="size-10 rounded-xl"
                      >
                        {copied ? (
                          <Check
                            className="size-4 text-emerald-600"
                            aria-hidden
                          />
                        ) : (
                          <Copy className="size-4" aria-hidden />
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs font-semibold text-primary">
                    ¡Listo! Te avisaremos de promociones y novedades.
                  </p>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-xs font-medium text-muted-foreground"
                  onClick={() => setOpen(false)}
                >
                  Continuar navegando
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
