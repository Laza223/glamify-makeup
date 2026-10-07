"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { businessInfo } from "@/lib/legal/business-info";

const linkClass =
  "inline-flex min-h-[38px] items-center text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring";

const columns: Array<{ title: string; links: Array<{ label: string; href: string; external?: boolean }> }> = [
  {
    title: "Tienda",
    links: [
      { label: "Catálogo Completo", href: "/tienda" },
      { label: "Sobre Nosotras", href: "/nosotras" },
    ],
  },
  {
    title: "Ayuda",
    links: [
      { label: "Contacto", href: "/contacto" },
      { label: "Preguntas Frecuentes", href: "/preguntas-frecuentes" },
      { label: "Envíos y Pagos", href: "/envios-y-pagos" },
    ],
  },
  {
    title: "Legales",
    links: [
      { label: "Términos y Condiciones", href: "/terminos" },
      { label: "Política de Privacidad", href: "/privacidad" },
      { label: "Botón de Arrepentimiento", href: "/arrepentimiento" },
      { label: "Defensa del Consumidor", href: businessInfo.consumerDefenseUrl, external: true },
    ],
  },
];

export function SiteFooter() {
  const pathname = usePathname();
  const isCheckout = pathname.startsWith("/checkout");

  if (isCheckout) {
    return (
      <footer className="mt-8 border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Glamify Makeup. Pagos procesados por Mercado Pago.</p>
      </footer>
    );
  }

  return (
    <footer className="mt-16 border-t border-border/80 bg-white/95 backdrop-blur-md">
      <div className="container grid grid-cols-2 gap-8 py-12 text-sm text-muted-foreground md:grid-cols-4">
        <div className="col-span-2 md:col-span-1 space-y-3">
          <div className="inline-block">
            <Logo size="sm" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
            Envíos seguros a todo el país. Los mejores productos y tendencias para resaltar tu belleza.
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-foreground">{col.title}</h2>
            <ul className="space-y-1">
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
            <div className="container flex flex-col items-center justify-between gap-4 border-t border-border/60 py-5 text-xs text-muted-foreground md:flex-row">
        <div className="flex flex-col items-center gap-1 text-center md:items-start md:text-left">
          <p>© {new Date().getFullYear()} Glamify Makeup. Todos los derechos reservados.</p>
          <p className="text-[11px] text-muted-foreground/80">Medios de pago: {businessInfo.paymentMethods}</p>
        </div>

        <a
          href="https://axxensystems.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/70 px-3.5 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white hover:text-foreground hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Sitio web hecho por Axxen Systems"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/75 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span>Sitio web hecho por</span>
          <span className="font-semibold text-foreground transition-colors group-hover:text-primary">
            Axxen Systems
          </span>
          <svg
            className="h-3 w-3 text-muted-foreground/70 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4.5 11.5L11.5 4.5M11.5 4.5H6.5M11.5 4.5V9.5" />
          </svg>
        </a>
      </div>
    </footer>
  );
}
