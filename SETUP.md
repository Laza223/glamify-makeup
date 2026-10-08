# Glamify Makeup — Setup & Credenciales (paso a paso)

> Guía para dar de alta servicios y juntar credenciales. Hecha para seguir tranquilo, sin vueltas.
> **Regla de oro de seguridad:** las claves **secretas** van solo en `.env.local` (que está en `.gitignore`) y en las **variables de entorno de Vercel**. **Nunca** se pegan en el chat ni se suben a git.
>
> **Actualizado: 2026-10-06** — el hosting es Vercel (migrado desde Cloudflare Workers en septiembre 2026).

---

## 0. Qué vamos a crear (orden)

1. **GitHub** → repo del proyecto.
2. **Supabase** → base de datos + auth + storage (lo más detallado).
3. **Vercel** → hosting (se conecta al repo).
4. Cargar las **variables de entorno**.

> Solo esto hace falta para arrancar **M0–M2**. Mercado Pago, MiCorreo y Resend vienen después (ver §6).

---

## 1. GitHub (repo)

1. Logueado con la cuenta nueva.
2. **New repository** → nombre: `glamify-makeup` → **Private** → **NO** marcar "Add a README" (ya tenemos archivos locales) → **Create**.
3. Copiá la URL del repo (HTTPS).
4. Para pushear desde tu compu, lo más simple es **GitHub CLI**: `gh auth login` (elegí GitHub.com → HTTPS → login con browser). *(Alternativa: Personal Access Token o SSH keys.)*

> El `git init` + primer commit + push lo hago yo en el scaffold de M0; vos solo necesitás el repo creado y estar logueado.

---

## 2. Supabase (el detallado)

### 2.1 Crear el proyecto
1. Entrá a **supabase.com** → **Sign in** (podés entrar con la cuenta de GitHub nueva).
2. **New project**:
   - **Organization:** creá una (ej. "Glamify").
   - **Name:** `glamify-makeup`.
   - **Database Password:** generá una fuerte y **guardala** (la vas a necesitar para la conexión). Si la perdés, se puede resetear.
   - **Region:** **South America (São Paulo)** → menor latencia para Argentina.
   - **Plan:** Free.
3. **Create new project** y esperá ~2 min a que se provisione.

### 2.2 Credenciales de API
En el proyecto → ⚙️ **Project Settings → API**:
- **Project URL** → será `NEXT_PUBLIC_SUPABASE_URL`
- Clave **`anon` / `public`** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` *(pública, va al cliente, OK)*
- Clave **`service_role` / `secret`** → `SUPABASE_SERVICE_ROLE_KEY` *(**SECRETA**, solo server)*

> Si tu panel muestra las claves nuevas: **publishable** ≈ anon, **secret** ≈ service_role.

### 2.3 Conexión a la base (para Prisma)
En ⚙️ **Project Settings → Database → Connection string → pestaña "Prisma" (ORM)**. Supabase te da **dos** strings ya armados (solo reemplazá `[YOUR-PASSWORD]`):
- **Pooled** (Transaction, puerto **6543**) → `DATABASE_URL` *(la app serverless usa esta)*
- **Direct** (puerto **5432**) → `DIRECT_URL` *(Prisma la usa para migraciones)*

> Copialos tal cual de esa pestaña; no los armes a mano.

### 2.4 Storage (imágenes de producto)
- **Decidido: usamos Supabase Storage** (no Cloudinary). Ya está acá, es gratis a tu escala e integrado.
- El bucket (`product-images`) lo creo yo en el scaffold; no tenés que hacer nada ahora.

### 2.5 Auth
- **Email** ya viene activo.
- **Google OAuth** lo configuramos en **M2** (te paso los pasos exactos ahí: crear credenciales en Google Cloud y pegarlas en Supabase).

---

## Crear el usuario administrador

El panel `/admin` se protege con Supabase Auth + una fila `User` con role `owner`.
Para crear (de forma idempotente) la cuenta de la dueña:

1. Definí en tu `.env` (no commitear):
   - `ADMIN_EMAIL` — email de acceso al panel.
   - `ADMIN_PASSWORD` — contraseña inicial (cambiable luego).
   - Ya deben estar: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`.
2. Corré:
   ```bash
   pnpm admin:create
   ```
   Crea el usuario en Supabase Auth (email confirmado) y la fila `User` (role `owner`).
   Es idempotente: si ya existe, reutiliza la cuenta de Auth y refresca la fila.
3. Entrá a `/admin/login` con ese email/contraseña.

---

## 3. Vercel (hosting)

### 3.1 Proyecto
- Proyecto `glamify-makeup-1` en Vercel (plan **Pro**: hace falta para el cron horario; Hobby no permite uso comercial y limita el cron a 1 por día).
- Conectado por la integración Git al repo `Laza223/glamify-makeup`: cada PR genera un preview y cada merge a `main` despliega a producción.
- Build: `pnpm build` (lo detecta solo).

