"use client";

import { useState, useTransition } from "react";
import { Save, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettingsAction } from "./actions";

interface SettingsFormProps {
  initialSettings: {
    storeName: string;
    freeShippingThreshold: number;
    shippingSurcharge: number;
    originPostalCode: string;
    whatsappNumber: string | null;
    instagramUrl: string | null;
    tiktokUrl: string | null;
  };
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess(false);
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateSettingsAction(fd);
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError(res.error ?? "Ocurrió un error al guardar los ajustes.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {success && (
        <div
          role="status"
          className="flex animate-fade-up items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900 shadow-sm"
        >
          <CheckCircle2
            className="size-5 shrink-0 text-emerald-600"
            aria-hidden
          />
          <p className="text-sm font-semibold">
            ¡Ajustes guardados correctamente!
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex animate-fade-up items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-900 shadow-sm"
        >
          <AlertCircle className="size-5 shrink-0 text-rose-600" aria-hidden />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Sección 1: Tienda y Envíos */}
      <div className="admin-card space-y-5 rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
        <div>
          <h2 className="font-display text-base font-bold text-foreground">
            Identidad y Envíos
          </h2>
          <p className="text-xs text-muted-foreground">
            Datos generales de la tienda y reglas de despacho nacional.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="storeName"
              className="text-xs font-bold uppercase tracking-wider text-foreground"
            >
              Nombre de la tienda
            </Label>
            <Input
              id="storeName"
              name="storeName"
              defaultValue={initialSettings.storeName}
              required
              placeholder="Glamify Makeup"
              className="rounded-xl bg-surface-alt"
            />
            <p className="text-[11px] text-muted-foreground">
              Se muestra en el header, emails y título de la web.
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="freeShippingThreshold"
              className="text-xs font-bold uppercase tracking-wider text-foreground"
            >
              Monto mínimo para Envío Gratis (ARS)
            </Label>
            <Input
              id="freeShippingThreshold"
              name="freeShippingThreshold"
              type="number"
              min="0"
              step="500"
              defaultValue={initialSettings.freeShippingThreshold}
              required
              className="rounded-xl bg-surface-alt"
            />
            <p className="text-[11px] text-muted-foreground">
              Si la compra supera este importe, el envío es 100% bonificado en
              el carrito y checkout.
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="shippingSurcharge"
              className="text-xs font-bold uppercase tracking-wider text-foreground"
            >
              Recargo de envío (ARS)
            </Label>
            <Input
              id="shippingSurcharge"
              name="shippingSurcharge"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initialSettings.shippingSurcharge}
              placeholder="0"
              className="rounded-xl bg-surface-alt"
            />
            <p className="text-[11px] text-muted-foreground">
              Se suma a lo que cotiza Correo Argentino en vivo (por ejemplo, para cubrir el
              empaque). Vacío = $0. No aplica al envío gratis ni a la tabla de zonas de respaldo.
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="originPostalCode"
              className="text-xs font-bold uppercase tracking-wider text-foreground"
            >
              Código Postal de origen (despacho)
            </Label>
            <Input
              id="originPostalCode"
              name="originPostalCode"
              defaultValue={initialSettings.originPostalCode}
              required
              maxLength={8}
              placeholder="6700"
              className="rounded-xl bg-surface-alt"
            />
            <p className="text-[11px] text-muted-foreground">
              CP desde donde salen los paquetes (Luján = 6700). Se usa para
              calcular la cotización con Correo Argentino.
            </p>
          </div>
        </div>
      </div>

      {/* Sección 2: Redes y Contacto */}
      <div className="admin-card space-y-5 rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
        <div>
          <h2 className="font-display text-base font-bold text-foreground">
            Contacto y Redes Sociales
          </h2>
          <p className="text-xs text-muted-foreground">
            Canales de comunicación oficiales donde tus clientas pueden
            escribirte y ver tus publicaciones.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="whatsappNumber"
              className="text-xs font-bold uppercase tracking-wider text-foreground"
            >
              Número de WhatsApp
            </Label>
            <Input
              id="whatsappNumber"
              name="whatsappNumber"
              defaultValue={initialSettings.whatsappNumber ?? ""}
              placeholder="5492323582495"
              className="rounded-xl bg-surface-alt"
            />
            <p className="text-[11px] text-muted-foreground">
              Con código de país, sin espacios ni símbolos (ej:{" "}
              <code>5492323582495</code>). Activa el botón flotante de WhatsApp.
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="instagramUrl"
              className="text-xs font-bold uppercase tracking-wider text-foreground"
            >
              Enlace de Instagram
            </Label>
            <Input
              id="instagramUrl"
              name="instagramUrl"
              type="url"
              defaultValue={initialSettings.instagramUrl ?? ""}
              placeholder="https://www.instagram.com/glamifymakeup_"
              className="rounded-xl bg-surface-alt"
            />
            <p className="text-[11px] text-muted-foreground">
              URL completa a tu perfil de Instagram.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label
              htmlFor="tiktokUrl"
              className="text-xs font-bold uppercase tracking-wider text-foreground"
            >
              Enlace de TikTok (opcional)
            </Label>
            <Input
              id="tiktokUrl"
              name="tiktokUrl"
              type="url"
              defaultValue={initialSettings.tiktokUrl ?? ""}
              placeholder="https://www.tiktok.com/@glamifymakeup_"
              className="rounded-xl bg-surface-alt"
            />
            <p className="text-[11px] text-muted-foreground">
              URL a tu cuenta de TikTok si tenés perfil oficial.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="gap-2 rounded-2xl bg-primary px-8 py-6 font-semibold text-white shadow-soft hover:bg-primary-hover hover:shadow-soft-lg"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          <span>{pending ? "Guardando ajustes…" : "Guardar cambios"}</span>
        </Button>
      </div>
    </form>
  );
}
