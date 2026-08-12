# Despliegue — Netlify + Supabase

Guía operativa. Sigue las tres partes en orden: primero Netlify (el sitio ya
funciona sin base de datos), después Supabase (activa el formulario) y al final
el dominio.

---

## Parte 1 · Netlify

### 1.1 Vincular el repositorio

En Netlify: **Add new site → Import an existing project → GitHub →**
`SantiagoPPV/Tamez`.

No hace falta que escribas la configuración de build: el archivo
[`netlify.toml`](../netlify.toml) está en la raíz del repositorio y Netlify lo
lee al vincular. Si la interfaz te pide confirmar los valores, deben quedar así:

| Campo             | Valor             |
| ----------------- | ----------------- |
| Base directory    | `tamez-web`       |
| Build command     | `npm run build`   |
| Publish directory | `tamez-web/.next` |
| Node version      | `22`              |

> En el `netlify.toml` el publish está escrito como `.next` a secas, y es
> correcto: ahí la ruta se resuelve **desde el directorio base**. En la
> interfaz, en cambio, se escribe completa desde la raíz del repositorio
> (`tamez-web/.next`). Las dos formas apuntan al mismo sitio.

Netlify detecta Next.js e instala su runtime (`@netlify/plugin-nextjs`)
automáticamente; el `netlify.toml` además lo declara de forma explícita.

> **Rama.** El trabajo vive en `claude/sales-funnel-typescript-setup-vfniex`.
> Si quieres que ese sea el sitio de producción, cámbialo en
> *Site configuration → Build & deploy → Branches → Production branch*. Si no,
> Netlify lo publicará como *branch deploy* (marcado `noindex` por el
> `netlify.toml`, para que no compita en buscadores con el sitio real).

El primer deploy funcionará **aunque todavía no existan las variables de
entorno**. El sitio se ve completo; sólo el formulario responde con
"El formulario todavía no está conectado. Escríbenos por WhatsApp."

### 1.2 Variables de entorno

*Site configuration → Environment variables → Add a variable.*

| Variable                             | Obligatoria | Valor                                              |
| ------------------------------------ | ----------- | -------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`               | Sí          | URL final del sitio, sin barra al final             |
| `NEXT_PUBLIC_SUPABASE_URL`           | Sí          | URL del proyecto Supabase                           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí        | Clave publicable / anon                             |
| `SUPABASE_SECRET_KEY`                | Sí          | Clave secreta (service_role) — **marcar como secreta** |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`        | Recomendada | Sólo dígitos con lada: `5281XXXXXXXX`               |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`      | Opcional    | `G-XXXXXXXXXX`                                      |
| `LEAD_IP_SALT`                       | Opcional    | Cadena aleatoria (`openssl rand -hex 16`)           |

Detalle de cada una en [`.env.example`](.env.example).

> ### ⚠️ Los nombres tienen que ser exactos
>
> Este proyecto es **Next.js**, no Vite. El prefijo es `NEXT_PUBLIC_`, no
> `VITE_`. Una variable llamada `VITE_SUPABASE_URL` no la lee nadie: el sitio
> compila igual, se despliega igual y el formulario responde
> `not_configured` sin ningún error visible en el log de build.
>
> | ❌ No sirve              | ✅ Correcto                             |
> | ------------------------ | --------------------------------------- |
> | `VITE_SUPABASE_URL`      | `NEXT_PUBLIC_SUPABASE_URL`              |
> | `VITE_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  |
>
> Tampoco basta con la URL y la clave publicable: sin `SUPABASE_SECRET_KEY`
> el servidor no puede escribir en la tabla, porque `leads` tiene RLS activo
> y ninguna política pública. Esa es la clave que hace funcionar el
> formulario.

Dos advertencias que importan:

- Las variables `NEXT_PUBLIC_*` se **incrustan en el JavaScript del navegador**
  durante el build. Nunca pongas ahí una clave secreta.
- Las `NEXT_PUBLIC_*` sólo se aplican al compilar. Después de añadirlas o
  cambiarlas hay que lanzar **Deploys → Trigger deploy → Clear cache and deploy
  site**; un redeploy normal puede reutilizar el build anterior.

Mientras `NEXT_PUBLIC_SITE_URL` no exista, el sitio usa
`https://tamezplasticsurgery.com` como base para canonical, sitemap y Open
Graph. Antes de conectar el dominio conviene ponerle la URL `*.netlify.app`
para que las previsualizaciones enlacen a sí mismas.

---

## Parte 2 · Supabase

### 2.1 Crear la tabla

En el proyecto de Supabase: **SQL Editor → New query**. Pega el contenido
completo de
[`supabase/migrations/20260812000000_init_leads.sql`](supabase/migrations/20260812000000_init_leads.sql)
y ejecútalo.

Crea la tabla `leads` con RLS activado y **sin políticas públicas**: nadie puede
leerla ni escribirla con la clave publicable. La única vía de escritura es la
ruta `/api/leads` del servidor, que usa la clave secreta.

