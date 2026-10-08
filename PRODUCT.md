# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Núcleo, 16–24 años, Argentina.** Compra por impulso, estética, tendencia y precio. Quiere verse linda rápido y gastar poco, sin analizar demasiado.
- **Secundario, 25–35.** Repone lo que ya usa; busca algo rendidor y fácil de llevar; responde a combos funcionales.
- **Cómo llegan:** desde Instagram/TikTok (link en bio) y WhatsApp, mayormente desde el celular *(hipótesis: confirmar el split mobile/desktop en PostHog)*. También conocen la marca por la feria.
- **Su trabajo en el sitio:** encontrar algo lindo y barato rápido, ver cómo es de verdad, elegir el tono, y comprar sin tener que escribir por DM.

## Product Purpose

Tienda online de **Glamify Makeup**, un emprendimiento chico de Luján (Buenos Aires) que **revende** maquillaje y accesorios de marcas accesibles que ya circulan en redes (TEI, Pink 21, 4 Angels, MELY, Karité, Ruby Rose y otras), con envío a todo el país. Reemplaza el cierre manual por DM. Hoy el volumen es bajo; el sitio existe para que la marca despegue.

Éxito: que el tráfico de redes compre en la web sin pasar por DM, subir el ticket promedio (combos, umbral de envío gratis) y lograr que las clientas vuelvan.

## Positioning

**"Bueno, Bonito y Barato — la triple B."** Marcas que la clienta ya conoce, elegidas por una persona real que atiende por WhatsApp, a precio de compra impulsiva. Además arma **box y ramos de maquillaje a pedido** y vende **gift card digital**.

**Qué NO es Glamify** (nunca sugerirlo, ni en copy ni en imágenes):
- No fabrica ni formula productos. **Glamify no es la marca de lo que vende.**
- No maquilla, no da clases ni turnos.
- No vende línea profesional ni de lujo.
- No se afirma que los productos sean "originales" o "de distribuidor oficial" (decisión del dueño).

## Operating Context

- La dueña opera sola: carga productos y stock en el panel, prepara y despacha.
- **Despacho:** desde Luján (CP 6700) por Correo Argentino (MiCorreo), a domicilio o sucursal, dentro de **hasta 3 días hábiles** de acreditado el pago; el número de seguimiento llega por email. **No hay retiro en persona.**
- **Pagos:** Mercado Pago Checkout Pro, tarjeta y dinero en cuenta. **Sin efectivo (Rapipago / Pago Fácil). Sin cuotas sin interés** (no están activas).
- **Envío gratis** sobre un umbral configurable por la dueña (`Setting.freeShippingThreshold`, hoy $47.500): siempre mostrar el valor real, nunca uno escrito a mano.
- **Box y ramos:** a pedido, se arman por WhatsApp (no tienen precio fijo en la web).
- **Gift card:** digital, llega por mail con un código; un solo uso, vence a los 6 meses, descuenta productos (no el envío).
- **Armá tu kit:** se eligen 3 productos (labios, ojos, rostro) y se agregan juntos al carrito **a precio de lista, sin descuento**.
- También vende en ferias y por redes; la web convive con esos canales.

## Capabilities and Constraints

- Catálogo de ~30 productos con variantes por tono, cada una con su stock real. Categorías de hasta 2 niveles.
- Compra como invitada + cuenta opcional (historial, favoritos). Reseñas con moderación. Cupones. Mail de carrito abandonado. Cupón de bienvenida con email (popup de salida).
- La búsqueda por texto existe en el backend (`q`) pero no tiene UI todavía.
- **Política de cambios (confirmada):** 10 días corridos de arrepentimiento (Ley 24.240 art. 34, Botón de Arrepentimiento). Si un producto llega roto, fallado o equivocado, Glamify lo cambia o devuelve con el envío a su cargo (se gestiona por WhatsApp con foto). No hay cambios por gusto fuera de eso.
- **Legal Argentina:** Ley 24.240 (Defensa del Consumidor), Res. 424/2020 (Botón de Arrepentimiento), Ley 25.326 (datos personales). Prohibidos la urgencia o el stock falsos y los precios engañosos.
- **Abierto:** cláusula de reacciones alérgicas y si el arrepentimiento aplica a cosméticos abiertos (revisión de abogada pendiente, `docs/LAUNCH.md` 4.4).

