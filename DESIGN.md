---
name: Glamify Makeup
description: Tienda de maquillaje estándar hecha con cuidado editorial. Blanco, negro y un solo rosa; Playfair con una palabra en itálica rosa.
colors:
  primary: "#E6007A"
  primary-hover: "#C20067"
  pink-on-black: "#FF4FA3"
  ink: "#161413"
  white: "#FFFFFF"
  porcelain: "#FBF6F8"
  photo-ground: "#F7F4F5"
  hairline: "#ECE6E9"
  control-border: "#8C8689"
  muted-text: "#666666"
  destructive: "hsl(0 72% 42%)"
  success: "hsl(150 61% 30%)"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "clamp(2.125rem, 4vw, 3.25rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  display-accent:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "inherit"
    fontWeight: 500
    lineHeight: "inherit"
  headline:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "clamp(1.875rem, 3vw, 2.625rem)"
    fontWeight: 400
    lineHeight: 1.25
  title:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  ui:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.375
  label:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    letterSpacing: "0.1em"
rounded:
  photo: "14px"
  control: "16px"
  block: "24px"
  pill: "9999px"
spacing:
  gutter: "16px"
  gap-grid: "16px"
  gap-section: "48px"
  touch: "44px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    typography: "{typography.ui}"
    height: "48px"
    padding: "0 28px"
  button-on-black:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    typography: "{typography.ui}"
    height: "48px"
    padding: "0 28px"
  quick-add:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    size: "44px"
  chip-off:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    typography: "{typography.ui}"
    height: "44px"
    padding: "0 20px"
  chip-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    typography: "{typography.ui}"
    height: "44px"
    padding: "0 20px"
  search-field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "44px"
  announcement-bar:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
  gift-block:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.block}"
  footer:
    backgroundColor: "{colors.porcelain}"
    textColor: "{colors.ink}"
---

# Design System: Glamify Makeup

## Overview

**Creative North Star: "Editorial glam"**

Glamify es una tienda de maquillaje con la estructura que cualquiera entiende (anuncio, header, hero, marcas, categorías, productos, regalos, cómo comprar, footer) y una voz propia en dos lugares: la tipografía y el copy. La voz tipográfica es Playfair Display con exactamente una palabra en itálica rosa, la misma que usa el "¡Hola!" del hero. La voz del copy es girly rioplatense, con voseo y sin humo: "Tu nueva obsesión", "Encontrá tu must", "Regalá algo divino", "Comprar es re fácil".

El sistema es blanco, negro y un solo rosa. Las fotos reales de producto hacen el trabajo visual; el resto se queda quieto y limpio para que las fotos y los precios se lean. El mundo anterior ("Cartel de feria": letra de marcador, cartulina pastel, etiquetas colgadas) fue rechazado por la dueña y no sobrevive en ningún lado.

El storefront es solo light mode. El admin conserva sus tokens heredados bajo `:root:has([data-surface="admin"])` y queda fuera de este documento.

