# Línea de base del rediseño ("antes") — 2026-10-07

Medido contra producción (`www.glamifymakeup.site`, mismo código que `main` @ 4d2113f). Método Impeccable dual-agent: 3 design reviews (A) aisladas + 1 detector (B), todos Sonnet. Capturas en `.impeccable/review/baseline/` (local, no se commitea).

## Puntajes

| Superficie | Nielsen | Lighthouse mobile (perf / a11y / LCP / TBT) | Detector |
|---|---|---|---|
| Home | **19/32** (59%, n/a 7 y 10) | 71 / 96 / 4,2 s / 590 ms | CLI 1 · overlay 11 |
| Producto | **19/36** (53%, n/a 7) | 78 / 95 / 4,1 s / 360 ms | CLI 0 · overlay 5 |
| Carrito → checkout → gracias | **21/40** (53%) | — (necesita carrito) | CLI 0 · overlay 2 |
| Tienda | — | 75 / 95 / 4,7 s / 360 ms | — |

Lighthouse 13.5 local (PSI sin cuota), mobile. Fallas a11y de Lighthouse en las 3: `color-contrast`, `label-content-name-mismatch` (+ `heading-order` en producto y tienda). Top oportunidad en las 3: ~67 KiB de JS sin usar.

## Veredicto de especificidad

Las tres superficies son **intercambiables**: plantilla "boutique editorial" (Playfair, píldora negra `#161413` como acción, eyebrows uppercase, blobs rosas) que contradice "ni lujo aspiracional" de `PRODUCT.md`. La verdad del negocio no aparece: ni triple B, ni marcas como señal, ni umbral real de envío gratis, ni plazo, ni la persona por WhatsApp.

## Priority issues (backlog para los surface briefs)

### Home
- **[P1]** Producto y precio no aparecen hasta pasadas 3 pantallas en mobile (primera foto y≈2.562, primer precio y≈4.583). Las fotos de `GIFT_ITEMS.image` existen y no se renderizan.
- **[P1]** Posicionamiento ausente; claims flojos: "Los Más Elegidos" (cae a `getNewestProducts`), anuncio "superando el monto mínimo" sin cifra, "los mejores", "súper originales", "Regalo Seguro".
- **[P1]** Ergonomía mobile: chips de categoría tapados por la bottom-nav, anuncio rotativo que mueve el layout 12 px cada 4,5 s (sin pausa ni reduced-motion), ~22 % de chrome fijo, targets de 28–36 px, ~70 nodos < 14 px, logo "MAKEUP" a 8 px.
- **[P2]** Identidad genérica: negro compite con rosa como acción; 3 estilos de H2; grilla de tarjetas iguales en cada banda.
- **[P2]** Cards: 5/8 fotos de exhibidor mayorista, "Disponible" repetido, categoría ("OTROS") en lugar de marca, sin swatches.

### Producto
- **[P1]** Tono a ciegas: círculos "1…6" sin color ni nombre, ✓ pisa el número, primer tono preseleccionado y compra de un toque en la barra fija; el swatch real está en la imagen #2 y no se usa.
- **[P1]** Mobile: CTA en y≈967 (fuera del primer viewport), 30 % de chrome fijo, barra fija visible desde el primer paint.
- **[P2]** Reaseguro genérico ("Compra Protegida", "Empaque Seguro") mientras falta el real (umbral, 3 días hábiles, 10 días, WhatsApp).
- **[P2]** Foto de exhibidor como hero, marca enterrada, sin "1 unidad".
- **[P2]** CTA negro, triple B ausente, títulos de sección inconsistentes.
- Bugs de borde: el sticky ignora la cantidad del stepper y no informa errores; `QuantityStepper` no recorta al cambiar a un tono con menos stock; h4 duplicado del nombre (skipped-heading).

### Carrito → checkout → gracias
- **[P1] Bug real:** Enter / "Ir" en el campo de cupón envía el pago (`CouponInput` dentro del `<form>` de `checkout-form.tsx:122,197`); con el form completo crea el pedido sin el descuento.
- **[P1] Bug real:** `/checkout/gracias` no lee el resultado de MP (las 3 `back_urls` van a la misma ruta) y con el pedido aún `pending_payment` ofrece "Pagar ahora" a quien ya pagó → riesgo de doble pago.
- **[P1]** El carrito pasa a `ordered` antes de pagar (`checkout-service.ts:205`): volver atrás desde MP deja el carrito vacío.
- **[P1]** Entrega: cotización encadenada a `onBlur`, sin mensaje de falla, bucle sin salida si no hay sucursales; precios de domicilio/sucursal no visibles antes de elegir.
- **[P1]** Formulario: placeholders como label, un error por vez lejos del campo, sin `aria-invalid` ni foco; borde de input 1,18:1; selects a 14 px (zoom iOS).
- **[P2]** Zona de pago sin total en el botón, sin reaseguro real, WhatsApp oculto en checkout, popup de salida puede saltar en `/checkout`, "256-bit SSL".

## Detector (B)

- CLI: 1 hallazgo (`ai-color-palette`, `gift-section.tsx:43`, tinte purple casi imperceptible).
- Overlay (inyección inline; por URL lo bloquea Local Network Access de Chrome): `undersized-ui-text` (logo 8 px), `low-contrast` 4,1–4,3:1 en `text-primary` chico, `gpt-thin-border-wide-shadow` (hero), `kicker-above-heading`, `image-hover-transform` (estilístico), `skipped-heading` (h4 del sticky). Falsos positivos: `flat-type-hierarchy` (h1 con spans), `buried-raster` (crossfade de hover), `line-length` del vacío de reseñas.
- Ojo: `impeccable.cmd` devuelve exit 0 aunque haya hallazgos; el exe directo devuelve 2.

## REQUIERE INPUT surgido de la línea de base

1. ¿Validar stock antes de pagar? Hoy se descuenta al acreditarse el pago (`webhook-service.ts`); un faltante se descubre ya cobrado.
