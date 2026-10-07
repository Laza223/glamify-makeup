# ADR 0003 — Rediseño del storefront con Impeccable, en una rama larga con tokens que no tocan el admin

**Fecha:** 2026-10-07
**Estado:** aceptada

## Problema

El storefront (todo lo público y los flujos de clienta) se hizo con IA y quedó genérico: 4 rosas distintos fuera de tokens, CTA negro armado a mano, pesos tipográficos por página, 4–5 elementos fijos compitiendo abajo en mobile, imágenes generadas con marcas inventadas. El copy además prometía cosas falsas (corregido antes de empezar: PRs #31–#33). Hace falta un rediseño completo que convierta, sin romper el admin ni la lógica de compra.

## Decisión

1. **Método:** skill Impeccable en modo *redesign* (no *refinement*): `PRODUCT.md` con la verdad del negocio → ronda de dirección visual sobre home + chrome global → rollout superficie por superficie con *surface brief*, *finish reviewer* y verificación UX real. Camino **code-led** (`.impeccable/config.json` → `"buildPath": "code"`, decisión de Lazar).
2. **Fuente visual:** `PRODUCT.md`, `DESIGN.md` y `.impeccable/surfaces/` reemplazan a `design-system/MASTER.md`. Mientras dura el esfuerzo, `MASTER.md`, `#FF2E93`, Playfair + Nunito y "Soft UI Evolution" son **estado anterior**, no regla.
3. **Tokens:** los nuevos son el default de `:root`; el admin conserva los actuales vía `:root:has([data-surface="admin"])`. La clienta nunca depende de `:has`. Todo valor de diseño pasa por variable; no se tocan `.admin-*`, `.icon-medallion` ni los defaults de `components/ui/*` (lo nuevo entra como variantes).
4. **Rama:** `feat/rediseno-storefront` con PR draft a `main` desde el día 1 (CI en cada push + preview de Vercel). Dos releases: R1 = camino de compra + 404, R2 = el resto.
5. **Preview seguro:** con `VERCEL_ENV=preview` el checkout no cobra (guard en `createCheckoutAction`/`retryPaymentAction` + botón deshabilitado + banner). Los previews comparten la DB de prod.
6. **Agentes de Impeccable** (`finish_reviewer`, `documenter`): no se crean archivos de agente; se lanzan como subagente Sonnet de propósito general con las instrucciones de `~/.claude/skills/impeccable/agents/*.toml`. Funciona desde cualquier worktree y no duplica las instrucciones.

## Alternativas descartadas

1. **Pulir el look actual (`polish`/`bolder`)** — Impeccable lo marca como "partir la diferencia": conserva la identidad que justamente se quiere reemplazar.
2. **Tokens nuevos con scope en el storefront (`[data-surface="store"]`)** — los portales de Radix (drawer, selects) se montan en `body` y quedarían fuera del scope; el admin es la superficie chica y estable, conviene que sea la que se "congela".
3. **Sub-PRs por superficie** — sin CI (el workflow corre solo en PRs a `main`) y con conflictos constantes sobre los mismos tokens.
4. **Comp-led (mockup generado antes de construir)** — descartado por Lazar al planificar.

## Limitaciones conocidas

- Lo no rediseñado se ve "intermedio" hasta R2: el gate de R1 cubre las 24 rutas públicas, no solo las rediseñadas.
- El hook automático de Impeccable no se instala (la skill es de usuario, no del proyecto): el detector se corre a mano al cerrar cada superficie (`impeccable detect --json`).
- Los previews siguen escribiendo en la DB de prod fuera del pago (carrito, cupón de bienvenida, reseñas, arrepentimiento).

## Revisitar cuándo

Al cerrar el esfuerzo (Fase 6): `DESIGN.md` pasa a ser la fuente única y `MASTER.md` queda como puntero.
