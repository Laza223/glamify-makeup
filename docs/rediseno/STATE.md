# Estado — Rediseño del storefront

Plan aprobado: `~/.claude/plans/pasted-content-id-8b37-buenas-como-generic-melody.md` · Decisión: `docs/decisions/0003-rediseno-storefront.md` · Rama: `feat/rediseno-storefront` (PR draft a `main`).

| Fase | Qué | Estado |
|---|---|---|
| 0a | Hotfixes en prod: claims engañosos (#31), tono de la barra fija (#32), funnel de analytics (#33) | ✅ mergeados 2026-10-07 |
| 0b | Preparación: rama + PR draft (#34), preview seguro, Impeccable, gobierno, E2E de solo lectura | ✅ 2026-10-07 |
| 1 | `PRODUCT.md` (`impeccable init`) | ✅ 2026-10-07 |
| 2 | Línea de base: critique + detector + Lighthouse ✅ (`linea-de-base.md`) · audit /20 y funnel PostHog pendientes | 🟡 |
| 3 | Home + chrome: "Cartel de feria" rechazado por la dueña → pivot a "editorial glam" (hero de producción intacto, Playfair + un solo rosa) · aprobada · finish review `fix` aplicado · DESIGN.md reescrito | ✅ 2026-10-07 |
| 4 | Release 1: /tienda, ficha, carrito, checkout, gracias, 404 ✅ · falta: ver carrito con productos (requiere escribir en la DB compartida), finish review de la fase, bug del carrito "ordered" (REQUIERE INPUT) · Release 2 (cuenta, legales, arma tu kit) | 🟡 |
| 5 | Pasadas transversales | ⬜ |
| 6 | Cierre | ⬜ |

## Hechos verificados (no re-investigar)

- **Prod:** funciones en `gru1` (`x-vercel-id: gru1::gru1::…` en `/carrito`, `/tienda`), DB Supabase en `sa-east-1`, canonical con `www`. TTFB de producto en caliente ≈ 180 ms. LAUNCH 2.2 cerrado.
- **E2E en Windows:** `npx playwright test` reusa `pnpm dev` en :3000 (`reuseExistingServer`). Chromium headless 1223 instalado. Los E2E escriben en la DB de prod → solo specs de solo lectura.
- **Impeccable:** v4.3.1 (hay v4.5.0). `buildPath: code`. El hook automático no queda cableado (skill de usuario): correr `impeccable.cmd detect --json <targets>` al cerrar cada superficie.
- **Preview:** `VERCEL_ENV=preview` → banner + checkout sin cobro (guard server-side testeado en `tests/unit/payments/preview-guard.test.ts`).

## Delegaciones

| Fecha | Agente | Finalidad | Costo aprox. | Resultado |
|---|---|---|---|---|
| 2026-10-07 | sonnet-implementer | E2E de solo lectura (@db-write, proyectos 390/1440, axe en 13 rutas) | ~143k tok | 11 archivos; 41/41 tras ajustar fixme → exclusión de solo color-contrast |
| 2026-10-07 | general-purpose ×3 (A) | Critique baseline home / producto / checkout | ~195k + 167k + 185k tok | 19/32 · 19/36 · 21/40; 2 bugs reales en checkout |
| 2026-10-07 | general-purpose (B) | Detector CLI + overlay en prod | ~129k tok | CLI 1, overlay 11/5/2; exit code del .cmd no confiable |
| 2026-10-07 | general-purpose (Sonnet) | Finish review fase 3 + verdict pass | ~95k + 105k tok | `fix` → 6 resueltos, marcas parcial (resuelto después: tope 8, búsquedas verificadas), FAB y .text-glam diferidos |
| 2026-10-07 | general-purpose (Sonnet) | Documenter → DESIGN.md + design.json | ~132k tok | escrito; 8 reglas con nombre; deuda legacy no canonizada |
| 2026-10-07 | general-purpose (Sonnet) | Finish review home editorial glam | ~101k tok | `fix` → 5 arreglos aplicados (16 px, categorías, reveal, stepper 44, marca 13 px) |
| 2026-10-07 | general-purpose (Sonnet) | Documenter editorial glam | ~133k tok | DESIGN.md + design.json reescritos (9 reglas) |
| 2026-10-07 | sonnet-debugger | Diagnóstico carrito `ordered` antes del pago | ~49k tok | defecto real preexistente; opción B recomendada |

## Abiertos

- Bug del checkout: el carrito pasa a `ordered` al crear el pedido, antes de pagar (`checkout-service.ts:224`). Si la clienta abandona Mercado Pago, vuelve y ve el carrito vacío; nada lo reabre (ni reintento, ni expiry, ni webhook rechazado) y el job de abandono no le escribe. Diagnóstico completo 2026-10-07. Fix recomendado: carrito `active` hasta el pago aprobado + reusar el pedido pendiente del mismo carrito. PR aparte a `main` (toca plata) — REQUIERE INPUT.
- `/checkout/gracias` con pago rechazado dice "Estamos confirmando tu pago" (vista `retry`): copy engañoso, va con el fix de arriba.
- `.text-glam` ya no se usa en el storefront (error.tsx rehecho); queda en el admin.
- Sin uso tras el rediseño (borrar en fase 6 con OK): `GiftSection`, `ValueProps`, `PriceTag`, `showcase.lowestSellablePrice`.

## Pendientes de la clienta (REQUIERE INPUT)

- ~~Política de cambios~~ → decidido (Lazar, 2026-10-07): ley + fallas a cargo de Glamify, sin cambios por gusto. Falta pasarlo al copy de FAQ y envíos (PR chico a `main`).
- ~~Plazo de despacho~~ → se mantiene "hasta 3 días hábiles"; Lazar lo confirma con la dueña.
- ~~"Originales"~~ → no se dice (decisión de Lazar).
1. ¿Qué marcas salen más? (hoy por catálogo: TEI 11, Pink 21 7, 4 Angels 4)
2. Fotos propias de IG (15–30 originales) y `swatchHex` + nombre real de cada tono.
