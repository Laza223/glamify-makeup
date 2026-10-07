---
version: 1
slug: "src-app-storefront-page-tsx"
primary_target: "src/app/(storefront)/page.tsx"
related_targets: ["src/app/(storefront)/layout.tsx","src/components/catalog/product-card.tsx"]
---

## Scope

Home del storefront (`/`) + chrome global (anuncio, header, bottom-nav, footer, drawer del carrito) + tarjeta de producto. Modo: **Persuade**. Esta superficie fija el mundo visual de todo el storefront (rediseño, ADR 0003).

## Audience, job, proof

Chica de 16–24 que llega del link en bio, con el pulgar. Tiene que entender en un viewport qué es Glamify (marcas que ya conoce, elegidas por una persona real, a precio de feria), ver producto y precio reales, y tocar la tienda o una categoría. Prueba: fotos reales (flatlays de categoría, ramo y box hechos por la dueña), marcas reales, precios reales de la base, umbral real de envío gratis (`Setting`), plazo real (hasta 3 días hábiles), 10 días de arrepentimiento, WhatsApp humano.

## Constraints

Rosa + blanco, logo actual, light mode, sin emojis (Lucide), WCAG AA, targets ≥ 44 px, cuerpo ≥ 16 px. El admin no cambia. Ganchos DOM y eventos de PostHog se conservan (plan, "Lo que el rediseño no puede romper").

## Direction contract

THESIS: Glamify es el puesto prolijo de una feria de emprendedoras: carteles de cartulina escritos a mano con cuidado y etiquetas de precio colgantes sobre producto real. Rechaza la plantilla boutique-lujo (serif + negro + destellos) y también la mesa de liquidación: "Barato" nunca va solo ni más grande que "Bueno" y "Bonito", y siempre lleva su prueba (el precio real). Sin vocabulario de oferta: ni rojo, ni estrellas, ni "OFERTA", ni tachados salvo `compareAtPrice` real.

OWN-WORLD: Fondo blanco; cartulina rosa `#FFD3E6` como campo que ocupa regiones enteras; tinta rosa `#E0177A` (relleno de acción, blanco encima 4,59:1) y `#C8006A` para texto rosa sobre cartulina; marcador `#1A1A1A`. Letra de cartel: Shantell Sans (marcador legible) solo en carteles y títulos; UI y cuerpo en Figtree, precios en Figtree tabular. Carteles = placas planas con radio 14 px, inclinación ±1,5° y sombra con offset suave; precios en etiqueta colgante (agujero + hilo, geometría SVG exacta). Nada de texturas de papel, cinta ni brillo fingidos.

STORY: Entiende "marcas que ya conocés, lindas, a precio de feria"; cree porque ve las marcas, las fotos y el número; toca una categoría o un producto y agrega con el +.

FIRST VIEWPORT (390×844): header compacto (logo, buscar, carrito) ≤ 56 px + anuncio fijo de una línea con el umbral real. Campo de cartulina rosa a sangre con tres carteles apilados en escalera: "Bueno." (TEI · Pink 21 · 4 Angels y más), "Bonito." (fila de 4 fotos reales chicas), "Barato." (desde $X real); botón "Ver la tienda" rosa lleno a ≤ 600 px. Fila de categorías con foto visible antes del pliegue. Desktop: carteles a la izquierda, foto real del ramo/box a la derecha como la mesa.

FORM: Cartel de feria — candidato 1 de mi lista ordenada (elegido por Lazar como IMPECCABLE'S PICK sobre la tirada), seed key 39ca24c7. Interacción firma: al agregar al carrito, la etiqueta de precio se balancea una vez desde su agujero y el contador del carrito suma con un rebote con masa; sin movimiento con `prefers-reduced-motion`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Fotos propias de la clienta (pendientes): el layout tiene que funcionar con las actuales (flatlays + ramo/box) y con las nuevas sin cambios.
- `swatchHex` vacío: los mini-swatches de la tarjeta se ocultan hasta que haya color cargado.
