# CLAUDE.md

Guía para Claude Code (claude.ai/code) en este repositorio.

# Glamify Makeup

Ecommerce B2C de maquillaje y accesorios para chicas de 16–35 en Argentina (Luján / envíos a todo el país). Stack serverless Next.js 15 en Vercel + Supabase Postgres vía Prisma adapter. Glam accesible, no humo.

## Comandos y Definition of Done

**Antes de declarar terminado cualquier cambio** — estos tres (más `pnpm build`) son exactamente lo que corre el check *CI / quality*:

```bash
pnpm lint           # ESLint sobre src/
pnpm typecheck      # correr también después de cada cambio, no solo al cerrar
pnpm test           # tests unitarios y de integración con Vitest
```

Resto:
- `pnpm dev` — localhost:3000 · `pnpm build` — `prisma generate` (wasm) + `next build`
- `pnpm format:check` NO es parte del DoD: el CI no lo corre y ~300 archivos no siguen Prettier. No correr `pnpm format` (reformatea medio repo).
- `pnpm test:watch` · `pnpm test:e2e` — Playwright E2E (`@axe-core/playwright` para a11y)
- `pnpm db:migrate` — `prisma migrate dev` · `pnpm db:push` · `pnpm db:studio` · `pnpm db:seed` / `cleanup`
- `pnpm catalog:import` — import CSV · `admin:create` / `customer:create` · `sim:webhook` (MP local) · `micorreo:probe`
- **CI / Deploy:** GitHub Actions corre `quality` (lint, typecheck, test, build) en cada PR. Al mergear a `main`, la integración Git de Vercel despliega a producción (cada PR tiene su preview). Estado: `npx vercel ls --prod` · logs: `npx vercel logs --environment production --since 30m --no-follow`.
- **Guard de escritura en DB:** dev y prod comparten base Supabase. Scripts mutadores (`prod-write-guard.ts`) exigen tipear el host por terminal interactiva.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript strict · shadcn/ui + Tailwind CSS v3.4 · Vitest + Playwright
- **Deploy:** Vercel (plan Pro, funciones Node serverless), proyecto `glamify-makeup-1`, dominio `www.glamifymakeup.site`. Migrado desde Cloudflare Workers en septiembre 2026.
- **PostgreSQL vía Supabase** (Auth + Storage) · **Prisma ORM** con driver adapter (`@prisma/adapter-pg`).
- **Cliente DB (`src/lib/prisma.ts`):** singleton de módulo **perezoso** (Proxy que crea el cliente en el primer uso), con `process.env.DATABASE_URL`. Perezoso porque `next build` importa las rutas sin env de DB.
- **MercadoPago Checkout Pro:** pagos instantáneos (tarjeta y dinero en cuenta; efectivo/offline EXCLUIDO). `webhook-service.ts` valida firma HMAC `x-signature` (`validateMpSignature`) y re-consulta el pago por API a MP. Idempotencia por `mpPaymentId`.
- **Envíos:** Correo Argentino (MiCorreo / PaqAr v2 REST + JWT) cotización en vivo por CP/peso desde Luján (6700). Tabla de zonas `ShippingZone` como fallback/override. (*Zipnova descartado por markup ~2x*).
- **Resend:** email transaccional (alertas de compra/arrepentimiento a dueña; confirmación/despacho/abandono a clientas).
- **PostHog:** analítica de eventos y conversión · **Cron:** Vercel Cron horario → `/api/cron` (`vercel.json`, protegido con `CRON_SECRET`): `runAbandonedCartJob`, `runOrderExpiryJob` (24h) y `runShipmentTrackingJob` (seguimiento MiCorreo).

## Arquitectura del código

Patrón: **Next.js App Router + servicios desacoplados en `src/lib/*`**. La lógica transaccional **NO vive en UI ni routing**.

- `src/app/(storefront)/*` — Storefront: home, `/tienda`, `/producto/[slug]`, `/carrito`, `/checkout` (un paso), `/cuenta`, `/ingresar`, `/arrepentimiento` (botón legal), páginas institucionales y legales (`/terminos`, `/privacidad`, `/envios-y-pagos`, `/preguntas-frecuentes`, `/contacto`, `/nosotras`).
- `src/app/admin/*` — Panel admin: `/admin/login`, `/admin/(panel)` (`/pedidos`, `/productos`, `/categorias`, `/combos`, `/cupones`, `/resenas`, métricas).
- `src/app/api/*` — Route Handlers exclusivamente para webhooks (`/api/webhooks/mercadopago`), callbacks de auth (`/auth/*`), sitemap y robots.
- `src/lib/*` — Dominios: `orders/` (checkout, máquina de estados, auto-shipment, expiry job, stock), `payments/` (adapter MP, firma HMAC, webhook effects), `cart/` (servicio, cookies, merge, job abandono), `catalog/`, `shipping/` (MiCorreo adapter, quote, zonas), `admin/` (`requireAdmin`, CRUDs, SKU generator), `customer/`, `coupons/` (`perCustomerLimit`), `reviews/` (moderación), `email/` (Resend templates), `prisma.ts` (cliente DB perezoso).
- **Guards y Auth:** Staff: Supabase Auth → verificación en tabla `User` (`role = 'owner' | 'admin'`). `requireAdmin()` en layouts y Server Actions. Clientas: Supabase Auth (email/Google) → `Customer` (uid = `Customer.id`). Compras de invitadas guardan contacto/dirección en `Order`. `middleware.ts`: refresca sesión.

