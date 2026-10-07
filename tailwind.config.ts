import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1440px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "hsl(var(--primary-hover))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        // token de sección alterna (blueprint 02 §2: fondos alternos #FFF5FA)
        "surface-alt": "hsl(var(--surface-alt))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem", // cards ~16px (blueprint 02 §4)
      },
      fontFamily: {
        // --ff-* los resuelve globals.css (storefront y admin usan Nunito Sans + Playfair Display).
        sans: ["var(--ff-sans)", "system-ui", "sans-serif"],
        display: ["var(--ff-display)", "system-ui", "sans-serif"],
        // El logo actual es fijo (marca): siempre Playfair.
        logo: ["var(--font-playfair)", "Georgia", "serif"],
      },
      fontSize: {
        // escala blueprint 02 §3 (Tailwind no trae 32/40/48 exactos)
        "heading-sm": ["2rem", { lineHeight: "1.2" }], // 32px
        "heading-md": ["2.5rem", { lineHeight: "1.1" }], // 40px
        "heading-lg": ["3rem", { lineHeight: "1.05" }], // 48px hero desktop
      },
      boxShadow: {
        // soft UI luxury (Rhode / Glossier aesthetic)
        soft: "0 2px 10px -2px rgba(22, 20, 19, 0.04), 0 4px 16px -4px rgba(201, 138, 118, 0.06)",
        "soft-lg": "0 10px 30px -10px rgba(22, 20, 19, 0.08), 0 4px 20px -4px rgba(201, 138, 118, 0.12)",
        // glow glam para medallones/CTAs
        glow: "0 12px 30px -10px rgba(201, 138, 118, 0.45)",
      },
      transitionTimingFunction: {
        luxury: "cubic-bezier(0.16, 1, 0.3, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // entrada suave: leve subida + fade
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // shimmer effect for skeleton loaders
        shimmer: {
          "100%": {
            transform: "translateX(100%)",
          },
        },
        // Corazón de favoritos: latido corto al marcar.
        "heart-pop": {
          "0%": { transform: "scale(1)" },
          "30%": { transform: "scale(1.3)" },
          "60%": { transform: "scale(0.9)" },
          "100%": { transform: "scale(1)" },
        },
        // Tira de marcas: desplazamiento continuo (el contenido va duplicado, -50% cierra el loop).
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        // Contador del carrito: rebote corto con masa.
        "count-bump": {
          "0%": { transform: "scale(1)" },
          "35%": { transform: "scale(1.35)" },
          "70%": { transform: "scale(0.92)" },
          "100%": { transform: "scale(1)" },
        },
        "shimmer-luxury": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 2s infinite",
        "heart-pop": "heart-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        marquee: "marquee 40s linear infinite",
        "count-bump": "count-bump 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "shimmer-luxury": "shimmer-luxury 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
