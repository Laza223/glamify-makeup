import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }), usePathname: () => "/arma-tu-kit" }));
vi.mock("@/components/cart/cart-provider", () => ({ useCartUI: () => ({ openCart: vi.fn() }) }));
vi.mock("@/app/(storefront)/actions", () => ({ addKitToCartAction: vi.fn(), addToCartAction: vi.fn() }));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

import { KitBuilder } from "@/components/bundle/kit-builder";

// Vitest compila TSX con el runtime clásico (tsconfig jsx: preserve): los componentes esperan `React` global.
(globalThis as { React?: unknown }).React = React;

describe("KitBuilder", () => {
  it("un paso sin productos con stock muestra un estado vacío con salida a la tienda, no una grilla vacía", () => {
    const html = renderToStaticMarkup(
      React.createElement(KitBuilder, { labios: [], ojos: [], rostro: [], curatedCombos: [] }),
    );
    expect(html).toContain("Por ahora no tenemos productos de labios con stock");
    expect(html).toContain('href="/tienda"');
    expect(html).not.toContain("<ul class=\"grid grid-cols-2");
  });
});
