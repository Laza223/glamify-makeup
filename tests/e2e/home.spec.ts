import { test, expect } from "@playwright/test";

test("la home responde y muestra la marca", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // El header linkea a la home (logo) y el contenido principal lleva a la tienda.
  await expect(page.getByRole("banner").locator('a[href="/"]').first()).toBeVisible();
  await expect(page.getByRole("main").locator('a[href="/tienda"]').first()).toBeVisible();
});