### 3.2 Variables de entorno
Vercel → Settings → Environment Variables → **Production**. Lista completa (ver `docs/LAUNCH.md` para el detalle de cada una):
```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL          # https://www.glamifymakeup.site
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL                 # pooler 6543
DIRECT_URL
MP_ACCESS_TOKEN              # token PROD de Mercado Pago (no TEST)
MP_WEBHOOK_SECRET
RESEND_API_KEY
RESEND_FROM                  # ej. "Glamify Makeup <hola@glamifymakeup.site>"
RESEND_OWNER_EMAIL           # email donde caen alertas (pedidos + arrepentimientos + devoluciones)
MICORREO_EMAIL
MICORREO_PASSWORD
MICORREO_GATEWAY_AUTH
MICORREO_SANDBOX             # "true"/"false" — ausente cae al lado seguro (API PROD)
CRON_SECRET                  # Vercel lo manda como Bearer al llamar /api/cron
# Opcionales: MICORREO_VELOCITY ("classic" por defecto / "express"), MICORREO_ORIGIN_CP (6700), NEXT_PUBLIC_POSTHOG_*
```
Después de cambiar una variable hay que **redeployar** (Deployments → ⋯ → Redeploy) para que tome efecto.

### 3.3 Dominio
- `www.glamifymakeup.site` es el dominio canónico, cargado en Vercel → Settings → Domains con los DNS apuntando a Vercel.

---

## 4. Variables de entorno (`.env.local`)

El `.env.local` ya fue creado con las credenciales reales. El `.env.example` sirve de referencia:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # SECRETA
DATABASE_URL=...                     # pooled 6543 (?pgbouncer=true)
DIRECT_URL=...                       # direct 5432

# (más adelante)
# MP_ACCESS_TOKEN=...                # M2 (sandbox) / M5 (prod) — SECRETA
# MP_WEBHOOK_SECRET=...              # M2 — SECRETA
# RESEND_API_KEY=...                 # M5 — SECRETA
# NEXT_PUBLIC_POSTHOG_KEY=...        # M4b (pública) — sin key, analytics off
# NEXT_PUBLIC_POSTHOG_HOST=...       # M4b (pública) — ej. https://us.i.posthog.com
# NEXT_PUBLIC_WELCOME_COUPON_CODE=BIENVENIDA10  # M4b — cupón que revela el exit-intent
```

---

## 5. Qué compartir conmigo y qué NO

- **Yo NO necesito tus secretos.** Escribo el código que lee de `process.env`; vos llenás el `.env.local` en tu compu.
- **Públicas** (`NEXT_PUBLIC_*`, anon key, Project URL): no hay drama si aparecen, pero igual mejor en env.
- **Secretas** (`service_role`, `DATABASE_URL`, `DIRECT_URL`, password, MP token, Resend): **nunca** en el chat ni en git.
- Si necesito un valor **no secreto** puntual (ej. la Project URL), te lo pido.

---

## 6. Cronograma de credenciales por milestone

| Cuándo | Servicio | Qué necesitás |
|---|---|---|
| **Ahora (M0)** | GitHub · Supabase · Vercel | repo + URL/anon/service_role + DATABASE_URL/DIRECT_URL + proyecto Vercel |
| **M2** ✔ | Mercado Pago (sandbox) | `MP_ACCESS_TOKEN` (TEST) + `MP_WEBHOOK_SECRET` — carrito, checkout, webhook implementados |
| **M5 (launch)** | MiCorreo · Resend · MP (prod) · Dominio | API Correo · API key + dominio verificado · token PROD · DNS → Vercel |

---

## E2E del panel de administración (M3)

El test `tests/e2e/admin.spec.ts` ejecuta el DoD de M3: login → crear producto
con variante+stock → crear cupón → abrir un pedido y cambiarle el estado.

Prerequisitos (una vez por entorno):

1. Crear el admin (idempotente):
   ```bash
   ADMIN_EMAIL=owner@glamify.test ADMIN_PASSWORD=una-clave-fuerte pnpm admin:create
   ```
2. Seedear catálogo + pedido de muestra (`GLM-E2E001`, estado `paid`):
   ```bash
   pnpm db:seed
   ```
3. Correr el e2e con las mismas credenciales en el entorno:
   ```bash
   ADMIN_EMAIL=owner@glamify.test ADMIN_PASSWORD=una-clave-fuerte pnpm test:e2e -- admin.spec.ts
   ```

Si `ADMIN_EMAIL`/`ADMIN_PASSWORD` no están definidas, el test se **saltea**
(no falla), para no romper CI en entornos sin admin configurado.

---

## Cuentas de clientas (M4)

### Google OAuth (login con Google)
1. **Google Cloud Console** → crear credenciales **OAuth 2.0 Client ID** (tipo *Web application*).
   - **Authorized redirect URI:** `https://<tu-proyecto>.supabase.co/auth/v1/callback` (Supabase lo indica en el paso siguiente).