## Invariantes de dominio

- **Montos en ARS con `Decimal(12,2)`** (Prisma / Decimal.js, NUNCA centavos ni float nativo). **Timestamps en UTC** en DB, conversión a ART solo en display. **UUIDs como PK** en todo (salvo `Setting.id="default"` y `RetractionRequest.seq` autoincrement para constancia `ARR-000123`).
- **ENUMs usan inglés británico: `cancelled` (doble L). NUNCA `canceled`.** (`OrderStatus`, `PaymentStatus`).
- **Estados:** `OrderStatus` (`pending_payment → paid → preparing → shipped → delivered` | `cancelled` | `refunded`) · `PaymentStatus` (espejo MP) · `ShipmentStatus` (`pending → ready → dispatched → in_transit → delivered` | `returned`).
- **SKU autogenerado:** `{PREFIJO_CATEGORIA}-{NNNN}` (ej. `LAB-0007`), prefijo 3 letras de la categoría, secuencial por categoría.
- **Stock en variantes:** Todo producto tiene al menos una variante (`ProductVariant`, o variante "Único"). El stock vive en `ProductVariant.stock`. Se descuenta al confirmar el pago en webhook (`PaymentStatus.approved`), validando disponibilidad en transacción Prisma. Combos descuentan de cada `ComboItem`.
- **Snapshots transaccionales:** `OrderItem` snapshotea nombre, variante, SKU y precio unitario. `Order.shippingAddress` guarda snapshot JSON de la dirección.
- **Categorías jerárquicas:** hasta 2 niveles (`parentId`). **Envío gratis:** umbral configurable en `Setting.freeShippingThreshold` ($47.500 ARS default). Origen: **CP 6700 (Luján)**.
- **Legalidad AR:** Botón de Arrepentimiento (Res. 424/2020, Art. 34 Ley 24.240, constancia `ARR-NNNNNN`). Ley 25.326 de Protección de Datos Personales.

## Vetos de producto (no reproponer)

- **Efectivo / offline (Rapipago / Pago Fácil): EXCLUIDO en v1** — Checkout Pro solo tarjeta y dinero en cuenta (`excluded_payment_types: ["ticket","atm"]`) para cobros instantáneos sin limbo (D04-2).
- **Reembolsos automáticos por API: DESCARTADOS** — Devolución manual por la dueña en panel MP + registro en admin. Reclamos por WhatsApp (D04-3).
- **Retiro en persona: NO** — 100% envíos a domicilio/sucursal de Correo Argentino (D05-5).
- **Zipnova: CANCELADO** (markup ~2x) — Se usa API oficial MiCorreo y tabla de zonas como fallback (ADR-0001).
- **Sorpresitas / Price Tiers (1x$1000 / 2x$1500): NO en web** — Mecánica de feria/presencial, no de ecommerce con envíos (blueprint 01).
- **Stock falso / Urgencia falsa: PROHIBIDO** — Viola ley de consumidor. `StockBadge` y ofertas solo con inventario y fechas reales (blueprint 06).
- **Emojis como íconos: PROHIBIDOS** (usar Lucide SVG) · **Dark mode: NO** (light mode only, Soft UI Evolution rosa `#FF2E93`).
- **Volver a Cloudflare Workers: NO** — el deploy es Vercel desde septiembre 2026 (D07-2 revisada; ver `docs/BITACORA.md`).
- **WhatsApp automatizado (Evolution Go) en v1: DIFERIDO** — v1 usa Resend para alertas; contacto vía botón manual `wa.me` (D07-1).

## Seguridad y Permisos

