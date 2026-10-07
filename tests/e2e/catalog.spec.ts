import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1024", width: 1024, height: 768 },
];

for (const vp of VIEWPORTS) {
  test.describe(`catálogo @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("home → tienda → ficha con datos reales", async ({ page }) => {
      // Home
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      // La home tiene que llevar a la tienda (por href, no por el texto del CTA).
      await expect(page.getByRole("main").locator('a[href="/tienda"]:visible').first()).toBeVisible();

      // Tienda
      await page.goto("/tienda");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const firstProduct = page.locator('a[href^="/producto/"]').first();
      await expect(firstProduct).toBeVisible();

      // Ficha
      await firstProduct.click();
      await expect(page).toHaveURL(/\/producto\//);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      // precio en ARS visible (formato "$ 1.234,00")
      await expect(page.getByText(/\$\s?[\d.]+/).first()).toBeVisible();
    });

    test("navegación por categoría con breadcrumbs", async ({ page }) => {
      await page.goto("/tienda/labios");
      // Mobile muestra "volver a la categoría padre", desktop el breadcrumb completo: ambos son un
      // <nav> dentro de <main> que linkea a /tienda.
      await expect(page.getByRole("main").getByRole("navigation").locator('a[href="/tienda"]:visible').first()).toBeVisible();
      await expect(page.locator('a[href^="/producto/"]').first()).toBeVisible();
    });
  });
}