**Key Characteristics:**
- Un solo rosa (#E6007A), blanco y negro; sin pastel.
- Playfair con una palabra acento en itálica real, Nunito Sans para todo lo demás.
- Fotos reales en radio 14; categorías en círculo.
- Negro para peso: CTAs principales, barra de anuncio, bloque de regalos.
- Movimiento corto, siempre ligado a una acción o a un scroll, y anulado con `prefers-reduced-motion`.
- Íconos Lucide, sin emojis.

## Colors

Paleta mínima: un rosa fuerte, un negro cálido y blancos; el rosa aparece en lo que se toca o se destaca, no como fondo de página.

### Primary
- **Rosa Glamify** (#E6007A): relleno de acciones y marcas de estado (botón +, contador del carrito, círculos de pasos, corazón activo, punto separador de marcas, palabra acento en títulos). Con texto blanco encima da 4,53:1.
- **Rosa profundo** (#C20067): hover del rosa y rosa para texto chico (marca en la tarjeta, texto accent), 5,9:1 sobre blanco.
- **Rosa sobre negro** (#FF4FA3): solo sobre fondo negro (ícono de la barra de anuncio, palabra acento del bloque de regalos). Sobre blanco no cumple contraste.

### Neutral
- **Negro cálido** (#161413): texto, botones principales, chips activos, barra de anuncio, bloque de regalos.
- **Blanco** (#FFFFFF): fondo de página, tarjetas, header, campos.
- **Porcelana** (#FBF6F8): superficie suave (footer, ítem activo de la navegación); casi blanco, nunca pastel.
- **Fondo de foto** (#F7F4F5): fondo detrás de las fotos mientras cargan y de las categorías.
- **Hilo** (#ECE6E9): bordes finos y divisores.
- **Borde de control** (#8C8689): borde de campos, al menos 3:1 contra blanco.
- **Texto atenuado** (#666666): texto secundario, 5,7:1 sobre blanco.

Los tokens viven como variables HSL en `:root` de `src/app/globals.css` y se consumen por Tailwind (`primary`, `accent`, `secondary`, `muted`, `border`, `input`, `ring`). Los valores del frontmatter son los hex equivalentes.

### Named Rules
**The One Pink Rule.** Hay un solo rosa de relleno (#E6007A). El rosa de texto chico es su versión profunda (#C20067) y el claro (#FF4FA3) existe solo sobre negro. Ningún rosa pastel, ningún degradé rosa para fondos de sección.

**The Black For Weight Rule.** Lo que tiene que pesar (CTA principal, barra de anuncio, chip activo, bloque de regalos) va en #161413. El rosa acompaña, no carga el peso.

**The Porcelain Not Pastel Rule.** La superficie suave es porcelana (#FBF6F8). Si una superficie se ve rosada a simple vista, está mal.

## Typography

**Display Font:** Playfair Display (con Georgia, serif), normal e itálica reales cargadas en `src/app/layout.tsx`.
**Body Font:** Nunito Sans (con system-ui, sans-serif), pesos 300 a 800.

**Character:** Playfair le da el gesto editorial a los títulos y al logo; Nunito Sans es la voz práctica de UI, cuerpo y precios. La tensión entre ambas es todo el estilo: no hay tercera fuente.

### Hierarchy
- **Display** (Playfair 400, 34px mobile a 52px desktop, 1.1): título del bloque de regalos. Palabra acento en 500.
- **Headline** (Playfair 400, 30px mobile a 42px desktop, 1.25): títulos de sección (`SectionTitle`: "Encontrá tu *must*", "Tu nueva *obsesión*", "Comprar es re *fácil*").
- **Title** (Nunito Sans 700, 17px): títulos de paso y precio de la tarjeta (tabular).
- **Body** (Nunito Sans 400, 16px, 1.6): párrafos; ancho de línea cercano a 30ch en descripciones de paso y 28rem en el bloque de regalos.
- **UI** (Nunito Sans 600, 15px): botones, chips, nombre de producto, navegación, selects.
- **Label** (Nunito Sans 700, 13px, tracking 0.1em, mayúsculas): solo la marca detectada en la tarjeta de producto, que es dato del producto y no una etiqueta decorativa.

La tira de marcas usa Playfair itálica, 26px mobile y 34px desktop.

### Named Rules
**The Italic Accent Word Rule.** Un título Playfair lleva exactamente una palabra (o una frase corta) en itálica real, peso 500, en rosa (#E6007A sobre blanco, #FF4FA3 sobre negro). Ni dos acentos en un título ni itálica fingida; el footer repite el gesto ("Bueno, *bonito* y barato.").

**The Body Floor Rule.** El cuerpo de lectura es 16px o más. Honestidad: hay texto de UI en 15px (botones, chips, nombre de producto), 14px en el precio tachado y en "Lo armamos por WhatsApp", 13px en la barra de anuncio, el badge "Sin stock" y la marca de la tarjeta, y 12px en el "+N" de tonos. Todo eso es UI de apoyo, no cuerpo; no bajar de ahí.

## Layout

Estructura estándar de ecommerce, mobile primero (el tráfico viene del link en bio, con el pulgar). Contenedor centrado con 16px de gutter y tope de 1440px en pantallas 2xl. Secciones apiladas con ritmo vertical amplio (alrededor de 48px entre bloques en home) y una sola columna de lectura.

Grillas de producto: 2 columnas en mobile, 3 en tablet, 4 en desktop (según los `sizes` de imagen de la tarjeta); fotos en proporción 4:5. Categorías en fila horizontal con snap en mobile, repartidas en desktop. Navegación: barra de anuncio, header de 56px (64px en md), fila de categorías solo en md+, bottom-nav de 5 ítems solo en mobile con safe-area.

Las secciones de estantería aparecen con `.reveal` al scrollear; si el navegador no soporta scroll-driven animations o hay reduced-motion, se ven en su lugar sin animar.

### Named Rules
**The Targets Rule.** Nada interactivo mide menos de 44px de alto o de ancho, aunque el ícono sea de 16px.

**The Policies Stay Home Rule.** Las políticas de cambio, arrepentimiento y devoluciones viven solo en sus páginas (Envíos y pagos, FAQ, Arrepentimiento). No son argumento de venta en la home ni en el carrito; solo el link legal del footer va siempre.

## Elevation & Depth

Plano por defecto: la jerarquía sale del color (negro, blanco, porcelana) y de los hilos finos (#ECE6E9), no de sombras. Las sombras son raras y funcionales: el botón + y el corazón flotan sobre la foto con una sombra corta para separarse de ella, y las cartas del abanico de regalos proyectan una sombra profunda sobre negro.

### Shadow Vocabulary
- **Sobre foto** (`box-shadow: 0 2px 6px -2px rgb(0 0 0 / 0.18)`): corazón de favoritos; el badge "Sin stock" o "A pedido" usa `shadow-sm`.
- **Botón +** (`box-shadow: 0 3px 8px -3px rgb(224 23 122 / 0.6)`): sombra rosa corta bajo el + cerrado.
- **Menú desplegable** (`box-shadow: 0 8px 24px -12px rgb(110 10 60 / 0.25)`): submenú de categorías del header.
- **Carta de regalo** (`box-shadow: 0 18px 40px -12px rgb(0 0 0 / 0.6)`): fotos del abanico sobre el bloque negro.

### Named Rules
**The Flat At Rest Rule.** Las superficies no llevan sombra en reposo; las sombras de arriba son excepciones nombradas y no se agregan otras por costumbre.

## Shapes

Esquinas generosas pero no infladas. Fotos de producto en radio 14px; botones grandes y campos de filtro en 16px (`rounded-2xl`); el bloque de regalos en 24px; todo lo que se toca y es chico (chips, +, corazón, búsqueda, paginación) en píldora o círculo. Las categorías son círculos con foto, con un anillo rosa en hover. Los tonos de variante son puntos de 14px con borde fino.

Las fotos son siempre reales; se recortan a la forma, nunca se ilustran ni se enmarcan con decoración.

### Named Rules
**The Real Photos Only Rule.** Solo fotos reales del catálogo o de la dueña. Nunca generar ni ilustrar productos, packaging, logos ni marcas; si no hay foto, la tarjeta muestra la inicial en Playfair itálica rosa tenue.

## Components

### Buttons
- **Shape:** rectángulo de esquinas suaves (16px), 48px de alto, texto 15px 600.
- **Primary:** negro #161413, texto blanco, padding horizontal 28px. Hover: negro al 85%.
- **Sobre negro:** rosa #E6007A con texto blanco ("Armar mi regalo"); secundario con borde blanco al 25% y texto blanco ("O regalá una Gift Card").
- **Secundario claro:** borde #ECE6E9, texto negro, hover con borde negro (filtros).
- **Focus:** anillo de 2px en el color `ring` (rosa), con offset sobre fondos oscuros.

### Quick add (botón +)
Círculo rosa de 44px sobre la esquina inferior derecha de la foto. Al tocar se abre en un stepper de 140px (borde rosa 2px, fondo blanco, menos, cantidad, más) con transición de 300ms; el número hace un zoom corto al cambiar. Con varias variantes y sin elegir, abre el selector en lugar de sumar.

### Chips
- **Fuera:** blanco, borde fino, texto negro; hover con borde rosa y texto rosa profundo.
- **Activo:** negro con texto blanco. Mismo patrón en filtros, paginación (página actual) y categorías del listado.
- **Filtro aplicado:** porcelana con una X; hover rosa.

### Product card
Foto 4:5 radio 14 sobre fondo #F7F4F5; la segunda foto aparece al hover (con zoom 1.04). Corazón arriba a la derecha, + abajo a la derecha, badge blanco arriba a la izquierda para "Sin stock" o "A pedido". Debajo: marca en rosa profundo, nombre en 15px 600 (dos líneas), tonos como puntos, precio 17px 700 con el tachado en gris. Toda la tarjeta es un solo link por el nombre; los mini-tonos se ocultan hasta que haya color cargado.

### Navigation
- **Anuncio:** barra negra, 13px 600, ícono de camión en #FF4FA3, envío gratis con umbral real (`Setting`).
- **Header:** blanco, hilo inferior, logo a la izquierda, búsqueda en píldora, cuenta y carrito como botones de 44px; contador rosa que rebota al sumar.
- **Fila de categorías (md+):** píldoras de 15px 600, activa en porcelana, hover rosa.
- **Bottom-nav (mobile):** 5 ítems, ícono dentro de píldora porcelana cuando está activo, texto rosa profundo.
- **Footer:** porcelana, "Bueno, *bonito* y barato." en Playfair 22px con la palabra acento.
- **WhatsApp:** botón flotante a la izquierda en mobile (no tapa el + de las tarjetas), a la derecha con texto en desktop; oculto en producto y checkout.

### Tira de marcas
Marcas detectadas del catálogo en Playfair itálica, separadas por un punto rosa, entre hilos finos. Corre en loop continuo, se pausa con hover o foco y queda quieta con reduced-motion.

### Bloque de regalos
Bloque negro de radio 24 con un brillo rosa difuso detrás de un abanico de tres fotos reales que se abre al hover. Título Display con palabra acento en #FF4FA3.

### Cómo comprar
Lista de 4 pasos con círculos rosa numerados unidos por una línea que se dibuja al scrollear (vertical en mobile, horizontal en desktop); el ícono Lucide de cada paso se inclina al hover.

### Motion
Conjunto cerrado, todo anulado con `prefers-reduced-motion`:
- Corazón: late solo cuando ella lo marca (`heart-pop`, 0.4s, resorte).
- Botón +: se abre en stepper (300ms).
- Contador del carrito: rebota (`count-bump`, 0.45s).
- Tarjeta: la segunda foto reemplaza a la primera al hover.
- Tira de marcas: loop de 40s, pausa con hover o foco.
- Abanico de regalos: se abre al hover (500ms).
- Línea de pasos: se dibuja con el scroll.
- Aparición: `.reveal` en las secciones de estantería y `.reveal-scale` en el bloque de regalos; nada más aparece animado.

Easing: salida suave `cubic-bezier(0.16, 1, 0.3, 1)` para entradas; resorte `cubic-bezier(0.34, 1.56, 0.64, 1)` para latidos y rebotes.

### Hero (fijado)
`GlamifyWelcomeBanner` ("Decile *¡Hola!* a tu nuevo maquillaje favorito.") es de la dueña y se mantiene intacto. Sus clases y detalles internos son del hero y no son reglas del sistema para superficies nuevas.

## Do's and Don'ts

### Do:
- **Do** usar #E6007A para rellenos, #C20067 para texto rosa chico y #FF4FA3 solo sobre negro.
- **Do** poner exactamente una palabra acento en itálica rosa en cada título Playfair.
- **Do** usar fotos reales con radio 14 y categorías en círculo.
- **Do** mantener los targets en 44px o más y el cuerpo en 16px o más.
- **Do** escribir copy girly rioplatense con voseo, con datos reales (umbral de envío, plazo de hasta 3 días hábiles).
- **Do** usar íconos Lucide y respetar `prefers-reduced-motion` en todo movimiento nuevo.

### Don't:
- **Don't** usar rosas pastel, cartulina, etiquetas colgadas, letra de marcador ni nada del mundo "Cartel de feria".
- **Don't** agregar dark mode ni emojis como íconos.
- **Don't** inventar urgencia, stock, "más vendidos", "viral", "exclusivo" ni testimonios.
- **Don't** mencionar cambios, devoluciones o arrepentimiento fuera de sus páginas legales.
- **Don't** ilustrar ni generar productos, packaging, logos o marcas.
- **Don't** sumar una tercera tipografía ni una segunda palabra acento por título.
- **Don't** reutilizar como regla de superficies nuevas lo que quedó heredado (ver abajo).

### Procedencia de rasters
- **Fotos de producto:** catálogo propio de la dueña, servidas desde Supabase Storage.
- **Imágenes de categoría** (`public/images/category_*.jpg`): assets preexistentes del repo, de origen no verificado. Se reemplazan por fotos propias de la dueña. Las `.png` de categoría y las imágenes marcadas como hechas con IA en PRODUCT.md (por ejemplo `category_skincare.png`) también se reemplazan.

### Deuda no canonizada
Ninguno de estos es regla del sistema: `.text-glam` (texto con degradé; legado, admin y `error.tsx` del storefront); botón de WhatsApp en verde #0E7A50 hardcodeado fuera de tokens; `shadow-soft*`, `icon-medallion` y `card-luxury` usados por superficies todavía no rediseñadas; y el estilo interno del hero fijado (rótulo superior, manchas difuminadas), que es de la dueña y no se replica en superficies nuevas.
