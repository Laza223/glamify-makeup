> **DESACTUALIZADO (2026-10-07):** describe el mundo "Cartel de feria", que la clienta rechazó. La dirección vigente es "editorial glam": el hero de producción tal cual, Playfair + Nunito, blanco, negro y un solo rosa (#E6007A). Se reescribe cuando la clienta apruebe la home.

---
name: Glamify Makeup
description: Cartel de feria — el puesto prolijo de una feria de emprendedoras, con carteles de cartulina rosa y etiquetas de precio colgantes sobre producto real.
colors:
  background: "#FFFFFF"
  marker: "#1A1A1A"
  card-ink: "#1A1A1A"
  cartulina: "#FFD3E6"
  tinta-rosa: "#E0177A"
  tinta-rosa-hover: "#C7006A"
  rosa-texto: "#B80068"
  rosa-suave: "#FFF0F6"
  surface-alt: "#FFF7FB"
  muted-text: "#6E5A64"
  border-rosado: "#F2D3E1"
  control-border: "#A97F93"
  success: "#1E7A4C"
  error: "#B81E1E"
typography:
  cartel:
    fontFamily: "Shantell Sans, system-ui, sans-serif"
    fontSize: "clamp(34px, 5vw, 60px)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Shantell Sans, system-ui, sans-serif"
    fontSize: "clamp(28px, 3.5vw, 36px)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "normal"
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  price:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
    fontFeature: "tnum"
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
rounded:
  tag: "6px"
  thumb: "8px"
  menu-item: "10px"
  plate: "14px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  section: "56px"
  section-desktop: "80px"
components:
  button-primary:
    backgroundColor: "{colors.tinta-rosa}"
    textColor: "{colors.background}"
    typography: "{typography.body}"
    rounded: "{rounded.plate}"
    height: "48px"
    padding: "0 32px"
  button-primary-hover:
    backgroundColor: "{colors.tinta-rosa-hover}"
  cartel:
    backgroundColor: "{colors.background}"
    textColor: "{colors.marker}"
    typography: "{typography.cartel}"
    rounded: "{rounded.plate}"
    padding: "12px 16px"
  brand-plate:
    backgroundColor: "{colors.cartulina}"
    textColor: "{colors.marker}"
    typography: "{typography.headline}"
    rounded: "{rounded.plate}"
    height: "48px"
    padding: "0 20px"
  hanging-tag:
    backgroundColor: "{colors.background}"
    textColor: "{colors.marker}"
    typography: "{typography.price}"
    rounded: "{rounded.tag}"
    padding: "4px 10px 4px 24px"
  hanging-tag-muted:
    backgroundColor: "{colors.rosa-suave}"
    textColor: "{colors.muted-text}"
  quick-add:
    backgroundColor: "{colors.tinta-rosa}"
    textColor: "{colors.background}"
    rounded: "{rounded.pill}"
    size: "44px"
  announcement-bar:
    backgroundColor: "{colors.tinta-rosa}"
    textColor: "{colors.background}"
    typography: "{typography.label}"
  search-field:
    backgroundColor: "{colors.background}"
    textColor: "{colors.marker}"
    rounded: "{rounded.pill}"
    height: "44px"
---

# Design System: Glamify Makeup

Alcance: el storefront. El admin conserva su sistema anterior (tokens bajo `:root:has([data-surface="admin"])` en `globals.css`) y no se documenta acá.

## Overview

**Creative North Star: "El cartel de feria"**

Glamify es el puesto prolijo de una feria de emprendedoras: carteles de cartulina escritos a mano con cuidado y etiquetas de precio colgantes sobre producto real. El sistema rechaza la plantilla boutique-lujo (serif, negro, destellos) y también la mesa de liquidación. Todo se apoya sobre blanco; la cartulina rosa es el campo que ocupa regiones enteras (hero, footer, banda de regalo); sobre ella se apoyan placas planas, ligeramente inclinadas, con una sombra suave desplazada hacia abajo. El precio nunca flota: cuelga de una etiqueta con agujero e hilo.

La voz visual es de papelería hecha con cuidado, no de arte de feria improvisado: una sola letra de marcador legible (Shantell Sans) reservada a carteles y títulos, y una sans prolija (Figtree) para todo lo que se lee o se toca. El rosa es tinta y cartulina, nunca brillo. No hay texturas de papel, cinta ni resplandor fingido: la materialidad es de plano + sombra suave + inclinación.

La triple B ("Bueno, Bonito, Barato") es la columna del mensaje y tiene su regla de forma: las tres palabras van al mismo tamaño y "Barato." nunca va sin su prueba, el precio real. Sin vocabulario de oferta.

**Key Characteristics:**
- Blanco como base, cartulina rosa `#FFD3E6` como campo de región, tinta rosa para acción.
- Placas planas de radio 14 px, inclinadas entre -1,5° y +1,5°, con sombra de offset suave.
- Precio siempre en etiqueta colgante, Figtree con cifras tabulares.
- Shantell Sans solo en carteles y títulos; Figtree en todo lo demás.
- Fotos reales de producto como prueba; ninguna ilustración ni imagen generada.
- Solo light mode; íconos Lucide; sin emojis.

## Colors

Una paleta rosa y blanca con marcador negro: un solo tono (rosa) en tres roles —cartulina, tinta de acción, texto rosa— más neutros rosados fríos de baja saturación.

### Primary
- **Tinta Rosa** (#E0177A): relleno de acciones (CTA "Ver la tienda", botón +, barra de anuncio, contador del carrito). Blanco encima da 4,59:1. Hover: **Tinta Rosa Profunda** (#C7006A).
- **Rosa de Texto** (#B80068): el rosa cuando es texto o ícono sobre cartulina o blanco (links de sección, botones − / +, hover de nombres). Calculado desde el token HSL `--accent`; el comentario del CSS dice `#B8005F`, el valor real es el de acá.

### Secondary
- **Cartulina** (#FFD3E6): el campo. Regiones enteras a sangre (hero, footer, banda de regalo), fondo de placas de marca, estado activo de navegación y hover de iconos. Nunca como texto.

### Neutral
- **Blanco** (#FFFFFF): fondo de página, placas, etiquetas de precio, barra inferior.
- **Marcador** (#1A1A1A): texto y títulos. No se usa negro puro.
- **Rosa Suave** (#FFF0F6): fondo de foto sin cargar, etiqueta de precio apagada ("Sin stock", "A pedido").
- **Rosa Papel** (#FFF7FB): sección alterna sutil.
- **Gris Malva** (#6E5A64): texto secundario; 6,35:1 sobre blanco y 4,75:1 sobre cartulina.
- **Borde Rosado** (#F2D3E1): divisores de header, barra inferior, menús.
- **Borde de Control** (#A97F93): borde de campos de formulario (3,42:1, cumple el piso para controles).
- Estados: **Éxito** (#1E7A4C), **Error** (#B81E1E, solo errores de formulario y checkout; nunca en precios ni ofertas).

### Named Rules
**The Cartulina Is a Field Rule.** La cartulina cubre una región entera o no aparece; no se usa como acento suelto ni como texto. Cada pantalla tiene a lo sumo un campo de cartulina grande.
**The No Offer Vocabulary Rule.** Ni rojo, ni estrellas, ni "OFERTA", ni tachados salvo un `compareAtPrice` real. El rosa no señala descuento: señala acción.
**The Pink-For-Text Rule.** Texto rosa sobre blanco o cartulina usa Rosa de Texto (#B80068); Tinta Rosa solo como relleno con blanco encima.

## Typography

**Display Font:** Shantell Sans (con system-ui, sans-serif)
**Body Font:** Figtree (con system-ui, sans-serif)
**Logo:** Playfair Display, solo en el logo existente (marca fija). Nunito/Playfair para el resto pertenecen al admin.

**Character:** Un marcador legible (Shantell) que parece escrito a mano con cuidado, contra una sans geométrica limpia (Figtree) que da orden y legibilidad. La mano habla; la sans informa.

### Hierarchy
- **Cartel** (600, 34px mobile / 52px md / 60px lg, line-height 1): las palabras Bueno. / Bonito. / Barato. del hero; las tres siempre del mismo tamaño.
- **Headline** (600, 28px / 36px md, line-height 1.25, tracking tight): títulos de sección (Destacados, Marcas que ya conocés, ¿Es para regalar?), placas de marca (22px / 26px md), tagline del footer (20px).
- **Title** (600, 15px, line-height snug, 2 líneas máx.): nombre de producto en la tarjeta.
- **Body** (400, 16px mínimo, 1,5): texto corrido; el cuerpo nunca baja de 16 px. Metadatos de tarjeta 14px; línea de apoyo del cartel 15–17px.
- **Price** (700, 15px, tabular-nums): precio dentro de la etiqueta colgante; el tachado de `compareAtPrice` real va a 12px medium en gris malva.
- **Label** (600, 13px): barra de anuncio, rótulos de categoría (13px medium), barra inferior (12px medium).

### Named Rules
**The Marker Is For Carteles Rule.** Shantell Sans solo en carteles y títulos (h1–h4 lo heredan por base). Botones, precios, navegación y cuerpo van en Figtree.
**The Tabular Price Rule.** Todo precio es Figtree con cifras tabulares, nunca en Shantell.
**The Triple-B Equal Size Rule.** "Bueno.", "Bonito." y "Barato." van al mismo tamaño y peso. "Barato." nunca va solo ni más grande, y siempre lleva su prueba: el precio real ("desde $X" calculado de la base).

## Layout

Contenedor centrado, padding lateral de 16 px, tope 1440 px (2xl). Mobile primero: la clienta llega con el pulgar desde un link en bio. Header compacto de 56 px (64 px md) + anuncio fijo de una línea; barra inferior fija de 5 destinos en mobile (≥56 px de alto); segunda fila de categorías en una línea desde md.

Ritmo vertical: secciones separadas por 56 px (80 px md); el hero lleva 24 px de padding vertical (48 px md) y se extiende a sangre con el campo de cartulina. Los carteles del hero se apilan en escalera (sangrías de 8–16 px mobile, 16–40 px md) con 12–16 px entre sí. En desktop los carteles van a la izquierda (columna máx. 600 px) y "la mesa" (cuatro fotos reales con etiqueta de precio, desfasadas 24 px en vertical) a la derecha (máx. 500 px). La fila de categorías es un carrusel horizontal sin barra en mobile (tiles de 84 px) y grilla de 5 / 10 columnas en md / lg. Grilla de producto: 2 columnas mobile, hasta 4 en desktop (tamaños de imagen 50vw / 33vw / 25vw).

Targets táctiles ≥ 44 px (botones circulares de 44 px, CTAs de 48 px, links con `min-h-11`).

## Elevation & Depth

Sistema plano con una sola sombra: un offset suave hacia abajo, teñido del rosa de la marca, que despega las placas del campo como cartulina apoyada. Nunca una sombra dura de bloque, nunca un resplandor. La profundidad restante la da el contraste de capa (placa blanca sobre cartulina rosa) y la inclinación.

### Shadow Vocabulary
- **Placa** (`box-shadow: 0 6px 16px -6px hsl(var(--accent) / 0.3)`): carteles del hero y placas de marca (con -8px de spread y 0.35 en las placas de marca).
- **Etiqueta** (`box-shadow: 0 2px 6px -2px rgb(110 10 60 / 0.35)`): etiqueta de precio colgante.
- **Menú** (`box-shadow: 0 8px 24px -12px rgb(110 10 60 / 0.25)`): submenú de categorías.
- **Botón +** (`box-shadow: 0 3px 8px -3px rgb(224 23 122 / 0.6)`): botón circular de agregar.
- **Control flotante** (`box-shadow: 0 2px 6px -2px rgb(0 0 0 / 0.18)`): corazón de favoritos sobre la foto.

### Named Rules
**The Soft Offset Rule.** Sombra con offset suave y spread negativo; sin bloque duro, sin blur de neón.
**The No Fake Material Rule.** Sin textura de papel, cinta adhesiva, grano ni brillo simulado. La cartulina es color plano.

## Shapes

Un solo radio manda: **14 px** para placas, fotos de producto, tiles de categoría, botones primarios, banda de regalo y menús. Escalones menores para elementos chicos: 10 px (ítems de menú), 8 px (miniaturas de foto en el cartel), 6 px (etiqueta colgante). Redondo total para controles de un toque (botón +, stepper, corazón, carrito, campo de búsqueda, pills de navegación).

Inclinación: las placas se rotan entre -1,5° y +1,5° (el hero usa -1,5°, 1°, -0,75°; las placas de marca alternan -1,5°, 1°, -0,75°, 1,25°). La inclinación es chica y fija; no se anima. La etiqueta de precio reposa a -3° colgada de su agujero.

**The Hanging Tag Geometry.** Clavo de 5 px sobre el borde superior de la foto, hilo de 1×10 px, agujero de 8 px a 8 px del borde izquierdo; el eje de giro es el agujero (`origin 14px 6px`). La geometría es exacta: no se redibuja a ojo.

## Components

### Buttons
- **Shape:** radio 14 px, alto 48 px.
- **Primary:** Tinta Rosa de fondo, blanco encima, Figtree 16/600, padding horizontal 32 px; ancho completo en mobile, automático desde sm. Un solo botón primario por vista.
- **Hover / Focus:** el fondo pasa a Tinta Rosa Profunda; foco visible con anillo `ring` de 2 px (y offset sobre cartulina). Transición solo de color.
- **Icon buttons:** círculos de 44 px; hover con fondo de cartulina y ícono en Rosa de Texto.

### Cartel (signature)
Placa blanca plana, radio 14, `Placa` de sombra, inclinada. Izquierda la palabra en Shantell 600; derecha la prueba en Figtree (marcas reales, fotos reales de 44–56 px, "desde $X" real). Tres por hero, al mismo tamaño.

### Hanging Tag (signature)
Etiqueta blanca (o Rosa Suave si el producto está "Sin stock" o "A pedido") colgada del borde superior de la foto. Precio en Figtree 15/700 tabular. El tachado de `compareAtPrice` solo existe cuando el dato real existe.

### Cards / Containers
- **Tarjeta de producto:** foto 4:5 de radio 14, sin borde ni sombra; la etiqueta cuelga de arriba, el botón + vive abajo a la derecha de la foto y el corazón arriba a la derecha. Debajo: nombre (Title, 2 líneas), "Marca · Categoría" en Gris Malva 14px. Mini-swatches de tono solo si hay `swatchHex` cargado.
- **Quick add:** círculo de 44 px en Tinta Rosa con "+" Lucide; al agregar se expande a stepper de 128 px (borde de 2 px Tinta Rosa, blanco, − y + en Rosa de Texto, número tabular). Foto sin stock baja a 60% de opacidad.
- **Tile de categoría:** foto cuadrada radio 14, rótulo 13/500 debajo; hover escala la foto 1.04.
- **Placa de marca:** fondo cartulina, Shantell 22/26px, radio 14, inclinada; hover pasa a Tinta Rosa con blanco.
- **Banda de regalo:** cartulina radio 14, título + una línea + botón primario.

### Inputs / Fields
- Campo de búsqueda píldora de 44 px, fondo blanco, borde Borde de Control, texto 16px en mobile (15px md). Foco: borde Tinta Rosa y anillo suave. Placeholder en Gris Malva.

### Navigation
- **Header:** blanco, borde inferior Borde Rosado; logo existente a la izquierda; búsqueda, cuenta y carrito a la derecha. **Anuncio:** Tinta Rosa, 13/600, una línea fija con el umbral real de envío gratis.
- **Categorías (md+):** pills de 36 px, Figtree 15; activa en cartulina con peso 600; submenú blanco radio 14 con ítems de 44 px.
- **Barra inferior (mobile):** blanco, 5 destinos Lucide de 20 px + rótulo 12px; activo sobre pastilla de cartulina con ícono en Rosa de Texto; contador del carrito en Tinta Rosa.
- **Footer:** campo de cartulina; tagline en Shantell 20/600; columnas en Figtree; legales y arrepentimiento a la vista.

### Motion
- **Firma 1, balanceo de etiqueta:** al agregar al carrito, la etiqueta de precio gira desde su agujero una sola vez (`tag-swing`, 0.9s, `cubic-bezier(0.22, 1, 0.36, 1)`, amplitud -3° a -14°, a +5°, y de vuelta a -3°). Se re-dispara con cada aumento de cantidad, no al restar ni al cargar.
- **Firma 2, rebote del contador:** el número del carrito rebota con masa (`count-bump`, 0.45s, `cubic-bezier(0.34, 1.56, 0.64, 1)`, escala 1 a 1.35 a 0.92 a 1).
- **Reduced motion:** `prefers-reduced-motion: reduce` reduce toda animación y transición a 0.01 ms; ambas firmas desaparecen. El resto es transición de color y escala de foto, nada más.

## Do's and Don'ts

### Do:
- **Do** poner el precio en una etiqueta colgante, Figtree 15/700 tabular, con el dato real de la base.
- **Do** usar el mismo tamaño para Bueno., Bonito. y Barato., y acompañar "Barato." con el "desde $X" real.
- **Do** usar fotos reales de producto como prueba; mostrar el umbral de envío gratis y el plazo salidos de `Setting`.
- **Do** mantener radio 14 px en placas, fotos y botones; inclinar placas entre -1,5° y +1,5°; usar la sombra de offset suave.
- **Do** usar Rosa de Texto (#B80068) para texto rosa y Tinta Rosa (#E0177A) solo como relleno con blanco encima.
- **Do** mantener targets ≥ 44 px, cuerpo ≥ 16 px, íconos Lucide y respetar `prefers-reduced-motion`.
- **Do** dejar que los dos gestos de movimiento (balanceo de etiqueta, rebote del contador) sean los únicos con personalidad.

### Don't:
- **Don't** usar rojo, estrellas, "OFERTA", insignias de descuento o tachados sin un `compareAtPrice` real.
- **Don't** hacer "Barato." más grande o aislado que "Bueno." y "Bonito.".
- **Don't** usar Shantell Sans en precios, botones, navegación ni cuerpo.
- **Don't** agregar textura de papel, cinta, brillos, destellos ni sombra dura de bloque.
- **Don't** usar dark mode ni emojis como íconos.
- **Don't** generar ni ilustrar productos, packaging o marcas: solo fotos reales o placeholders neutros.
- **Don't** usar la cartulina como texto ni como acento suelto fuera de una región.

## Procedencia de imágenes

- Fotos de producto (tarjetas, cartel "Bonito.", mesa del hero): catálogo de la dueña en Supabase Storage.
- Fotos de categoría (`public/images/category_*.jpg`): asset previo del repo, origen no verificado. Reemplazar por fotos propias de la clienta cuando lleguen.
