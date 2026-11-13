# Despliegue: Supabase, Netlify, integraciones y tres ambientes

## 1. Supabase

### 1.1 Aplicar el esquema

El esquema son tres migraciones y van **en este orden**:

1. [`supabase/migrations/20261112000000_sam_v1_nucleo.sql`](../supabase/migrations/20261112000000_sam_v1_nucleo.sql):
   el núcleo (proyecto, desglose, bitácoras, cobranza, cortes, socios).
2. [`supabase/migrations/20261112010000_sam_v2_v4.sql`](../supabase/migrations/20261112010000_sam_v2_v4.sql):
   puertas y criterios, documentos, servicio mensual, portal del cliente, prospectos,
   propuestas, desgloses tipo y horas base.
3. [`supabase/migrations/20261113000000_sam_v5_crm.sql`](../supabase/migrations/20261113000000_sam_v5_crm.sql):
   el CRM del Excel de consultoría (estados y pasos del prospecto, validación de la
   propuesta, puerta 1), etapas del cliente, datos fiscales y CFDI, firmas electrónicas,
   ligas para compartir, archivos (con el bucket privado `sam-archivos` de Storage),
   avisos, trabajos de IA y el acceso al portal por correo verificado.

Crean solo tablas y funciones con prefijo `sam_` (y el bucket `sam-archivos`) y no tocan
nada más, así que pueden convivir con otros sistemas en el mismo proyecto de Supabase. Cada
una se puede aplicar dos veces sin error. La tercera pasa los prospectos que ya existan a los
estados nuevos.

Opción A, en el panel: **SQL Editor → New query**, pegar el primer archivo completo y
ejecutarlo; luego lo mismo con el segundo y con el tercero.

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
   contraseña.
2. **SQL Editor**, una vez por socio. `is_admin` va en `true` solo para Santiago: un
   administrador aprueba las puertas, valida las propuestas como dirección general y aprueba
   las versiones de la tabla de horas base.

```sql
insert into public.sam_staff (user_id, name, is_admin)
select id, 'Santiago', true from auth.users where email = 'correo-del-socio@ejemplo.com';
```

Si alguien entra sin estar dado de alta, la pantalla le muestra su identificador para
agregarlo. Para firmar documentos a nombre del despacho, el correo del socio debe ser el de
«quien firma» en **Despacho → Datos y firma**.

### 1.3 Portal del cliente: entrada con enlace al correo

El cliente ya no necesita contraseña: escribe su correo en la pantalla de entrada (pestaña
**Cliente**) y recibe un enlace. Entra solo si ese correo tiene acceso a un proyecto.

**En el software.** El acceso se da en la pestaña **Proyecto → Portal del cliente** con su
correo y qué persona del cliente es (su papel decide qué puede hacer: el responsable y quien
decide aceptan los hitos; solo quien decide y paga aprueba los cambios con costo). Al
enviar un documento para firma, el software da el acceso solo a quien firma por el cliente
y le manda el enlace.

**En Supabase**, una sola vez:

1. **Authentication → URL Configuration**: *Site URL* con la dirección del sitio de
   producción y, en *Redirect URLs*, `https://<sitio>/portal`.
2. **Authentication → Emails → SMTP Settings**: configura un SMTP propio. Sin él, Supabase
   solo entrega correos a los miembros del equipo del proyecto y con un límite de pocos
   correos por hora, así que **el cliente no recibiría su enlace**. Sirve cualquiera de los
   dos del punto 3.1:
   - Resend: host `smtp.resend.com`, puerto `465`, usuario `resend`, contraseña = la clave
     de Resend; remitente, un correo del dominio verificado.
   - Google Workspace: host `smtp.gmail.com`, puerto `465`, usuario = la cuenta que envía,
     contraseña = una contraseña de aplicación de esa cuenta (pide la verificación en dos
     pasos); o el relé SMTP de Workspace (`smtp-relay.gmail.com`) dado de alta en la consola
     de administración.
3. **Authentication → Rate Limits**: con SMTP propio sube el límite de correos por hora si
   hace falta.
4. **Authentication → Emails → Templates**: traduce *Magic Link* (quien ya tiene usuario) y
   *Confirm signup* (la primera vez). Basta con un asunto como «Tu acceso al portal de
   Sistemas a la medida» y un cuerpo con el enlace `{{ .ConfirmationURL }}`.

