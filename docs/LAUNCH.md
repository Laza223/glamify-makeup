# Glamify Makeup — Checklist de lanzamiento

> Estado real al 2026-10-05. Producción: `https://www.glamifymakeup.site` en **Vercel** (proyecto `glamify-makeup-1`, deploy automático al mergear a `main`). Reemplaza el runbook viejo de Cloudflare Workers.
> Backlog post-lanzamiento: `TODO.md` — **no bloquea** el lanzamiento.

**Regla:** un punto por vez, en orden. No se pasa al siguiente sin la verificación del actual.
**Quién:** **Yo** = Claude · **Vos** = Lazar / la dueña.

## Ya hecho y verificado

- [x] Sitio en producción en `www.glamifymakeup.site`; páginas legales responden 200; CUIT, condición fiscal, email y WhatsApp cargados.
- [x] Compra real de punta a punta (Mercado Pago PROD → webhook → pedido pagado → carga en MiCorreo): 28/8 y 13/9.
- [x] Envíos: despacho **manual** en la plataforma de MiCorreo. En el pedido del admin se carga el seguimiento → pasa a "enviado" → mail a la clienta con el número y el link de Correo Argentino. La carga automática a MiCorreo es best-effort: si falla, no rompe nada.
- [x] Resend: dominio `glamifymakeup.site` verificado (SPF/DKIM/DMARC), remitente `hola@glamifymakeup.site`.
- [x] Auditoría pre-lanzamiento: guard de escritura a prod en scripts, timeout a Mercado Pago, email best-effort en el webhook, checkbox de T&C en checkout.
- [x] Cron horario (`/api/cron`: carrito abandonado + cancelación de pedidos vencidos) registrado y activo en Vercel.
- [x] CI verde en `main`: lint, typecheck, 481 tests, build.

## Bloque 1 — Código pendiente

- [ ] **1.1 (Vos)** Mergear el PR #13: WhatsApp real en `/checkout/gracias` (hoy apunta a un número falso).
  Verificación: `curl -s https://www.glamifymakeup.site/checkout/gracias | grep -o "wa.me/[0-9]*"` → `wa.me/5492323582495`.

## Bloque 2 — Dominio canónico y región

Hoy `NEXT_PUBLIC_APP_URL` apunta a `glamify-makeup-1.vercel.app`: sitemap, robots, canonical, mails y la vuelta desde Mercado Pago usan ese dominio. Las funciones corren en `iad1` (EE.UU.) y la base está en São Paulo.

- [ ] **2.1 (Vos)** Supabase → Authentication → URL Configuration: que `https://www.glamifymakeup.site/auth/callback` esté en Redirect URLs (y Site URL = `https://www.glamifymakeup.site`). Si falta, se rompen el login y la confirmación de mail al cambiar el dominio.
- [ ] **2.2 (Yo, con tu OK)** En Vercel (Production): `NEXT_PUBLIC_APP_URL=https://www.glamifymakeup.site` y región de funciones `gru1`; redeploy.
  Verificación: `robots.txt` y `sitemap.xml` con `www.glamifymakeup.site`; la tienda carga más rápido.
- [x] **2.3 (Vos)** Cuenta de prueba por mail: el mail de confirmación llega con la marca de Glamify. A cuentas nuevas puede caer en spam hasta que el dominio gane reputación (SPF/DKIM/DMARC están bien); el aviso "fijate en spam" está en el mensaje de registro.
- [ ] **2.4 (Después)** Login con Google: conectar el proveedor en Supabase (Authentication → Providers → Google). Pendiente a propósito, es feature nueva.

## Bloque 3 — Catálogo (Vos, desde `/admin`)

- [ ] **3.1** Peso real cargado en cada producto/variante (la cotización de envío depende de eso).
- [ ] **3.2** "Box de Maquillaje Personalizada" y "Ramo de Maquillaje Personalizado" figuran **Agotado** en la home: cargarles stock o despublicarlos.
- [ ] **3.3** Stock y fotos reales de todo lo publicado.
- [ ] **3.4** Home sin productos de prueba (ver 6.6: "Eduardo" se despublica después de la compra de prueba).

## Bloque 4 — Pagos y legal (decisiones tuyas)

- [ ] **4.1 (Vos)** Facturación AFIP: definir cómo se factura cada venta (hoy el sistema no emite comprobantes). Consultarlo con la contadora.
- [ ] **4.2 (Vos)** Rotar `MP_ACCESS_TOKEN`: quedó expuesto en la transcripción de un subagente durante la auditoría del 28/8. Generar uno nuevo en Mercado Pago y avisarme para cargarlo en Vercel + redeploy.
- [ ] **4.3 (Vos)** "3 cuotas sin interés" aparece en la barra de anuncios y en los beneficios de la home, y las cards muestran "3 cuotas de $X": confirmar que está activado en tu cuenta de Mercado Pago. Si no lo está, **Yo** saco ese copy (es publicidad engañosa).
- [ ] **4.4 (Vos)** `/terminos` y `/privacidad`: definir si los revisa una abogada o quedan como están.

## Bloque 5 — Operativo

- [ ] **5.1 (Vos)** Tener saldo o medio de pago cargado en MiCorreo antes de la primera venta (el envío se paga al generar la etiqueta).
- [ ] **5.2 (Vos)** Supabase Auth con SMTP propio (Resend), según `docs/auth-email-setup.md`: sin eso el SMTP compartido corta los mails a las 2–3 por hora.

## Bloque 6 — Compra de prueba final (Vos + Yo)

Con "Eduardo" ($200), con tarjeta real, en `www.glamifymakeup.site`, **después** de los bloques 1 a 5:

- [ ] **6.1** Checkout → Mercado Pago → vuelve a `www.glamifymakeup.site/checkout/gracias` (no a `vercel.app`).
- [ ] **6.2** El pedido aparece como pagado en `/admin/pedidos` y el stock se descontó.
- [ ] **6.3** Llegan el mail de confirmación a la clienta y la alerta a `RESEND_OWNER_EMAIL`.
- [ ] **6.4** Cargar un número de seguimiento cualquiera en el pedido → pasa a "enviado" → llega el mail de despacho.
- [ ] **6.5** Botón de Arrepentimiento: enviar el formulario → constancia `ARR-NNNNNN` → llega el mail a la dueña.
- [ ] **6.6** Reembolso manual del pago en Mercado Pago y **despublicar "Eduardo"**.

## Bloque 7 — Limpieza (Yo, no bloquea)

- [ ] **7.1** `CLAUDE.md` y `SETUP.md` todavía hablan de Cloudflare Workers; pasar a Vercel. El DoD menciona `format:check`, pero el CI no lo corre (371 archivos fallan por CRLF): sacarlo o arreglarlo.
- [ ] **7.2** 6 stashes viejos y ramas ya mergeadas por squash: revisar y borrar **con tu OK**.

## Cuándo está terminado

Bloques 1 a 6 completos = tienda lista para vender. Lo de `TODO.md` (WhatsApp automatizado, Sentry, captcha en reseñas, libreta de direcciones, magic link, import CSV, CRUD de zonas de envío, historial de stock, etc.) es mejora posterior, no condición.
