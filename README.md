# Glamify Makeup

Tienda online de Glamify Makeup — ecommerce custom (Next.js 15 + Supabase + Prisma + **Vercel**).
Fuente de verdad del producto: [`blueprints/`](blueprints/) (00–09). Plan de M0: [`docs/superpowers/plans/`](docs/superpowers/plans/). Sistema de diseño: [`design-system/MASTER.md`](design-system/MASTER.md). Lanzamiento: [`docs/LAUNCH.md`](docs/LAUNCH.md).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 3 · shadcn/ui · Prisma 6 + **`@prisma/adapter-pg`** · Supabase (Postgres/Auth/Storage) · **Vercel** (funciones Node + Vercel Cron) · Vitest · Playwright.

## Desarrollo

```bash
pnpm install
cp .env.example .env.local   # completar con credenciales (ver SETUP.md)
pnpm prisma generate
pnpm dev                     # http://localhost:3000
```

> Dev y prod comparten la misma base de Supabase: no correr `prisma migrate dev` ni `db:push` contra ella. Las migraciones se escriben a mano y se aplican con `prisma migrate deploy` antes de mergear.

## Scripts

- `pnpm dev` — desarrollo (Next)
- `pnpm build` — prisma generate + next build
- `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm test:e2e`
- `pnpm db:studio` / `pnpm setup:storage`
- `pnpm db:seed` — seed de catálogo + cupones + zonas + ajustes
- `pnpm sim:webhook` — simula el webhook MP (verifica idempotencia/stock sin túnel)
- `pnpm micorreo:probe` — prueba de credenciales/cotización contra la API de MiCorreo

## Deploy (Vercel)

- Repo `Laza223/glamify-makeup-1` conectado a Vercel (proyecto `glamify-makeup-1`, dominio `www.glamifymakeup.site`).
- Cada PR tiene su preview; al mergear a `main` se despliega solo a producción. GitHub Actions corre lint, typecheck, test y build.
- Variables y secretos: Vercel → Settings → Environment Variables (Production). Después de cambiar una, redeploy.
- Cron horario: `vercel.json` → `/api/cron` (carrito abandonado, autocancelación de pedidos impagos, seguimiento de envíos). Requiere `CRON_SECRET`.

## Convenciones

- Dinero: `Decimal(12,2)` ARS. Estados en inglés británico (`cancelled`).
- Timestamps UTC; conversión a ART en el front.
- Secrets solo en `.env.local` / variables de Vercel (nunca en git).
- Una rama por cambio; PR + CI verde antes de `main`.
- Pagos: MP Checkout Pro (efectivo excluido), webhook con firma + idempotencia; total recalculado en server.
