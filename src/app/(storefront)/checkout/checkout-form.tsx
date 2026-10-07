"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Home, Loader2, Lock, Store, Truck } from "lucide-react";
import { track } from "@/lib/analytics/track";
import { formatPrice, round2 } from "@/lib/money";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CartSummary } from "@/components/cart/cart-summary";
import { CouponInput } from "@/components/cart/coupon-input";
import { AR_PROVINCES } from "@/lib/ar-provinces";
import { cn } from "@/lib/utils";
import { quoteShippingAction, createCheckoutAction, agenciesAction } from "@/app/(storefront)/actions";

interface ItemView { id: string; name: string; variantName: string | null; qty: number; unitPrice: number }
interface Props {
  subtotal: number;
  discount: number;
  couponCode: string | null;
  couponFreeShipping: boolean;
  /** Calculado en el server: el carrito tiene solo gift cards (sin dirección ni envío). */
  digitalOnly?: boolean;
  items: ItemView[];
  defaultName?: string;
  defaultEmail?: string;
  /** Preview de Vercel: el formulario se recorre, pero no se puede pagar. */
  paymentsDisabled?: boolean;
}

type Method = "domicilio" | "sucursal";

const FIELD = "h-12 rounded-2xl bg-white text-[16px] md:text-[16px]";
const SELECT =
  "h-12 w-full rounded-2xl border border-input bg-white px-3 text-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/** Etiqueta visible arriba de cada campo (antes eran solo placeholders). */
function Field({ id, label, optional, className, children }: { id: string; label: string; optional?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-[15px] font-semibold text-foreground">
        {label}
        {optional && <span className="font-normal text-muted-foreground"> (opcional)</span>}
      </label>
      {children}
    </div>
  );
}

function StepTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <legend className="mb-4 flex items-center gap-3 font-display text-[24px] text-foreground">
      <span className="grid size-9 place-items-center rounded-full bg-primary font-sans text-[15px] font-bold text-primary-foreground">{n}</span>
      {children}
    </legend>
  );
}

