import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Playfair_Display, Nunito_Sans } from "next/font/google";
import { appBaseUrl } from "@/lib/seo/url";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import "./globals.css";

// Editorial glam (ADR 0003): Playfair Display (títulos, logo, la itálica de "¡Hola!") + Nunito Sans (UI y cuerpo).
// Itálica real cargada: antes el navegador la fingía inclinando la romana.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

const DESCRIPTION =
  "Glam accesible: maquillaje y accesorios lindos, en tendencia y a buen precio. Envíos a todo el país.";

export const metadata: Metadata = {
  metadataBase: new URL(appBaseUrl()),
  title: {
    default: "Glamify Makeup — Maquillaje y accesorios",
    template: "%s — Glamify Makeup",
  },
  description: DESCRIPTION,
  applicationName: "Glamify Makeup",
  openGraph: {
    type: "website",
    siteName: "Glamify Makeup",
    locale: "es_AR",
    title: "Glamify Makeup — Maquillaje y accesorios",
    description: "Glam accesible, a precio real. Envíos a todo el país.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Glamify Makeup",
    description: "Glam accesible, a precio real.",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", sizes: "any" },
    ],
    apple: [{ url: "/icon.svg" }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#E6007A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" className={`${playfair.variable} ${nunito.variable}`}>
      <body>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}

