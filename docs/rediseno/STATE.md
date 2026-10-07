# Estado — Rediseño del storefront

Plan aprobado: `~/.claude/plans/pasted-content-id-8b37-buenas-como-generic-melody.md` · Decisión: `docs/decisions/0003-rediseno-storefront.md` · Rama: `feat/rediseno-storefront` (PR draft a `main`).

| Fase | Qué | Estado |
|---|---|---|
| 0a | Hotfixes en prod: claims engañosos (#31), tono de la barra fija (#32), funnel de analytics (#33) | ✅ mergeados 2026-10-07 |
| 0b | Preparación: rama + PR draft, preview seguro, Impeccable, gobierno, E2E | 🟡 en curso |
| 1 | `PRODUCT.md` (`impeccable init`) | ✅ 2026-10-07 |
| 2 | Línea de base (critique, audit, Lighthouse, funnel) | ⬜ |
| 3 | Mundo visual: home + chrome global | ⬜ |
| 4 | Rollout por superficie → Release 1 (compra + 404) → Release 2 | ⬜ |
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

## Pendientes de la clienta (REQUIERE INPUT)

- ~~Política de cambios~~ → decidido (Lazar, 2026-10-07): ley + fallas a cargo de Glamify, sin cambios por gusto. Falta pasarlo al copy de FAQ y envíos (PR chico a `main`).
- ~~Plazo de despacho~~ → se mantiene "hasta 3 días hábiles"; Lazar lo confirma con la dueña.
- ~~"Originales"~~ → no se dice (decisión de Lazar).
1. ¿Qué marcas salen más? (hoy por catálogo: TEI 11, Pink 21 7, 4 Angels 4)
2. Fotos propias de IG (15–30 originales) y `swatchHex` + nombre real de cada tono.