Verificación rápida, en el mismo editor:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename = 'leads';
-- rowsecurity debe ser true

select count(*) from pg_policies
where schemaname = 'public' and tablename = 'leads';
-- debe ser 0
```

Alternativa con la CLI, si prefieres versionar migraciones:

```bash
npx supabase link --project-ref <ref-del-proyecto>
npx supabase db push
```

### 2.2 Obtener las claves

**Project Settings → API keys**:

- *Project URL* → `NEXT_PUBLIC_SUPABASE_URL`
- *Publishable key* (`sb_publishable_…`) o *anon public* → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- *Secret key* (`sb_secret_…`) o *service_role* → `SUPABASE_SECRET_KEY`

La clave secreta **omite RLS**. Vive sólo en las variables de entorno de
Netlify; no debe aparecer en el repositorio, en capturas ni en el navegador.

### 2.3 Comprobar de punta a punta

Tras el redeploy con las variables puestas, envía el formulario desde el sitio
publicado y confirma que la fila aparece en **Table Editor → leads**.

Si algo falla, la respuesta de `/api/leads` trae un código:

| Código           | Significado                                        |
| ---------------- | -------------------------------------------------- |
| `not_configured` | Faltan `NEXT_PUBLIC_SUPABASE_URL` o `SUPABASE_SECRET_KEY` |
| `storage_error`  | Supabase rechazó el insert (revisa Logs)            |
| `rate_limited`   | Más de 5 envíos desde la misma IP en 10 minutos     |
| `validation`     | Datos inválidos; el detalle va por campo            |

---

## Si el build falla

### `Cannot find module '@tailwindcss/postcss'`

El paquete **sí** está en `package.json`; el problema es que no se instaló.
Pasa cuando algo fija `NODE_ENV=production` durante la instalación: npm
entonces omite las `devDependencies` —donde viven Tailwind, TypeScript y los
tipos— e instala 37 paquetes en lugar de ~380.

Ya está prevenido con `NPM_FLAGS = "--include=dev …"` en el `netlify.toml`.
Si reaparece, revisa que no haya una variable `NODE_ENV` con valor
`production` en *Site configuration → Environment variables*, y bórrala.

### Errores con el publish directory

Los dos síntomas tienen la misma raíz: dentro de `netlify.toml`, `publish` se
resuelve **relativo al directorio base**, no a la raíz del repositorio.

| Error                                                        | Causa                                            |
| ------------------------------------------------------------ | ------------------------------------------------ |
| `Your publish directory cannot be the same as the base directory` | `publish` sin declarar → Netlify lo iguala a `base` |
| `Your publish directory was not found at: …/tamez-web/tamez-web/.next` | Se escribió `tamez-web/.next` en el toml         |

El valor correcto en el archivo es `publish = ".next"`. En la interfaz de
Netlify, en cambio, la ruta va completa: `tamez-web/.next`.

### 2.4 Consultar prospectos

El sitio no incluye panel de administración (fuera del alcance de la primera
versión). El equipo revisa los prospectos en **Table Editor → leads**, ordenado
por `created_at`. La columna `status` (`nuevo` · `contactado` · `agendado` ·
`descartado`) e `internal_notes` sirven para el seguimiento manual.

Para recibir aviso de cada solicitud sin construir un backend, la vía más corta
es un *Database Webhook* de Supabase sobre `INSERT` en `leads` apuntando a un
correo o a Slack.

---

## Parte 3 · Dominio

1. En Netlify: **Domain management → Add a domain** → `tamezplasticsurgery.com`.
2. Apunta los DNS según indique Netlify (nameservers de Netlify, o registros A
   y CNAME si el DNS se queda en el registrador actual).
3. Espera a que el certificado HTTPS (Let's Encrypt) se emita solo.
4. Actualiza `NEXT_PUBLIC_SITE_URL` al dominio final y lanza **Clear cache and
   deploy site** — si no, canonical, sitemap y Open Graph seguirán apuntando a
   la URL anterior.
5. Da de alta el sitio en Google Search Console y envía
   `https://tamezplasticsurgery.com/sitemap.xml`.

El dominio, el hosting, el correo y las cuentas de terceros quedan a nombre del
cliente.

---

## Antes de publicar

- [ ] Sustituir los `[PENDIENTE: …]` del contenido. La lista viva está en
      `/pendientes` del propio sitio (no indexada).
- [ ] Cargar el aviso de privacidad definitivo en
      `src/app/aviso-de-privacidad/page.tsx`.
- [ ] Reemplazar el logotipo tipográfico por el vector final
      (`src/components/brand/Wordmark.tsx`).
- [ ] Cargar fotografía real y casos autorizados.
- [ ] Retirar o proteger la ruta `/pendientes`.
- [ ] Confirmar que `NEXT_PUBLIC_SITE_URL` apunta al dominio de producción.