2. **Supabase → Authentication → Providers → Google:** pegar **Client ID** y **Client Secret**, **Enable**.
3. **Supabase → Authentication → URL Configuration:** agregar a *Redirect URLs* `https://glamifymakeup.site/auth/callback` y `http://localhost:3000/auth/callback`.
   - El código ya tiene el botón "Continuar con Google" y la ruta `/auth/callback`. Sin el provider configurado, el botón falla controladamente; el login email+contraseña funciona igual.

### Confirmación de email
- Por defecto Supabase pide **confirmar el email** antes de poder loguear. El registro muestra "revisá tu correo".
- Para desactivarla (opcional): **Supabase → Authentication → Providers → Email → "Confirm email" off**.

### Cron (carrito abandonado + autocancelación + seguimiento de envíos)
- `vercel.json` define un cron horario (`0 * * * *`) que llama a `/api/cron`. Corre `runAbandonedCartJob` (recupero a 24h), `runOrderExpiryJob` (autocancela `pending_payment` > 24h) y `runShipmentTrackingJob` (consulta MiCorreo).
- Requiere `CRON_SECRET`, `DATABASE_URL` y `RESEND_API_KEY` (sin esta última, el email se loguea a consola). Las corridas se ven en `npx vercel logs --environment production -q cron`.

## E2E de cuenta (M4)

El test `tests/e2e/cuenta.spec.ts` ejecuta el DoD de M4: registro → login → favoritos → reseña post-compra.

Prerequisitos (una vez por entorno):

1. Crear la clienta de prueba (idempotente, Supabase Auth confirmada + fila `Customer`):
   ```bash
   CUSTOMER_EMAIL=clienta@glamify.test CUSTOMER_PASSWORD=una-clave-fuerte pnpm customer:create
   ```
2. Seedear (vincula el pedido `GLM-E2E001` a esa clienta para la reseña con compra verificada):
   ```bash
   CUSTOMER_EMAIL=clienta@glamify.test pnpm db:seed
   ```
3. Correr el e2e con las mismas credenciales en el entorno:
   ```bash
   CUSTOMER_EMAIL=clienta@glamify.test CUSTOMER_PASSWORD=una-clave-fuerte pnpm test:e2e -- cuenta.spec.ts
   ```

El test de "login → favoritos → reseña" se **saltea** si `CUSTOMER_EMAIL`/`CUSTOMER_PASSWORD` no están definidas; el de "registro" corre siempre (usa un email único y valida la pantalla de confirmación).

---

## Conversión + crecimiento (M4b)

### PostHog (analytics)
1. Crear un proyecto **free** en [posthog.com](https://posthog.com) (región US o EU).
2. Copiar la **Project API Key** y el **host** (`https://us.i.posthog.com` o `https://eu.i.posthog.com`).
3. Cargar como variables **públicas** (`NEXT_PUBLIC_*`): en `.env.local` para dev y en las variables de Vercel para prod:
   ```bash
   NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
   NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   ```
4. **Sin key → analytics desactivado** (dev local intacto; no rompe nada). El banner de consentimiento es **opt-out**: la captura está ON por defecto y "Rechazar" la desactiva (cookie `glamify_analytics=no`).
5. Eventos que emite el storefront: `product_viewed`, `add_to_cart`, `begin_checkout`, `purchase`, `order_bump_added`, `exit_intent_shown/submitted`, `review_submitted`. Las UTM (link en bio) las autocaptura PostHog.

### Cupón de bienvenida (exit-intent)
- El exit-intent revela el código de `NEXT_PUBLIC_WELCOME_COUPON_CODE` (default `BIENVENIDA10`). El cupón lo crea el seed (`pnpm db:seed`): 10% off, scope todo, 1 uso por clienta.
- Para cambiar el código: editar la var de entorno **y** crear el cupón real en `/admin/cupones` (o ajustar el seed). Si la var queda vacía, el exit-intent solo captura el email (sin revelar código).

### Order-bump y cross-sell (por tags)
- El **order-bump** ofrece el producto activo más barato con el tag **`order-bump`** (en la ficha del producto, campo Tags). El seed tagea la esponja y el set de brochas.
- El **cross-sell** ("Te puede gustar") usa la misma categoría — no requiere configuración.

### Moderación de reseñas
- Las reseñas ahora son **abiertas**: cualquiera puede dejar una. Las de **compra verificada** se auto-publican; el resto entra a **`/admin/resenas`** para que la dueña **apruebe/rechace** antes de publicar.

### Pendiente (diferido — estética IA, blueprint 06 §5)
- **OG image de marca dedicada**: hoy el preview al compartir usa la **foto real del producto** (en la ficha) y el OG por defecto en el resto. Falta generar una OG image de marca (IA, on-brand) y ponerla en `public/` + `openGraph.images` del layout raíz.

### E2E
- `tests/e2e/conversion.spec.ts`: reseña de invitada → queda pendiente (no se publica) · order-bump visible en `/carrito` · banner de consentimiento presente y se cierra al rechazar. Corre en CI (`pnpm test:e2e -- conversion.spec.ts`).
