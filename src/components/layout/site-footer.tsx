"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { businessInfo } from "@/lib/legal/business-info";

const linkClass =
  "inline-flex min-h-11 items-center text-[15px] text-foreground underline-offset-4 transition-colors hover:text-accent hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const columns: Array<{ title: string; links: Array<{ label: string; href: string; external?: boolean }> }> = [
  {
    title: "Tienda",
    links: [
      { label: "Todo el catálogo", href: "/tienda" },
      { label: "Armá tu kit", href: "/arma-tu-kit" },
      { label: "Nosotras", href: "/nosotras" },
    ],
  },
  {
    title: "Ayuda",
    links: [
      { label: "Contacto", href: "/contacto" },
      { label: "Preguntas frecuentes", href: "/preguntas-frecuentes" },
      { label: "Envíos y pagos", href: "/envios-y-pagos" },
    ],
  },
  {
    title: "Legales",
    links: [
      { label: "Términos y condiciones", href: "/terminos" },
      { label: "Política de privacidad", href: "/privacidad" },
      { label: "Botón de arrepentimiento", href: "/arrepentimiento" },
      { label: "Defensa del consumidor", href: businessInfo.consumerDefenseUrl, external: true },
    ],
  },
];

export function SiteFooter() {
  const pathname = usePathname();
  const isCheckout = pathname.startsWith("/checkout");

  if (isCheckout) {
    return (
      <footer className="mt-8 border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>
          © {new Date().getFullYear()} Glamify Makeup ·{" "}
          <Link href="/terminos" className="underline-offset-4 hover:underline">Términos</Link> ·{" "}
          <Link href="/arrepentimiento" className="underline-offset-4 hover:underline">Botón de arrepentimiento</Link>
        </p>
      </footer>
    );
  }

  return (
    <footer className="mt-20 bg-secondary text-foreground">
      <div className="container grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-4">
        <div className="col-span-2 space-y-3 md:col-span-1">
          <Logo size="sm" />
          <p className="max-w-xs font-display text-xl font-semibold leading-snug">Bueno, bonito y barato.</p>
          <p className="max-w-xs text-[15px] leading-relaxed text-foreground/80">
            Maquillaje de marcas que ya conocés. Desde Luján a todo el país.
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-1 font-sans text-sm font-bold text-foreground">{col.title}</h2>
            <ul>
              {col.links.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a href={link.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="container flex flex-col items-center justify-between gap-3 border-t border-foreground/10 py-5 pb-24 text-sm text-foreground/80 md:flex-row md:pb-5">
        <div className="space-y-0.5 text-center md:text-left">
          <p>© {new Date().getFullYear()} Glamify Makeup</p>
          <p>Medios de pago: {businessInfo.paymentMethods}</p>
        </div>
        <a
          href="https://axxensystems.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
        >
          Sitio hecho por <span className="font-semibold text-foreground">Axxen Systems</span>
        </a>
      </div>
    </footer>
  );
}
