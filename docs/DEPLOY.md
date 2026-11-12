# Despliegue: Supabase, Netlify y tres ambientes

## 1. Supabase

### 1.1 Aplicar el esquema

El esquema son dos migraciones y van **en este orden**:

1. [`supabase/migrations/20261112000000_sam_v1_nucleo.sql`](../supabase/migrations/20261112000000_sam_v1_nucleo.sql):
   el núcleo (proyecto, desglose, bitácoras, cobranza, cortes, socios).
2. [`supabase/migrations/20261112010000_sam_v2_v4.sql`](../supabase/migrations/20261112010000_sam_v2_v4.sql):
   puertas y criterios, documentos, servicio mensual, portal del cliente, prospectos,
   propuestas, desgloses tipo y horas base.

Crean solo tablas y funciones con prefijo `sam_` y no tocan nada más, así que pueden
convivir con otros sistemas en el mismo proyecto de Supabase. Cada una se puede aplicar dos
veces sin error.

Opción A, en el panel: **SQL Editor → New query**, pegar el primer archivo completo y
ejecutarlo; luego lo mismo con el segundo.

Opción B, con la CLI:

```bash
npx supabase link --project-ref <ref-del-proyecto>
```

```bash
npx supabase db push
```

Antes de aplicarlo en producción, haz un respaldo (Database → Backups) y anota la fecha y la
hora (lista de calidad L3).

### 1.2 Dar acceso a los socios

El acceso no lo da estar autenticado en el proyecto: lo da estar en la tabla `sam_staff`.
Así, los usuarios de otros sistemas del mismo proyecto no ven nada.

1. **Authentication → Users → Add user**: crea el usuario de cada socio con correo y
   contraseña (y desactiva los registros abiertos en Authentication → Providers si este
   proyecto no los necesita).
2. **SQL Editor**, una vez por socio. `is_admin` va en `true` solo para Santiago: un
   administrador aprueba las puertas y las versiones de la tabla de horas base.

```sql
insert into public.sam_staff (user_id, name, is_admin)
select id, 'Santiago', true from auth.users where email = 'correo-del-socio@ejemplo.com';
```

Si alguien entra sin estar dado de alta, la pantalla le muestra su identificador para
agregarlo.

### 1.3 Dar acceso al portal a una persona del cliente

1. Crea su usuario en **Authentication → Users → Add user** (su correo y una contraseña
   que se le entrega por un canal seguro).
2. En el software, **Proyecto → Portal del cliente**: pega su identificador de usuario, su
   correo y elige qué persona del cliente es. Su papel decide qué puede hacer: el
   responsable y quien decide aceptan los hitos; solo quien decide y paga aprueba los
   cambios de alcance.

El cliente no lee ninguna tabla: todo lo que ve pasa por las funciones `sam_portal_*`, que
nunca devuelven costos, horas internas ni márgenes. Para quitarle el acceso, **Quitar
acceso** en la misma pantalla.

### 1.4 Cargar el caso de ejemplo (opcional)

Ya dentro, en **Proyectos → Cargar el caso de ejemplo CE-INV**. Sirve como prueba de
aceptación en el ambiente real: el tablero debe dar las cifras del README. Se borra desde
**Proyecto → Borrar el proyecto**.

### 1.5 Reglas que cuida la base

- RLS en todas las tablas; sin sesión de un socio no se lee ni se escribe nada.
- Bitácoras (trabajo, decisiones, cambios, riesgos), rutinas hechas y versiones de horas
  base: no hay permiso de borrado.
- Nadie revisa su propio trabajo: `reviewer_id <> owner_id`.
- Solo un administrador pone o quita la aprobación de una puerta.
- Un documento enviado o firmado no se borra; solo los borradores.
- Los folios (T-001, DE-01, C-01, R-01) los asigna la base por proyecto, también para las
  solicitudes que llegan por el portal.

## 2. Netlify

El sitio ya está ligado al repositorio. El [`netlify.toml`](../netlify.toml) de la raíz
manda; en **Site configuration → Build & deploy** revisa que quede:

| Campo | Valor |
| --- | --- |
| Base directory | vacío (antes era `tamez-web`) |
| Build command | `npm run ci` |
| Publish directory | `dist` |
| Node | 22 |

Si el sitio anterior dejó instalado el plugin de Next.js desde la interfaz
(**Integrations** o **Plugins**), quítalo: esta aplicación es Vite.

### Variables de entorno

La aplicación lee estas dos, con prefijo `VITE_` o `NEXT_PUBLIC_` (las que ya existen en
Netlify sirven tal cual):

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` o `VITE_SUPABASE_URL` | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` o `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave publicable (o `anon`) |

Ya no se usa ninguna clave secreta: si en Netlify quedó `SUPABASE_SECRET_KEY` del sitio
anterior, conviene borrarla. Las contraseñas viven solo en la bóveda.

Después de cambiar variables: **Deploys → Trigger deploy → Clear cache and deploy site**.

Si las variables apuntan a un proyecto que todavía no tiene el esquema, la aplicación lo
dice al entrar y ofrece la demostración.

## 3. Tres ambientes

| Ambiente | Dónde | Datos |
| --- | --- | --- |
| Desarrollo | `npm run dev` en la computadora | Modo demostración, o un proyecto de Supabase de desarrollo en `.env.local` |
| Pruebas | Deploy previews de Netlify (cada pull request) y branch deploys | Modo demostración (`VITE_DEMO_ONLY=1` en `netlify.toml`): una rama en revisión nunca escribe en producción |
| Producción | La rama de producción del sitio (`main`) | El proyecto de Supabase de las variables del sitio |

Cada publicación corre antes `npm run ci` (lint, pruebas automáticas y build): si una prueba
falla, Netlify no publica. GitHub Actions corre lo mismo en cada push y pull request.

El proyecto base está listo (renglón 9 de «Antes del primer proyecto») cuando un cambio de
prueba llegó a producción con las pruebas aprobadas y un respaldo previo de la base.
