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
import { quoteShippingAction, createCheckoutAction } from "@/app/(storefront)/actions";
import { validateShippingAddress } from "@/lib/shipping/address";

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

const QUOTE_FAILED = "No pudimos calcular el envío.";

const FIELD = "h-12 rounded-2xl bg-white text-[16px] md:text-[16px]";
const SELECT =
  "h-12 w-full rounded-2xl border border-input bg-white px-3 text-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/** Etiqueta visible arriba de cada campo (antes eran solo placeholders). */
function Field({ id, label, optional, error, className, children }: { id: string; label: string; optional?: boolean; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-[15px] font-semibold text-foreground">
        {label}
        {optional && <span className="font-normal text-muted-foreground"> (opcional)</span>}
      </label>
      {children}
      {error && <p id={`${id}-error`} className="text-[14px] font-medium text-destructive">{error}</p>}
    </div>
  );
}

type FieldKey = "name" | "email" | "phone" | "city" | "cp" | "street" | "number" | "dni";
type FieldErrors = Partial<Record<FieldKey, string>>;
/** Campos de dirección en el orden en que aparecen en pantalla. */
const ADDRESS_FIELDS = ["city", "cp", "street", "number", "dni"] as const;
/** Dirección válida de base: validar un campo con el resto OK da el mensaje de ese campo solo (mismas reglas que el server). */
const VALID_ADDRESS = { cp: "1000", province: "Buenos Aires", city: "x", street: "x", number: "1", dni: "30123456" };

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
  const [dni, setDni] = useState("");
  const [notes, setNotes] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Una cotización (o su error) vale para el destino y el subtotal con que se pidió: si cambia algo
  // (o el order bump suma un producto) deja de valer y se vuelve a cotizar.
  const quoteKey = `${cp}|${city.trim()}|${province}|${method}|${subtotal}`;
  const [shipping, setShipping] = useState<{ cost: number; free: boolean; key: string } | null>(null);
  const [quoteError, setQuoteError] = useState<{ message: string; key: string } | null>(null);
  const [quoting, startQuote] = useTransition();
  // Cada búsqueda lleva un número: una respuesta que llega después de otra más nueva se descarta.
  const quoteSeq = useRef(0);
  const [submitting, startSubmit] = useTransition();
  // Entre recibir el link de MP y salir de la página el botón sigue bloqueado: un segundo click crearía otro pedido.
  const [redirecting, setRedirecting] = useState(false);
  // Errores que no son de un campo (envío sin calcular, términos, server): banner junto al botón.
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const quoted = shipping?.key === quoteKey ? shipping : null;
  const quoteErrorMessage = quoteError?.key === quoteKey ? quoteError.message : null;
  const shippingCost = digitalOnly || couponFreeShipping ? 0 : quoted?.free ? 0 : quoted?.cost ?? null;
  const total = round2(subtotal - discount + (shippingCost ?? 0));
  const canQuote = /^\d{4}$/.test(cp) && city.trim().length >= 3;

  useEffect(() => {
    track("begin_checkout", { subtotal, items: items.length });
    // Volver con "atrás" desde MP restaura la página del bfcache con el botón bloqueado: se libera.
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) setRedirecting(false); };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quote = () => {
    if (!canQuote) return;
    const seq = ++quoteSeq.current;
    const key = quoteKey;
    startQuote(async () => {
      try {
        const r = await quoteShippingAction({ cp, province, city, method });
        if (seq !== quoteSeq.current) return;
        if (r.ok) setShipping({ cost: r.cost ?? 0, free: Boolean(r.free), key });
        else setQuoteError({ message: r.error ?? QUOTE_FAILED, key });
      } catch {
        if (seq === quoteSeq.current) setQuoteError({ message: QUOTE_FAILED, key });
      }
    });
  };

  // Cotiza solo cuando CP y localidad están completos (con una pausa para no cotizar a cada tecla).
  const quoteRef = useRef(quote);
  quoteRef.current = quote;
  useEffect(() => {
    if (digitalOnly || !canQuote) return;
    const t = setTimeout(() => quoteRef.current(), 700);
    return () => clearTimeout(t);
  }, [quoteKey, canQuote, digitalOnly]);

  /** Errores por campo, en el orden en que aparecen en pantalla. */
  const validateFields = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = "Ingresá tu nombre.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = "Revisá el email: parece que le falta algo.";
    if (!phone.trim()) errors.phone = "Ingresá un teléfono.";
    if (!digitalOnly) {
      const values = { cp, city, street, number, dni };
      for (const k of ADDRESS_FIELDS) {
        const message = validateShippingAddress(method, { ...VALID_ADDRESS, [k]: values[k] });
        if (message) errors[k] = message;
      }
    }
    return errors;
  };

  /** Errores sin campo propio: solo se muestran cuando los campos están bien. */
  const validateRest = (): string | null => {
    if (!digitalOnly && shippingCost == null) return quoteErrorMessage ?? "Esperá a que calculemos el envío con tu código postal.";
    if (!acceptedTerms) return "Tenés que aceptar los Términos y condiciones.";
    return null;
  };

  const clearFieldError = (k: FieldKey) => setFieldErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));

  /** Props de a11y y borde de un input con error posible; `hintId` suma el texto de ayuda al aria-describedby. */
  const fieldProps = (k: FieldKey, hintId?: string) => {
    const invalid = Boolean(fieldErrors[k]);
    return {
      className: cn(FIELD, invalid && "border-destructive"),
      "aria-invalid": invalid || undefined,
      "aria-describedby": [hintId, invalid ? `co-${k}-error` : undefined].filter(Boolean).join(" ") || undefined,
    };
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || redirecting) return;
    const errors = validateFields();
    const first = (Object.keys(errors) as FieldKey[])[0];
    setFieldErrors(errors);
    if (first) {
      setError(null);
      // Después del render, así el input ya tiene aria-invalid y el mensaje enlazado cuando recibe el foco.
      requestAnimationFrame(() => {
        const el = document.getElementById(`co-${first}`);
        el?.focus({ preventScroll: true });
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      });
      return;
    }
    const rest = validateRest();
    if (rest) { setError(rest); return; }
    setError(null);
    startSubmit(async () => {
      try {
        const r = await createCheckoutAction({
          contactName: name, contactEmail: email, contactPhone: phone,
          shippingMethod: method,
          address: {
            cp, province, street, number, floorApt, city, notes, dni,
          },
        });
        if (r.ok && r.initPoint) { setRedirecting(true); window.location.href = r.initPoint; }
        else setError(r.error ?? "No pudimos iniciar el pago. Probá de nuevo en unos segundos.");
      } catch {
        setError("No pudimos iniciar el pago. Revisá tu conexión y probá de nuevo.");
      }
    });
  };

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
      <div className="space-y-10">
        <fieldset>
          <StepTitle n={1}>Tus datos</StepTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="co-name" label="Nombre y apellido" error={fieldErrors.name} className="sm:col-span-2">
              <Input id="co-name" value={name} onChange={(e) => { setName(e.target.value); clearFieldError("name"); }} autoComplete="name" {...fieldProps("name")} />
            </Field>
            <Field id="co-email" label="Email" error={fieldErrors.email}>
              <Input id="co-email" value={email} onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }} type="email" inputMode="email" autoComplete="email" {...fieldProps("email")} />
            </Field>
            <Field id="co-phone" label="Teléfono" error={fieldErrors.phone}>
              <Input id="co-phone" value={phone} onChange={(e) => { setPhone(e.target.value); clearFieldError("phone"); }} type="tel" inputMode="tel" autoComplete="tel" placeholder="11 2345 6789" {...fieldProps("phone")} />
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
              onValueChange={(v) => setMethod(v as Method)}
              className="mb-5 grid grid-cols-2 gap-3"
              aria-label="Cómo querés recibirlo"
            >
              {([
                { value: "domicilio", label: "A domicilio", hint: "Te llega a tu casa", icon: Home },
                { value: "sucursal", label: "En sucursal", hint: "Lo retirás en una sucursal", icon: Store },
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
                <select id="co-province" value={province} onChange={(e) => setProvince(e.target.value)} className={SELECT}>
                  {AR_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field id="co-city" label="Localidad" error={fieldErrors.city}>
                <Input
                  id="co-city"
                  value={city}
                  onChange={(e) => { setCity(e.target.value); clearFieldError("city"); }}
                  autoComplete="address-level2"
                  {...fieldProps("city")}
                />
              </Field>
              <Field id="co-cp" label="Código postal" error={fieldErrors.cp}>
                <Input
                  id="co-cp"
                  value={cp}
                  onChange={(e) => { setCp(e.target.value.replace(/\D/g, "").slice(0, 4)); clearFieldError("cp"); }}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="Ej: 6700"
                  {...fieldProps("cp")}
                />
              </Field>

              {/* Resultado de la cotización: aparece solo cuando hay CP y localidad. */}
              <div className="flex items-end" aria-live="polite">
                <div className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-secondary px-4 py-2 text-[15px]">
                  <Truck className="size-5 shrink-0 text-primary" aria-hidden />
                  {quoting || (canQuote && !quoted && !quoteErrorMessage) ? (
                    <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Calculando envío…</span>
                  ) : quoted ? (
                    <span>
                      Envío: <strong className={cn(quoted.free && "text-success")}>{quoted.free ? "¡Gratis!" : formatPrice(shippingCost ?? 0)}</strong>
                    </span>
                  ) : quoteErrorMessage ? (
                    <span>
                      {quoteErrorMessage}{" "}
                      <button type="button" onClick={quote} className="min-h-11 font-semibold text-accent underline underline-offset-4">
                        Probá de nuevo
                      </button>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Completá CP y localidad para ver el envío</span>
                  )}
                </div>
              </div>
            </div>

            {method === "domicilio" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_140px]">
                <Field id="co-street" label="Calle" error={fieldErrors.street}>
                  <Input id="co-street" value={street} onChange={(e) => { setStreet(e.target.value); clearFieldError("street"); }} autoComplete="address-line1" {...fieldProps("street")} />
                </Field>
                <Field id="co-number" label="Número" error={fieldErrors.number}>
                  <Input id="co-number" value={number} onChange={(e) => { setNumber(e.target.value); clearFieldError("number"); }} inputMode="numeric" {...fieldProps("number")} />
                </Field>
                <Field id="co-floor" label="Piso / depto" optional className="sm:col-span-2">
                  <Input id="co-floor" value={floorApt} onChange={(e) => setFloorApt(e.target.value)} autoComplete="address-line2" className={FIELD} />
                </Field>
              </div>
            )}

            {method === "sucursal" && (
              <p className="mt-4 text-[15px] text-muted-foreground">
                Te avisamos por mail en qué sucursal retirarlo cuando lo despachemos.
              </p>
            )}

            <Field id="co-dni" label="DNI de quien recibe" error={fieldErrors.dni} className="mt-4">
              <Input
                id="co-dni"
                value={dni}
                onChange={(e) => { setDni(e.target.value.replace(/[^\d.\s-]/g, "").slice(0, 12)); clearFieldError("dni"); }}
                inputMode="numeric"
                autoComplete="off"
                placeholder="Ej: 30123456"
                {...fieldProps("dni", "co-dni-hint")}
              />
              <p id="co-dni-hint" className="text-[14px] text-muted-foreground">Lo pide la empresa de envío para entregarte el pedido.</p>
            </Field>

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
              <span className="min-w-0 break-words text-foreground">
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
        <CartSummary subtotal={subtotal} discount={discount} shippingCost={shippingCost} total={total} freeShipping={couponFreeShipping || quoted?.free} />
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[14px] leading-relaxed text-muted-foreground">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 rounded border-input accent-primary"
          />
          <span>
            Acepto los{" "}
            <a href="/terminos" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline underline-offset-2">Términos y condiciones</a>{" "}
            y la{" "}
            <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline underline-offset-2">Política de privacidad</a>.
          </span>
        </label>
        {error && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-[15px] font-medium text-destructive" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={submitting || redirecting || paymentsDisabled}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-6 text-[16px] font-semibold text-white transition hover:bg-foreground/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {submitting || redirecting ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden /> : <Lock className="size-5" aria-hidden />}
          {/* El total solo se muestra cuando ya incluye el envío. */}
          {redirecting
            ? "Te llevamos a Mercado Pago…"
            : shippingCost != null ? `Pagar ${formatPrice(total)} con Mercado Pago` : "Pagar con Mercado Pago"}
        </button>
        <p className="text-center text-[14px] text-muted-foreground">
          {paymentsDisabled ? "Vista previa: los pagos están desactivados." : "Te llevamos a Mercado Pago para pagar seguro."}
        </p>
      </aside>
    </form>
  );
}
