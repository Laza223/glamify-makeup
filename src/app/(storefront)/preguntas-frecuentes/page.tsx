import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, MessageCircle } from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Dudas sobre envíos, pagos, cambios y devoluciones en Glamify Makeup.",
};

const faqs: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "¿Hacen envíos a todo el país?",
    a: (
      <>
        Sí, enviamos a toda la Argentina por Correo Argentino (a domicilio o sucursal). Mirá zonas, costos y plazos
        en <Link href="/envios-y-pagos">Envíos y pagos</Link>.
      </>
    ),
  },
  {
    q: "¿Cuánto tarda en llegar mi pedido?",
    a: "Despachamos dentro de las 24 a 72 horas hábiles de acreditado el pago. El tiempo de tránsito depende de tu zona; el seguimiento te llega por email.",
  },
  {
    q: "¿Qué medios de pago aceptan?",
    a: "Pagás de forma segura con Mercado Pago: tarjetas de crédito/débito y dinero en cuenta. No guardamos los datos de tu tarjeta.",
  },
  {
    q: "¿Puedo cambiar o devolver un producto?",
    a: (
      <>
        Tenés 10 días corridos para arrepentirte de la compra (art. 34 Ley 24.240): gestionalo desde el{" "}
        <Link href="/arrepentimiento">Botón de Arrepentimiento</Link>. Si te llegó roto, fallado o equivocado,
        escribinos por <Link href="/contacto">contacto</Link> con una foto y te lo cambiamos o te devolvemos el dinero,
        con el envío a nuestro cargo. Por higiene, no hacemos cambios por gusto fuera de esos casos.
      </>
    ),
  },
  {
    q: "¿El stock es real?",
    a: "Sí. Lo que ves disponible es lo que tenemos; cuando queda poco, te lo mostramos en la ficha del producto.",
  },
  {
    q: "¿Cómo sé si un tono me queda?",
    a: "Las fotos son lo más fieles posible, pero el tono puede variar según tu pantalla. Si tenés dudas, escribinos y te asesoramos antes de comprar.",
  },
];

export default function FaqPage() {
  return (
    <section className="mx-auto max-w-prose space-y-8 py-8 md:py-12">
      <PageTitle lead="Preguntas" accent="frecuentes">
        Lo que más nos consultan, en corto.
      </PageTitle>

      <div className="divide-y divide-border border-y border-border">
        {faqs.map((f, i) => (
          <details key={f.q} className="group" open={i === 0}>
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-[10px] py-4 text-[17px] font-semibold text-foreground transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              <span>{f.q}</span>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary transition group-open:bg-foreground group-open:text-white">
                <ChevronDown className="size-4 transition-transform duration-300 group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
              </span>
            </summary>
            <div className="pb-5 pr-12 text-[16px] leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4">
              {f.a}
            </div>
          </details>
        ))}
      </div>

      <div className="flex flex-col items-start gap-4 rounded-[20px] bg-secondary p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-[22px] leading-snug">¿Te quedó alguna <em className="font-medium text-primary">duda</em>?</p>
          <p className="mt-1 text-[15px] text-muted-foreground">Escribinos y te ayudamos con tu pedido o a elegir tu tono.</p>
        </div>
        <Link
          href="/contacto"
          className="inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-foreground px-6 text-[16px] font-semibold text-white transition hover:bg-foreground/85 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <MessageCircle className="size-[18px]" aria-hidden />
          Escribinos
        </Link>
      </div>
    </section>
  );
}
