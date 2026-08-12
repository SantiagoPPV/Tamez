# Supabase

Esquema de la base de datos. Una sola tabla: `leads` (solicitudes de
valoración).

## Aplicar la migración

**Opción A — panel (la más rápida).** SQL Editor → New query → pegar el
contenido de `migrations/20260812000000_init_leads.sql` → Run.

**Opción B — CLI**, si quieres versionar los cambios:

```bash
npx supabase link --project-ref <ref-del-proyecto>
npx supabase db push
```

## Modelo de seguridad

`leads` tiene RLS activado (`enable` + `force`) y **cero políticas**, de forma
deliberada:

- Con la clave publicable / `anon`, la tabla es inaccesible: no se puede leer ni
  escribir desde el navegador.
- La clave secreta (`service_role`) omite RLS y es la única vía de escritura,
  siempre a través de la ruta de servidor `/api/leads`.
- Además se revocan los permisos heredados de `anon` y `authenticated`.

Si más adelante se construye un panel interno autenticado, hay que añadir una
política de `select` explícita (hay un ejemplo comentado al final de la
migración).

## Qué se guarda y qué no

Se guarda: nombre, medio de contacto, dato de contacto, procedimiento de
interés, mensaje opcional, consentimiento, página de origen, hash de IP y
user-agent.

No se guarda: información clínica, diagnósticos, fotografías ni la IP en claro.

`consent` tiene una restricción `check (consent = true)`: la base de datos
rechaza cualquier prospecto sin consentimiento, incluso si un cambio futuro en
la aplicación lo intentara.

## Regenerar los tipos de TypeScript

```bash
npx supabase gen types typescript --project-id <ref> > ../src/lib/supabase/types.ts
```

Los tipos deben declararse con `type` y no con `interface`: postgrest-js exige
que cada tabla encaje en `Record<string, unknown>`, y las interfaces no reciben
index signature implícita en TypeScript.
