import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuantityStepper, clampQty } from "@/components/catalog/quantity-stepper";

// Vitest compila TSX con el runtime clásico (tsconfig jsx: preserve): los componentes esperan `React` global.
(globalThis as { React?: unknown }).React = React;

describe("clampQty", () => {
  it("deja pasar una cantidad dentro del rango", () => {
    expect(clampQty(2, 5)).toBe(2);
    expect(clampQty(5, 5)).toBe(5);
  });
  it("recorta al nuevo máximo cuando la variante tiene menos stock", () => {
    expect(clampQty(5, 2)).toBe(2);
    expect(clampQty(9, 1)).toBe(1);
  });
  it("nunca baja de 1, ni con máximo 0 o negativo", () => {
    expect(clampQty(0, 5)).toBe(1);
    expect(clampQty(-3, 5)).toBe(1);
    expect(clampQty(3, 0)).toBe(1);
  });
});

describe("QuantityStepper", () => {
  it("arranca recortado al máximo si el inicial lo supera", () => {
    const html = renderToStaticMarkup(React.createElement(QuantityStepper, { initial: 8, max: 3 }));
    expect(html).toContain(">3</span>");
  });
});
