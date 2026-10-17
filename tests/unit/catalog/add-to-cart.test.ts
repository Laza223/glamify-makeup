import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CatalogVariant } from "@/lib/catalog/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/cart/cart-provider", () => ({ useCartUI: () => ({ openCart: vi.fn() }) }));
vi.mock("@/app/(storefront)/actions", () => ({ addToCartAction: vi.fn() }));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

import { AddToCart } from "@/components/cart/add-to-cart";

// Vitest compila TSX con el runtime clásico (tsconfig jsx: preserve): los componentes esperan `React` global.
(globalThis as { React?: unknown }).React = React;

const variant = (id: string, stock: number): CatalogVariant => ({
  id,
  name: `Tono ${id}`,
  sku: `SKU-${id}`,
  swatchHex: null,
  priceOverride: null,
  stock,
  lowStockThreshold: 3,
  image: null,
  active: true,
});

const WA = "https://wa.me/5491100000000?text=hola";
const sticky = { productName: "Labial", price: 1000 };
const render = (variants: CatalogVariant[], whatsappUrl: string | null = WA) =>
  renderToStaticMarkup(React.createElement(AddToCart, { variants, stickyBar: sticky, whatsappUrl }));

describe("AddToCart", () => {
  it("con stock: botón de compra, stepper y barra sticky", () => {
    const html = render([variant("1", 5)]);
    expect(html).toContain("Agregar al carrito");
    expect(html).toContain('aria-label="Cantidad"');
    expect(html).toContain('data-testid="sticky-buy-bar"');
    expect(html).not.toContain("Consultanos por WhatsApp");
  });

  it("producto agotado: CTA a WhatsApp, sin stepper ni barra sticky", () => {
    const html = render([variant("1", 0), variant("2", 0)]);
    expect(html).toContain("Consultanos por WhatsApp");
    expect(html).toContain(`href="${WA}"`);
    expect(html).not.toContain('data-testid="sticky-buy-bar"');
    expect(html).not.toContain('aria-label="Cantidad"');
    expect(html).not.toContain("Agregar al carrito");
  });

  it("agotado y sin número de WhatsApp cargado: queda el botón deshabilitado 'Sin stock'", () => {
    const html = render([variant("1", 0)], null);
    expect(html).not.toContain("Consultanos por WhatsApp");
    expect(html).toMatch(/<button[^>]*id="main-pdp-cta"[^>]*disabled/);
  });
});
