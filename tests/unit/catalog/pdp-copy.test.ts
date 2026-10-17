import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TrustBadges } from "@/components/catalog/trust-badges";
import { PdpAccordions } from "@/components/catalog/pdp-accordions";
import { businessInfo } from "@/lib/legal/business-info";

const render = (props: { freeShippingThreshold: number; soldOut?: boolean }) =>
  renderToStaticMarkup(React.createElement(TrustBadges, props));

// Vitest compila TSX con el runtime clásico (tsconfig jsx: preserve): los componentes esperan `React` global.
(globalThis as { React?: unknown }).React = React;

describe("TrustBadges", () => {
  it("usa el plazo de despacho de businessInfo", () => {
    expect(render({ freeShippingThreshold: 47500 })).toContain(`Lo despachamos en ${businessInfo.dispatchWindow}`);
  });
  it("muestra el umbral de envío gratis cuando es mayor a 0", () => {
    expect(render({ freeShippingThreshold: 47500 })).toContain("gratis desde");
  });
  it("con umbral 0 no dice 'gratis desde $0'", () => {
    const html = render({ freeShippingThreshold: 0 });
    expect(html).not.toContain("gratis desde");
    expect(html).toContain("Envío a todo el país");
  });
  it("sin stock oculta el despacho y deja envío y pago", () => {
    const html = render({ freeShippingThreshold: 47500, soldOut: true });
    expect(html).not.toContain("despachamos");
    expect(html).toContain("Envío a todo el país");
    expect(html).toContain("Mercado Pago");
  });
});

describe("PdpAccordions", () => {
  it("lista los medios de pago de businessInfo", () => {
    const html = renderToStaticMarkup(React.createElement(PdpAccordions, { description: null }));
    expect(html).toContain(`Medios de pago:</strong> ${businessInfo.paymentMethods}.`);
  });
});
