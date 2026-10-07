import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

export function GlamifyWelcomeBanner() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-pink-100 bg-gradient-to-b from-white via-pink-50/25 to-white p-8 text-center shadow-soft-lg sm:p-12 md:p-16">
      {/* Luces difusas sutiles de fondo (estilo luxury ambient) */}
      <div
        className="pointer-events-none absolute -left-12 -top-12 size-56 rounded-full bg-pink-200/30 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-12 -right-12 size-56 rounded-full bg-pink-300/25 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-3xl space-y-6">
        {/* Identificador superior editorial */}
        <p className="pl-[0.35em] text-[11px] font-bold uppercase tracking-[0.35em] text-primary sm:text-xs">
          Glamify Makeup
        </p>

        {/* Separador fino decorativo */}
        <div className="mx-auto h-px w-28 bg-gradient-to-r from-transparent via-pink-200 to-transparent" />

        {/* Frase central */}
        <h1 className="space-y-1">
          <span className="block font-display text-3xl font-normal leading-tight text-[#161413] sm:text-4xl md:text-5xl lg:text-6xl">
            Decile{" "}
            <span className="font-display text-4xl font-medium italic text-primary sm:text-5xl md:text-6xl lg:text-7xl">
              ¡Hola!
            </span>
          </span>
          <span className="block font-display text-2xl font-normal leading-tight text-[#161413] sm:text-3xl md:text-4xl lg:text-5xl">
            a tu nuevo maquillaje favorito.
          </span>
        </h1>

        {/* Bajada */}
        <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          Labios, ojos y piel de marcas que ya conocés, con envío a todo el
          país.
        </p>

        {/* Botones de acción */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2 sm:gap-4">
          <Button
            asChild
            size="lg"
            className="rounded-2xl bg-[#161413] px-7 py-6 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:scale-[1.02] hover:bg-neutral-800 hover:shadow-soft-lg active:scale-[0.98] sm:px-8"
          >
            <Link href="/tienda" className="flex items-center gap-2">
              <span>Explorar Catálogo</span>
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-2xl border-pink-200 bg-white/80 px-6 py-6 text-sm font-semibold text-[#161413] shadow-soft backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:border-pink-300 hover:bg-pink-50 hover:shadow-soft-lg active:scale-[0.98] sm:px-7"
          >
            <Link href="/arma-tu-kit" className="flex items-center gap-1.5">
              <Sparkles className="size-4 text-primary" />
              <span>Armá tu kit</span>
            </Link>
          </Button>
        </div>

        {/* Badges de confianza */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
          <span>• Envíos a todo el país</span>
          <span>• Pagos seguros con Mercado Pago</span>
        </div>
      </div>
    </section>
  );
}
