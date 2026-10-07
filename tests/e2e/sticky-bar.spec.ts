import { test, expect, type Page } from "@playwright/test";

// Solo lectura: no agrega al carrito, solo verifica qué tono muestra la barra fija.
// Solo corre en el proyecto `mobile` (390x844): la barra es md:hidden (ver playwright.config.ts).

/** Busca en /tienda una ficha con al menos 2 tonos con stock. */
async function openProductWithTwoTones(page: Page): Promise<boolean> {
  await page.goto("/tienda");
  const hrefs = await page
    .locator('a[href^="/producto/"]')
    .evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("href") ?? ""))]);
  for (const href of hrefs.slice(0, 20)) {
    await page.goto(href);
    const enabled = page.getByRole("radiogroup", { name: "Elegí un tono" }).getByRole("radio", { disabled: false });
    if ((await enabled.count()) >= 2) return true;
  }
  return false;
}

test("la barra fija mobile usa el tono elegido, no el primero con stock", async ({ page }) => {
  test.skip(!(await openProductWithTwoTones(page)), "no hay productos con 2+ tonos con stock");

  const radios = page.getByRole("radiogroup", { name: "Elegí un tono" }).getByRole("radio", { disabled: false });
  const last = radios.last();
  const toneName = (await last.getAttribute("aria-label")) ?? "";
  await last.click();
  await expect(last).toHaveAttribute("aria-checked", "true");

  // Al scrollear fuera del CTA principal aparece la barra fija.
  await page.mouse.wheel(0, 4000);
  await expect(page.getByText(`(${toneName})`, { exact: true })).toBeVisible();
});
