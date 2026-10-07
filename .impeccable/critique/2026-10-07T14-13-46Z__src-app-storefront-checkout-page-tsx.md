---
target: checkout (baseline)
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 5
target_identity: "file:C:\\Users\\Lazar\\Documents\\github\\glamify-makeup\\.claude\\worktrees\\hola-buenas-3adff8\\src\\app\\(storefront)\\checkout\\page.tsx"
target_fingerprint: "sha256:566ad9aaa1104c0775b24101c4cefc578b06dcab27a419a86d446e929cc95fd9"
target_path: "C:\\Users\\Lazar\\Documents\\github\\glamify-makeup\\.claude\\worktrees\\hola-buenas-3adff8\\src\\app\\(storefront)\\checkout\\page.tsx"
timestamp: 2026-10-07T14-13-46Z
slug: src-app-storefront-checkout-page-tsx
---
- **[P1] Bug real:** Enter / "Ir" en el campo de cupón envía el pago (`CouponInput` dentro del `<form>` de `checkout-form.tsx:122,197`); con el form completo crea el pedido sin el descuento.
- **[P1] Bug real:** `/checkout/gracias` no lee el resultado de MP (las 3 `back_urls` van a la misma ruta) y con el pedido aún `pending_payment` ofrece "Pagar ahora" a quien ya pagó → riesgo de doble pago.
- **[P1]** El carrito pasa a `ordered` antes de pagar (`checkout-service.ts:205`): volver atrás desde MP deja el carrito vacío.
- **[P1]** Entrega: cotización encadenada a `onBlur`, sin mensaje de falla, bucle sin salida si no hay sucursales; precios de domicilio/sucursal no visibles antes de elegir.
- **[P1]** Formulario: placeholders como label, un error por vez lejos del campo, sin `aria-invalid` ni foco; borde de input 1,18:1; selects a 14 px (zoom iOS).
- **[P2]** Zona de pago sin total en el botón, sin reaseguro real, WhatsApp oculto en checkout, popup de salida puede saltar en `/checkout`, "256-bit SSL".
