import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { productImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

// Abanico de 3 fotos que se abre al pasar el mouse (origen abajo, como cartas en la mano).
const FAN = [
  "z-0 [transform:translate(-100%,-50%)_rotate(-9deg)] group-hover:[transform:translate(-112%,-53%)_rotate(-14deg)]",
  "z-10 [transform:translate(-50%,-50%)] group-hover:[transform:translate(-50%,-58%)]",
  "z-0 [transform:translate(0%,-50%)_rotate(9deg)] group-hover:[transform:translate(12%,-53%)_rotate(14deg)]",
];

/** Bloque de regalos: ramos y boxes a medida por WhatsApp, más la Gift Card si está a la venta. */
export function GiftBand({
  whatsappHref,
  photos,
  giftCardHref,
}: {
  whatsappHref: string;
  photos: string[];
  giftCardHref: string | null;
}) {
  const fan = photos.slice(0, 3).map((src) => productImageUrl(src)).filter((u): u is string => Boolean(u));

  return (
    <section
      aria-labelledby="regalos"
      className="reveal-scale group relative isolate overflow-hidden rounded-[24px] bg-foreground text-white"
    >
      {/* Un solo brillo rosa detrás del abanico. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/2 -z-10 size-[420px] -translate-y-1/2 rounded-full bg-primary/25 blur-[90px] md:right-0"
      />

      <div className="grid items-center gap-6 px-6 py-10 md:grid-cols-2 md:gap-10 md:px-14 md:py-16">
        {fan.length === 3 && (
          <div className="relative h-[230px] md:order-2 md:h-[340px]" aria-hidden>
            {fan.map((src, i) => (
              <span
                key={src}
                className={cn(
                  "absolute left-1/2 top-1/2 aspect-[4/5] w-[38%] origin-bottom overflow-hidden rounded-[18px] bg-white shadow-[0_18px_40px_-12px_rgb(0_0_0/0.6)] ring-4 ring-foreground transition-transform duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none md:w-[34%]",
                  FAN[i],
                )}
              >
                <Image src={src} alt="" fill sizes="(min-width: 768px) 200px, 140px" className="object-cover" />
              </span>
            ))}
          </div>
        )}

        <div className="space-y-5 text-center md:text-left">
          <h2 id="regalos" className="font-display text-[34px] font-normal leading-[1.1] text-white md:text-[52px]">
            Regalá algo <em className="font-medium text-[#FF4FA3]">divino</em>
          </h2>
          <p className="mx-auto max-w-md text-[16px] leading-relaxed text-white/80 md:mx-0 md:text-[17px]">
            Ramos y boxes de maquillaje armados a medida, con lo que le encanta y el presupuesto que tengas. Lo charlamos
            por WhatsApp.
          </p>
          <div className="flex flex-col items-center gap-3 pt-1 sm:flex-row sm:justify-center md:justify-start">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="group/cta inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-7 text-[15px] font-semibold text-primary-foreground transition hover:bg-primary-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
            >
              Armar mi regalo
              <ArrowRight className="size-4 transition-transform group-hover/cta:translate-x-1" aria-hidden />
            </a>
            {giftCardHref && (
              <Link
                href={giftCardHref}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/25 px-6 text-[15px] font-semibold text-white transition hover:border-white/60 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                O regalá una Gift Card
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