export function CheckoutForm({ subtotal, discount, couponCode, couponFreeShipping, digitalOnly = false, items, defaultName = "", defaultEmail = "", paymentsDisabled = false }: Props) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<Method>("domicilio");
  const [province, setProvince] = useState("Buenos Aires");
  const [cp, setCp] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [floorApt, setFloorApt] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Sucursal: lista de sucursales de MiCorreo + la elegida.
  const [agencies, setAgencies] = useState<{ code: string; label: string }[]>([]);
  const [agencyCode, setAgencyCode] = useState("");
  const [loadingAgencies, startAgencies] = useTransition();

  const [shipping, setShipping] = useState<{ cost: number; free: boolean } | null>(null);
  const [quoteFailed, setQuoteFailed] = useState(false);
  const [quoting, startQuote] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const shippingCost = digitalOnly || couponFreeShipping ? 0 : shipping?.free ? 0 : shipping?.cost ?? null;
  const total = round2(subtotal - discount + (shippingCost ?? 0));
  const canQuote = /^\d{4}$/.test(cp) && city.trim().length >= 3;

  useEffect(() => {
    track("begin_checkout", { subtotal, items: items.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resetea la cotización (y, en sucursal, la sucursal elegida) cuando cambia un dato del destino.
  const resetDestino = () => { setShipping(null); setQuoteFailed(false); setAgencies([]); setAgencyCode(""); };

  const loadAgencies = () => {
    if (method !== "sucursal" || !province || !city.trim()) return;
    startAgencies(async () => {
      const r = await agenciesAction({ province, city });
      setAgencies(r.ok && r.agencies ? r.agencies : []);
      setAgencyCode("");
    });
  };

  const quote = () => {
    if (!canQuote) { setShipping(null); return; }
    startQuote(async () => {
      const r = await quoteShippingAction({ cp, province, city, method });
      if (r.ok) { setShipping({ cost: r.cost ?? 0, free: Boolean(r.free) }); setQuoteFailed(false); }
      else { setShipping(null); setQuoteFailed(true); }
    });
    loadAgencies();
  };

  // Cotiza solo cuando CP y localidad están completos (con una pausa para no cotizar a cada tecla).
  const quoteRef = useRef(quote);
  quoteRef.current = quote;
  useEffect(() => {
    if (digitalOnly || !canQuote) return;
    const t = setTimeout(() => quoteRef.current(), 700);
    return () => clearTimeout(t);
  }, [cp, city, province, method, canQuote, digitalOnly]);

  const validate = (): string | null => {
    if (!name.trim()) return "Ingresá tu nombre.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Revisá el email: parece que le falta algo.";
    if (!phone.trim()) return "Ingresá un teléfono.";
    if (!digitalOnly) {
      if (!/^\d{4}$/.test(cp)) return "El código postal tiene 4 números.";
      if (!city.trim()) return "Ingresá tu localidad.";
      if (method === "domicilio" && (!street.trim() || !number.trim())) return "Completá calle y número.";
      if (method === "sucursal" && !agencyCode) return "Elegí una sucursal de Correo.";
      if (shippingCost == null) return "Esperá a que calculemos el envío con tu código postal.";
    }
    if (!acceptedTerms) return "Tenés que aceptar los Términos y Condiciones.";
    return null;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setError(null);
    startSubmit(async () => {
      const r = await createCheckoutAction({
        contactName: name, contactEmail: email, contactPhone: phone,
        shippingMethod: method,
        address: {
          cp, province, street, number, floorApt, city, notes,
          ...(method === "sucursal" ? { agencyCode, agencyLabel: agencies.find((a) => a.code === agencyCode)?.label } : {}),
        },
      });
      if (r.ok && r.initPoint) window.location.href = r.initPoint;
      else setError(r.error ?? "No se pudo iniciar el pago.");
    });
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[1fr_400px] lg:gap-12">
      <div className="space-y-10">
        <fieldset>
          <StepTitle n={1}>Tus datos</StepTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="co-name" label="Nombre y apellido" className="sm:col-span-2">
              <Input id="co-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={FIELD} />
            </Field>
            <Field id="co-email" label="Email">
              <Input id="co-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" className={FIELD} />
            </Field>
            <Field id="co-phone" label="Teléfono">
              <Input id="co-phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="11 2345 6789" className={FIELD} />
            </Field>
          </div>
        </fieldset>

        {digitalOnly ? (
          <p className="rounded-[18px] bg-secondary p-4 text-[16px] text-foreground">
            Las gift cards llegan por mail: no hace falta dirección.
          </p>
        ) : (
          <fieldset>
            <StepTitle n={2}>Entrega</StepTitle>
            <RadioGroup
              value={method}
              onValueChange={(v) => { setMethod(v as Method); resetDestino(); }}
              className="mb-5 grid grid-cols-2 gap-3"
              aria-label="Cómo querés recibirlo"
            >
              {([
                { value: "domicilio", label: "A domicilio", hint: "Te llega a tu casa", icon: Home },
                { value: "sucursal", label: "En sucursal", hint: "Lo retirás en el Correo", icon: Store },
              ] as const).map(({ value, label, hint, icon: Icon }) => (
                <label
                  key={value}
                  className="relative flex cursor-pointer flex-col gap-1 rounded-[18px] border-2 border-border bg-white p-4 transition-colors hover:border-foreground/40 has-[:checked]:border-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                >
                  <RadioGroupItem value={value} className="absolute right-4 top-4" />
                  <Icon className="size-6 text-primary" aria-hidden />
                  <span className="text-[16px] font-bold text-foreground">{label}</span>
                  <span className="text-[14px] text-muted-foreground">{hint}</span>
                </label>
              ))}
            </RadioGroup>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="co-province" label="Provincia">
                <select id="co-province" value={province} onChange={(e) => { setProvince(e.target.value); resetDestino(); }} className={SELECT}>
                  {AR_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field id="co-city" label="Localidad">
                <Input id="co-city" value={city} onChange={(e) => { setCity(e.target.value); resetDestino(); }} autoComplete="address-level2" className={FIELD} />
              </Field>
              <Field id="co-cp" label="Código postal">
                <Input
                  id="co-cp"
                  value={cp}
                  onChange={(e) => { setCp(e.target.value.replace(/\D/g, "").slice(0, 4)); setShipping(null); setQuoteFailed(false); }}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="Ej: 6700"
                  className={FIELD}
                />
              </Field>

              {/* Resultado de la cotización: aparece solo cuando hay CP y localidad. */}
              <div className="flex items-end" aria-live="polite">
                <div className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-secondary px-4 text-[15px]">
                  <Truck className="size-5 shrink-0 text-primary" aria-hidden />
                  {quoting ? (
                    <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden /> Calculando envío…</span>
                  ) : shipping ? (
                    <span>
                      Envío: <strong className={cn(shipping.free && "text-success")}>{shipping.free ? "¡Gratis!" : formatPrice(shippingCost ?? 0)}</strong>
                    </span>
                  ) : quoteFailed ? (
                    <button type="button" onClick={quote} className="min-h-11 text-left font-semibold text-accent underline underline-offset-4">
                      No pudimos calcularlo. Probá de nuevo
                    </button>
                  ) : (
                    <span className="text-muted-foreground">Completá CP y localidad para ver el envío</span>
                  )}
                </div>
              </div>
            </div>

            {method === "domicilio" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_140px]">
                <Field id="co-street" label="Calle">
                  <Input id="co-street" value={street} onChange={(e) => setStreet(e.target.value)} autoComplete="address-line1" className={FIELD} />
                </Field>
                <Field id="co-number" label="Número">
                  <Input id="co-number" value={number} onChange={(e) => setNumber(e.target.value)} inputMode="numeric" className={FIELD} />
                </Field>
                <Field id="co-floor" label="Piso / depto" optional className="sm:col-span-2">
                  <Input id="co-floor" value={floorApt} onChange={(e) => setFloorApt(e.target.value)} autoComplete="address-line2" className={FIELD} />
                </Field>
              </div>
            )}

            {method === "sucursal" && (
              <div className="mt-4">
                {loadingAgencies ? (
                  <p className="flex min-h-12 items-center gap-2 text-[15px] text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden /> Buscando sucursales…</p>
                ) : agencies.length > 0 ? (
                  <Field id="co-agency" label="Sucursal de Correo">
                    <select id="co-agency" value={agencyCode} onChange={(e) => setAgencyCode(e.target.value)} className={SELECT}>
                      <option value="">Elegí tu sucursal…</option>
                      {agencies.map((a) => <option key={a.code} value={a.code}>{a.label}</option>)}
                    </select>
                  </Field>
                ) : (
                  <p className="text-[15px] text-muted-foreground">Cuando completes CP y localidad te mostramos las sucursales cercanas.</p>
                )}
              </div>
            )}

            <Field id="co-notes" label="Notas para la entrega" optional className="mt-4">
              <Input id="co-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: timbre B, dejar en portería" className={FIELD} />
            </Field>
          </fieldset>
        )}
      </div>

      <aside className="space-y-4 rounded-[24px] bg-secondary p-5 md:p-6 lg:sticky lg:top-28 lg:self-start">
        <h2 className="font-display text-[24px] text-foreground">
          Tu <em className="font-medium text-primary">pedido</em>
        </h2>
        <ul className="space-y-2 text-[15px]">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between gap-3">
              <span className="text-foreground">
                {it.name}
                {it.variantName ? <span className="text-muted-foreground"> · {it.variantName}</span> : null}
                <span className="text-muted-foreground"> × {it.qty}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{formatPrice(it.unitPrice * it.qty)}</span>
            </li>
          ))}
        </ul>
        <Separator />
        <CouponInput applied={couponCode} />
        <CartSummary subtotal={subtotal} discount={discount} shippingCost={shippingCost} total={total} freeShipping={couponFreeShipping || shipping?.free} />
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[14px] leading-relaxed text-muted-foreground">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 rounded border-input accent-primary"
          />
          <span>
            Acepto los{" "}
            <a href="/terminos" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline underline-offset-2">Términos y Condiciones</a>{" "}
            y la{" "}
            <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline underline-offset-2">Política de Privacidad</a>.
          </span>
        </label>
        {error && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-[15px] font-medium text-destructive" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={submitting || paymentsDisabled}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-6 text-[16px] font-semibold text-white transition hover:bg-foreground/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {submitting ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Lock className="size-5" aria-hidden />}
          {/* El total solo se muestra cuando ya incluye el envío. */}
          {shippingCost != null ? `Pagar ${formatPrice(total)} con Mercado Pago` : "Pagar con Mercado Pago"}
        </button>
        <p className="text-center text-[14px] text-muted-foreground">
          {paymentsDisabled ? "Vista previa: los pagos están desactivados." : "Te llevamos a Mercado Pago para pagar seguro."}
        </p>
      </aside>
    </form>
  );
}
