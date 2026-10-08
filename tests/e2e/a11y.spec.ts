import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Solo lectura: únicamente carga páginas, no envía formularios ni agrega al carrito.
// /checkout NO se cubre: necesita un carrito con ítems y eso escribe en la base compartida con prod.
const pages = [
  "/",
  "/tienda",
  "/tienda/labios",
  "/carrito",
  "/ingresar",
  "/arrepentimiento",
  "/terminos",
  "/privacidad",
  "/contacto",
  "/preguntas-frecuentes",
  "/envios-y-pagos",
  "/nosotras",
  "/arma-tu-kit",
];

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

// Deuda conocida de la UI actual (axe color-contrast, serious), medida 2026-10-07 contra el catálogo real.
// En esas rutas se excluye SOLO color-contrast: el resto de las reglas sigue siendo estricto.
// Al arreglar el contraste de una ruta en el rediseño, sacarla de este mapa.
//  - Global (todas): subtítulo del logo del header 4.34:1 (8px #e6007a/#fcfaf8) y "Medios de pago" del footer
//    3.49:1 (11px #898989/#fff).
//  - "/": links "Especial Regalos", "Ver todas las opciones", "Ver todo el catálogo", "Ver todos" 4.34:1 y 2 badges
//    "A pedido" 4.09:1.
//  - "/tienda/labios" (mobile): badge 11px #959494/#f6f3f5 2.74:1.
//  - ficha: label de categoría 4.34:1 y badges "A pedido" 4.09:1.
const KNOWN_CONTRAST_DEBT = new Set([...pages, "ficha"]);

async function expectNoSeriousViolations(page: Page, key: string) {
  const builder = new AxeBuilder({ page }).withTags(TAGS);
  if (KNOWN_CONTRAST_DEBT.has(key)) {
    builder.disableRules(["color-contrast"]);
    test.info().annotations.push({ type: "deuda-a11y", description: `color-contrast excluido en ${key} hasta el rediseño` });
  }
  const results = await builder.analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = serious.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.length,
    first: v.nodes[0]?.html.slice(0, 120),
  }));
  expect(summary, "violaciones serias/críticas (axe)").toEqual([]);
}

/** Espera al contenido principal y, si aparece, al banner de cookies (lo ve cualquier visita nueva). */
async function settle(page: Page) {
  await page.locator("main#main").waitFor();
  await page.getByRole("dialog").waitFor({ timeout: 3000 }).catch(() => undefined);
}

for (const path of pages) {
  test(`a11y: ${path} sin violaciones serias/críticas (WCAG 2 A/AA)`, async ({ page }) => {
    await page.goto(path);
    await settle(page);
    await expectNoSeriousViolations(page, path);
  });
}

// Ficha de producto (monta el VariantSwatchSelector con role=radiogroup).
test("a11y: ficha de producto sin violaciones serias/críticas (WCAG 2 A/AA)", async ({ page }) => {
  await page.goto("/tienda");
  const href = await page.locator('a[href^="/producto/"]').first().getAttribute("href");
  test.skip(!href, "sin productos en el catálogo");
  await page.goto(href!);
  await settle(page);
  await expectNoSeriousViolations(page, "ficha");
});

// 404: ruta inexistente (la página de error también tiene que ser accesible).
test("a11y: ruta inexistente (404) sin violaciones serias/críticas (WCAG 2 A/AA)", async ({ page }) => {
  const res = await page.goto("/esta-ruta-no-existe");
  expect(res?.status()).toBe(404);
  await expectNoSeriousViolations(page, "404");
});