## Brand Commitments

- **Nombre:** Glamify Makeup. **Logo actual** (`public/logo-glamify-makeup.svg`), sin cambios.
- **Paleta rosa + blanco** (fija). Donde el rosa se use para texto o controles, tiene que cumplir contraste AA.
- **Solo light mode.** **Sin emojis** (íconos Lucide).
- **Voz:** español rioplatense con voseo; cercana, femenina, directa, vendedora pero no pesada, **nada de humo**. La triple B es la columna del mensaje.
- **Gusto de la clienta (dueña):** moderno, estético, con micro-interacciones lindas, que se sienta del nicho maquillaje.
- **Regla del dueño:** "tan simple que un nene lo entienda" (un paso, sin opciones superfluas).
- **Preferencia firme de la dueña (2026-10-07):** estructura estándar de ecommerce, ejecutada linda y moderna. Rechazó el mundo "cartel de feria": nada de letra de marcador ni rosa pastel. **Un solo rosa** (el fuerte, `#E6007A`), con blanco y negro.
- **El hero es intocable:** "Decile *¡Hola!* a tu nuevo maquillaje favorito." con su diseño de producción (`GlamifyWelcomeBanner`) es el slogan principal de la marca.
- **Políticas de cambio/arrepentimiento solo en sus páginas** (Envíos y pagos, FAQ, Arrepentimiento), nunca como argumento de venta en la home o el carrito: la dueña sufre reclamos falsos. El link legal al Botón de Arrepentimiento del footer sí va siempre.

## Evidence on Hand

- **Catálogo real** en la base (precios, tonos y stock reales). Marcas presentes: TEI (11 productos), Pink 21 (7), 4 Angels (4), MELY, Karité, Ruby Rose y accesorios sin marca.
- **Fotos de producto:** muchas son de exhibidor mayorista (varias unidades juntas) y los tonos se llaman "Tono 1…6" sin color cargado (`swatchHex` vacío). La dueña va a mandar **fotos propias de Instagram** (pendiente) y a cargar color y nombre real de cada tono.
- **Reseñas:** solo las reales y aprobadas que haya en la base; con cero, el vacío se muestra honesto.
- **Ausencias que no se inventan:** testimonios, "comunidad", cantidad de clientas, ventas, "más vendidos" o "el más elegido", "viral", "exclusivo", prensa, absolutos de seguridad ("100% seguro", "protección total"), "originales".
- **Imágenes prohibidas:** nunca generar ni ilustrar productos, packaging, logos ni marcas. Solo fotos reales o placeholders neutros etiquetados. Las imágenes hechas con IA que muestran marcas inventadas (`public/images/exit_modal_visual.jpg`, `category_skincare.png`, `hero_banner.png`) se reemplazan.

## Product Principles

1. **Verdad antes que persuasión.** Cada claim (precio, stock, plazo, envío gratis, política) sale de un dato real o no se dice.
2. **El producto real es la prueba.** Foto, tono, marca y precio venden más que cualquier adjetivo.
3. **Desde el celular y desde redes.** La clienta llega de un link en bio con el pulgar; todo tiene que funcionar ahí primero.
4. **Simple como un DM.** Comprar tiene que ser tan fácil como escribirle a la dueña, y la dueña sigue a un toque (WhatsApp).
5. **Accesible en precio y en uso.** Nada que intimide: ni lujo aspiracional ni jerga profesional.

## Accessibility & Inclusion

WCAG 2.2 AA: 0 violaciones serious/critical de axe, contraste ≥ 4.5:1 en texto, objetivos táctiles ≥ 44 px, cuerpo ≥ 16 px, `prefers-reduced-motion` respetado.