- **Admin:** `requireAdmin()` chequea sesión Supabase Auth + rol `owner`/`admin` en tabla `User`.
- **MP Webhook:** Valida firma HMAC en header `x-signature` (`validateMpSignature`), re-consulta estado a API MP (`getPayment`), procesa idempotentemente por `mpPaymentId`.
- **Secretos:** Solo en las variables de entorno de Vercel (Production) y `.env.local`. NUNCA en git ni en cliente (`MP_*`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_*`, `MICORREO_*`, `DATABASE_URL`).
- **Guard de mutación:** `scripts/prod-write-guard.ts` intercepta scripts locales para confirmar host de Supabase por terminal.

## Documentación

`blueprints/` (00–09) es la fuente de verdad: `00` visión/alcance · `01` modelo datos/Prisma · `02` storefront/UX · `03` admin · `04` checkout/MP · `05` envíos/MiCorreo · `06` conversión/growth · `07` arquitectura (escrito para Workers; el deploy hoy es Vercel) · `08` roadmap M0–M5 · `09` playbook.
Otros: `design-system/MASTER.md` · `docs/LAUNCH.md` (ops/go-live) · `docs/decisions/` (ADR 0001, 0002) · `SETUP.md` · `TODO.md` (diferidos).

## Skill routing

| Situación | Gana | Descartadas (no elegir) |
|---|---|---|
| Tarea no trivial — SIEMPRE primero | `protocolo-orquestacion` / `superpowers:brainstorming` | — |
| Feature nuevo | `entrega-feature` (superpowers brainstorming → writing-plans → TDD) | `lean-build` · `spec` |
| Bug / comportamiento raro | `superpowers:systematic-debugging` | `investigate-first` · `debug` |
| Fixes de una lista de hallazgos | `protocolo-fixes-general` | — |
| Revisar PR / diff | `code-review` / `revision-pr` | `review` |
| Verificar implementación propia | `verificacion-fresca` / `verification-before-completion` | — |
| Diseñar / ajustar interfaz de usuario (storefront) | `impeccable` + `PRODUCT.md` / `DESIGN.md` / `.impeccable/surfaces/` (rediseño en curso, ADR 0003) | `ux-ui-pro-max` · `MASTER.md` · UI ad-hoc |
| Correr / arreglar tests | `protocolo-testing` / Vitest + Playwright | — |
| Tocar DB / Prisma / Migraciones / deploy | `convenciones-stack` + `prisma-best-practices` | `db:push` en prod |
| Cierre de milestone / release | `cierre-release` + `docs/LAUNCH.md` | `ship` sin DoD |

## UX y Design System

> **Rediseño del storefront en curso** (`feat/rediseno-storefront`, ADR 0003, ledger `docs/rediseno/STATE.md`). La fuente visual del storefront pasa a ser `PRODUCT.md` + `DESIGN.md` + los surface briefs de `.impeccable/surfaces/`. Lo que sigue en esta sección (`MASTER.md`, `#FF2E93`, Playfair + Nunito, Soft UI Evolution) es el **estado anterior**: vale para el admin y como evidencia, no como regla del rediseño. Se mantienen: paleta rosa/blanco, logo actual, light mode, sin emojis, WCAG AA, touch targets ≥ 44px, `prefers-reduced-motion`.

- **Visual:** Girly clean + glam accesible. Rosa eléctrico `#FF2E93` (primario), `#E01E7D` (hover), `#FF9ED1` (secundario), `#6E0B3F` (texto), fondos `#FFF5F9` y blanco.
- **Tipografía:** Playfair Display (títulos) + Nunito Sans (cuerpo, min 16px) · Estilo: Soft UI Evolution, light mode, sombras suaves rosadas, radii 12-16px.
- **A11y & Simplicidad:** WCAG AA (0 violaciones serious/critical de axe en los E2E; axe no corre en CI), contraste ≥ 4.5:1, touch targets ≥ 44px, `prefers-reduced-motion`. Regla del dueño: "Tan simple que un niño lo entienda" (un paso, sin opciones superfluas).

## Comunicación

Respuestas directas, sin intro ni conclusiones. Código y comandos exactos. Si hay ambigüedad o falta info, señalar/preguntar antes de inventar. La fuente de verdad son los blueprints + código en disco.

## Guardrails

**SIEMPRE**
- Correr `lint`, `typecheck`, `test` antes de decir "listo". Al declarar verde, **citar el output real**.
- TypeScript strict sin excepciones. Server Actions para mutaciones UI; Route Handlers solo para webhooks MP, auth callbacks y sitemap/robots. Queries a DB solo desde Server Components o Server Actions vía `prisma` por-request. Respetar `prod-write-guard.ts`.

**PREGUNTAR ANTES**
- Decisiones de negocio no contempladas en blueprints (reportar como "REQUIERE INPUT" con pregunta numerada). Eliminar código, tablas o alterar carpetas.

**NUNCA**
- `any` (usar `unknown` + type guards). Commitear o pushear a `main` directamente. Modificar una migración ya aplicada (`prisma migrate dev` para nueva). Inventar nombres de tablas/columnas/rutas. Hardcodear credenciales o URLs de prod. Agregar dark mode, emojis o contadores de urgencia falsos. Refactorizar fuera de scope.

## Git

- **Repo canónico:** `Laza223/glamify-makeup` (de ahí despliega Vercel; PRs con `gh pr create -R Laza223/glamify-makeup --base main`). El `main` local puede estar viejo: ramificar desde `git fetch https://github.com/Laza223/glamify-makeup.git main` → `FETCH_HEAD`.
- **Commits:** con la identidad global de git de Lazar (`Laza223`); no configurar `user.name`/`user.email` locales en este clon.
- **Branching:** una rama por cambio (`feat/…`, `fix/…`, `chore/…`), merge a `main` tras PR y CI verde.

## Compact Instructions

Al resumir: preservar cambios de schema Prisma/APIs, errores y soluciones exactas, archivos modificados, decisiones arquitectónicas y estado del milestone/ops. Resumir brevemente intentos fallidos y debates concluidos.