Si en **Authentication → Sign In / Providers** están cerrados los registros nuevos
(*Allow new users to sign up* apagado), la primera vez no se crea el usuario: da de alta
antes su correo en **Authentication → Users → Add user → Create new user** con *Auto Confirm
User*. Con los registros abiertos no hace falta; alguien ajeno que se registre no ve nada,
porque el acceso lo da la tabla `sam_portal_access` y solo con el correo verificado.

El cliente no lee ninguna tabla: todo lo que ve pasa por las funciones `sam_portal_*`, que
nunca devuelven costos, horas internas ni márgenes. Para quitarle el acceso, **Quitar
acceso** en la misma pantalla.

### 1.4 Archivos (Storage)

La tercera migración crea el bucket privado `sam-archivos` con sus permisos: los socios
suben y leen; el cliente solo descarga los archivos marcados como visibles para él de sus
proyectos. Los archivos se abren con ligas firmadas que vencen en diez minutos.

En el plan gratuito de Supabase cada archivo puede pesar hasta **50 MB**; el software lo
revisa antes de subir. Para las grabaciones de las juntas conviene subir solo el audio o
pegar la liga a la grabación (Drive, Meet, Zoom).

### 1.5 Cargar el caso de ejemplo (opcional)

Ya dentro, en **Operaciones → Cargar el caso de ejemplo CE-INV**. Sirve como prueba de
aceptación en el ambiente real: el tablero debe dar las cifras del README. Se borra desde
**Proyecto → Borrar el proyecto**.

### 1.6 Reglas que cuida la base

- RLS en todas las tablas; sin sesión de un socio no se lee ni se escribe nada.
- Bitácoras (trabajo, decisiones, cambios, riesgos), rutinas hechas, firmas y versiones de
  horas base: no hay permiso de borrado.
- Nadie revisa su propio trabajo: `reviewer_id <> owner_id`.
- Solo un administrador aprueba una puerta o valida una propuesta; un prospecto solo pasa a
  confirmado o a cliente con la puerta 1 aprobada.
- Un documento enviado o firmado no se borra, y uno firmado no se modifica.
- Cada firma guarda la huella SHA-256 del documento; el cliente solo firma donde su correo
  verificado es el de quien firma por el cliente.
- Una liga compartida solo abre si no venció ni se revocó.
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
| Functions directory | `netlify/functions` (lo pone el `netlify.toml`) |
| Node | 22 |

Si el sitio anterior dejó instalado el plugin de Next.js desde la interfaz
(**Integrations** o **Plugins**), quítalo: esta aplicación es Vite.

### 2.1 Variables de la aplicación

La aplicación lee estas dos, con prefijo `VITE_` o `NEXT_PUBLIC_` (las que ya existen en
Netlify sirven tal cual). Las funciones del servidor leen las mismas.

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` o `VITE_SUPABASE_URL` | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` o `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave publicable (o `anon`) |

Ya no se usa ninguna clave secreta de Supabase: si en Netlify quedó `SUPABASE_SECRET_KEY`
del sitio anterior, conviene borrarla.

### 2.2 Variables de las integraciones

Son claves secretas: **nunca** llevan prefijo `VITE_` ni `NEXT_PUBLIC_` (esas terminan en el
navegador). En **Site configuration → Environment variables**, al crearlas marca *Contains
secret values* y deja como alcance solo **Functions**. Ninguna es obligatoria: lo que no
esté configurado se hace a mano y la pantalla **Despacho → Integraciones** dice qué está
listo.

| Variable | Para qué |
| --- | --- |
| `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SENDER` | Correo con Google Workspace (3.1) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Correo con Resend (3.1) |
| `EMAIL_PROVIDER` | `google` o `resend`, solo si están configurados los dos |
| `ANTHROPIC_API_KEY` | Resumen de la junta con Claude (3.2) |
| `FACTURAPI_KEY` | Timbrado del CFDI (3.3) |

Las funciones corren en AWS Lambda, que admite en total unos 4 KB de variables por función:
por eso la llave de Google va en `GOOGLE_PRIVATE_KEY` y no el JSON completo de la cuenta de
servicio, y conviene borrar las variables que ya no se usan.

Después de cambiar variables: **Deploys → Trigger deploy → Clear cache and deploy site**.

Si las variables apuntan a un proyecto que todavía no tiene el esquema, la aplicación lo
dice al entrar y ofrece la demostración.

## 3. Integraciones

### 3.1 Correo del sistema: Google Workspace ahora o Resend

**Google Workspace** (requiere la cuenta de empresa de Workspace con su dominio; una cuenta
personal de Gmail no permite la delegación):

1. En Google Cloud Console, en un proyecto: habilita la **Gmail API**, crea una **cuenta de
   servicio** y una **clave JSON** para ella. Anota el *Client ID* (número) de la cuenta de
   servicio. Si la organización de Google Cloud no deja crear claves
   (`iam.disableServiceAccountKeyCreation`), quien administra la organización debe permitirlo
   para ese proyecto.
2. En la consola de administración de Google (admin.google.com): **Seguridad → Acceso y
   control de datos → Controles de API → Delegación de todo el dominio → Añadir**, con ese
   *Client ID* y el permiso `https://www.googleapis.com/auth/gmail.send`.
