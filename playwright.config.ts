import { defineConfig, devices } from "@playwright/test";

// Con PLAYWRIGHT_BASE_URL (p. ej. un preview de Vercel) no se levanta server local.
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // Holgura para `next dev` (compila cada ruta en la primera visita) y para previews fríos de Vercel.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL: externalBaseURL ?? "http://localhost:3000",
    trace: "on-first-retry",
    // Previews de Vercel con Deployment Protection: bypass por header + cookie.
    ...(bypassSecret
      ? {
          extraHTTPHeaders: {
            "x-vercel-protection-bypass": bypassSecret,
            "x-vercel-set-bypass-cookie": "true",
          },
        }
      : {}),
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      // La barra fija de compra es solo mobile (md:hidden).
      testIgnore: /sticky-bar\.spec\.ts/,
    },
    {
      name: "mobile",
      use: { browserName: "chromium", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
      // catalog.spec.ts fija sus propios viewports (375/768/1024): repetirlo acá no aporta.
      testIgnore: /catalog\.spec\.ts/,
    },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: "pnpm build && pnpm start",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? "",
          ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "",
          CUSTOMER_EMAIL: process.env.CUSTOMER_EMAIL ?? "",
          CUSTOMER_PASSWORD: process.env.CUSTOMER_PASSWORD ?? "",
        },
      },
});
