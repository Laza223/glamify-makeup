---
version: 2
slug: "src-app-storefront-page-tsx"
primary_target: "src/app/(storefront)/page.tsx"
related_targets: ["src/app/(storefront)/layout.tsx","src/components/catalog/product-card.tsx"]
---

## Scope

Home del storefront (`/`) + chrome global (anuncio, header, bottom-nav, footer, drawer del carrito) + tarjeta de producto. Modo: **Persuade**. Esta superficie fija el mundo visual de todo el storefront (rediseño, ADR 0003).

## Audience, job, proof

Chica de 16–24 que llega del link en bio, con el pulgar. Tiene que reconocer la marca (el "¡Hola!"), ver marcas que ya conoce y productos con precio real, y tocar la tienda, una categoría o el +. Prueba: fotos reales del catálogo, marcas detectadas del catálogo, precios y umbral de envío reales (`Setting`), plazo real (hasta 3 días hábiles), WhatsApp humano.

## Constraints

Hero de producción intacto (pedido de la dueña). Un solo rosa, blanco y negro; sin pastel. Logo actual, light mode, sin emojis (Lucide), WCAG AA, targets ≥ 44 px, cuerpo ≥ 16 px. El admin no cambia. Políticas de cambio fuera de la home y del carrito.

## Direction contract

THESIS: Glamify es una tienda de maquillaje estándar hecha con cuidado editorial: estructura de ecommerce que cualquiera entiende (hero, marcas, categorías, productos, regalos, cómo comprar) y una voz propia en la tipografía — Playfair con una palabra en itálica rosa, como su "¡Hola!" — y en el copy girly rioplatense ("Tu nueva obsesión", "Encontrá tu must", "Regalá algo divino", "Comprar es re fácil"). Rechaza el disfraz temático y la plantilla genérica sin voz.

OWN-WORLD: Fondo blanco; negro `#161413` para botones principales, la barra de anuncio y el bloque de regalos; un solo rosa `#E6007A` (relleno con blanco encima 4,53:1; `#C20067` para texto rosa chico; `#FF4FA3` solo sobre negro); porcelana `#FBF6F8` como superficie suave, nunca pastel. Playfair Display (itálica real) en títulos y en la palabra acento; Nunito Sans en UI, cuerpo y precios. Fotos reales en radio 14, categorías en círculo.

STORY: Reconoce a Glamify por su "¡Hola!", ve marcas que conoce pasando, elige categoría o producto, agrega con el +; si es para regalar, va a WhatsApp o a la Gift Card.

FIRST VIEWPORT (390×844): barra negra con envío gratis real, header (logo, buscar, carrito), hero de producción completo con "Explorar Catálogo" y "Armá tu kit"; debajo, la tira de marcas asomando. Desktop: además la fila de categorías del header.

FORM: El estándar de la categoría (canon card de la ronda de dirección, seed 39ca24c7), elegido por la dueña tras rechazar "Cartel de feria"; ejecutado sobre su identidad de producción. Micro-interacciones: + que se abre en stepper, corazón que late al marcar, contador del carrito que rebota, fotos que cambian al hover, tira de marcas que se pausa con hover, abanico de regalos que se abre, línea de pasos que se dibuja y secciones que aparecen al scrollear; todo anulado con `prefers-reduced-motion`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Fotos propias de la clienta (pendientes): las de categoría son assets previos de origen no verificado.
- `swatchHex` vacío: los mini-swatches de la tarjeta se ocultan hasta que haya color cargado.