3. En Netlify: `GOOGLE_CLIENT_EMAIL` = el correo de la cuenta de servicio
   (`…@….iam.gserviceaccount.com`); `GOOGLE_PRIVATE_KEY` = el campo `private_key` del JSON
   (tal cual, con sus `\n`); `GOOGLE_SENDER` = la cuenta de Workspace que envía, por
   ejemplo `ventas@<dominio>`.

**Resend** (sirve mientras tanto, y para el SMTP de Supabase):

1. En resend.com: agrega el dominio y crea en el DNS los registros que pide (SPF y DKIM; no
   cambian el correo de Google del mismo dominio).
2. Crea una clave con permiso de envío.
3. En Netlify: `RESEND_API_KEY` y `EMAIL_FROM` (por ejemplo
   `Sistemas a la medida <ventas@<dominio>>`).

Para pasar de Resend a Google basta con agregar las tres variables de Google y poner
`EMAIL_PROVIDER=google` (o borrar las de Resend). Sin ninguno de los dos, cada correo se
abre listo en el programa de correo de quien lo manda.

### 3.2 Resumen con Claude

En console.anthropic.com crea una clave de API y guárdala como `ANTHROPIC_API_KEY`. La
transcripción de la junta se pega en el paso «Junta de descubrimiento»; el resumen corre en
una función de fondo (hasta 15 minutos) y la pantalla lo muestra al terminar para revisarlo
antes de guardarlo.

Si el sitio está en un plan de Netlify por créditos y no guardas clave propia, Netlify pone
la de su *AI Gateway* y el uso se cobra en créditos de Netlify; la pantalla de integraciones
lo indica. Con clave propia el gateway no interviene.

### 3.3 Timbrado con FacturAPI

1. En facturapi.io crea la organización con los datos fiscales del despacho (RFC, razón
   social sin «S.A. de C.V.», régimen y código postal) y, para timbrar en producción, sube el
   **CSD** del SAT (archivo `.cer`, `.key` y su contraseña; no es la e.firma).
2. Copia la clave secreta de la organización: la de pruebas empieza con `sk_test_` y la de
   producción con `sk_live_`. Guárdala como `FACTURAPI_KEY`; el software sabe en qué modo
   está por la clave.
3. En **Despacho → Facturación** revisa la serie, la clave de producto o servicio, la unidad,
   la forma y el método de pago, el uso del CFDI y el IVA.

Con PPD el CFDI sale con forma de pago 99 y cada cobro pide su complemento de pago. Sin
FacturAPI, la factura hecha en otro sistema se sube con su XML (el software lee el folio
fiscal y los importes) y su PDF.

## 4. Tres ambientes

| Ambiente | Dónde | Datos |
| --- | --- | --- |
| Desarrollo | `npm run dev` en la computadora (`npx netlify dev` para probar las funciones) | Modo demostración, o un proyecto de Supabase de desarrollo en `.env.local` |
| Pruebas | Deploy previews de Netlify (cada pull request) y branch deploys | Modo demostración (`VITE_DEMO_ONLY=1` en `netlify.toml`): una rama en revisión nunca escribe en producción ni manda correos o facturas |
| Producción | La rama de producción del sitio (`main`) | El proyecto de Supabase de las variables del sitio |

Cada publicación corre antes `npm run ci` (lint, pruebas automáticas y build): si una prueba
falla, Netlify no publica. GitHub Actions corre lo mismo en cada push y pull request.

El proyecto base está listo (renglón 9 de «Antes del primer proyecto») cuando un cambio de
prueba llegó a producción con las pruebas aprobadas y un respaldo previo de la base.
