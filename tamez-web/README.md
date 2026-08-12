# TAMEZ Plastic Surgery — sitio web

Sitio institucional y *sales funnel* consultivo, construido según el brief
`TAMEZ_Website_Sales_Funnel_Brief_Codex.docx`.

**Stack:** Next.js 16 (App Router) · TypeScript estricto · Tailwind CSS 4 ·
Supabase (prospectos) · Netlify (despliegue).

Para publicar, ver [`DEPLOY.md`](DEPLOY.md).

---

## Arranque local

```bash
npm install
cp .env.example .env.local     # rellenar las claves
npm run dev                    # http://localhost:3000
```

El sitio arranca y se ve completo **sin configurar Supabase**. Sin claves, el
formulario responde con un mensaje claro y ofrece WhatsApp como alternativa.

| Script              | Qué hace                             |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Servidor de desarrollo               |
| `npm run build`     | Build de producción                  |
| `npm run start`     | Sirve el build                       |
| `npm run typecheck` | `tsc --noEmit`                       |
| `npm run lint`      | ESLint                               |
| `npm run check`     | Typecheck + lint                     |

---

## La regla que gobierna todo el contenido

El brief (§12) prohíbe inventar credenciales, datos médicos, resultados,
testimonios, contacto o precios. El código lo hace cumplir en vez de confiar en
la disciplina de quien edita:

```ts
// src/content/site.ts
phone: pending('teléfono'),          // → "[PENDIENTE: teléfono]"
```

Un valor marcado con `pending()` provoca tres efectos automáticos:

1. **En la interfaz** se muestra como `[PENDIENTE: …]` con subrayado punteado
   (`<Value>` / `<Pending>`), no como un dato real.
2. **En Schema.org, enlaces y metadatos** se omite: `buildOrganizationJsonLd()`
   filtra con `resolved()`, y `whatsappHref()` devuelve `undefined` en lugar de
   un enlace roto.
3. **En `/pendientes`** aparece listado. Esa página recorre el contenido real,
   así que la lista de material que falta nunca se desactualiza.

Para publicar un dato, se sustituye la llamada `pending(...)` por el valor
aprobado. No hay más pasos.

Lo mismo aplica a los resultados clínicos: `src/content/results.ts` arranca
vacío y `getPublishableResults()` sólo deja pasar casos con
`consentOnFile: true`. Nunca se rellena la galería con stock ni con imágenes
generadas por IA.

---

## Estructura

```
src/
├─ app/                       Rutas (App Router)
│  ├─ page.tsx                Inicio — funnel completo
│  ├─ dr-tamez/               El cirujano
│  ├─ procedimientos/         Índice + [slug] (una plantilla, N páginas)
│  ├─ resultados/             Galería antes/después
│  ├─ contacto/               Formulario + contacto directo
│  ├─ aviso-de-privacidad/    Estructura legal (texto lo entrega el cliente)
│  ├─ pendientes/             Control interno, noindex
│  ├─ api/leads/route.ts      Endpoint de captación
│  ├─ opengraph-image.tsx     Imagen social generada en build
│  ├─ sitemap.ts · robots.ts  SEO técnico
│  └─ globals.css             Design tokens
├─ components/
│  ├─ brand/                  Wordmark y monograma
│  ├─ layout/                 Header, Footer, CTA móvil, Analytics
│  ├─ sections/               Bloques de página reutilizables
│  ├─ cards/ · results/ · contact/ · ui/
├─ content/                   Todo el copy y los datos (única fuente de verdad)
├─ lib/                       SEO, analítica, validación, Supabase, anti-spam
└─ i18n/                      Preparación multilingüe (sin activar)
supabase/migrations/          Esquema SQL
```

---

## Sistema visual

Paleta y tipografía derivadas del Brand Book, en `src/app/globals.css`.
La combinación elegida es la de la portada: **petróleo profundo + crema**.

| Token       | Petróleo  | Hueso     | Arena     | Profundo  |
| ----------- | --------- | --------- | --------- | --------- |
| Superficie  | `#2d3e45` | `#f3ede4` | `#d9cec0` | `#101c21` |
| Texto       | `#ede6da` | `#16242a` | `#101c21` | `#ede6da` |

Cada sección declara su tono y los hijos usan tokens semánticos:

```tsx
<Section tone="bone">        {/* pone data-tone="bone" */}
  <p className="text-fg-muted">…</p>   {/* se adapta solo */}
</Section>
```

Los tokens (`--color-surface`, `--color-fg`, `--color-line`, `--color-accent`…)
se redefinen por `[data-tone]` con su **valor final**, no como
`var(--otra-variable)`: una custom property se sustituye donde se declara, así
que la indirección congelaría el valor de `:root` y todos los bloques heredarían
el mismo tono.

**Tipografía:** Cormorant Garamond (serif editorial de alto contraste) + Jost
(sans geométrica). Son sustitutas mientras llegan las familias con licencia del
Brand Book; para cambiarlas basta editar `src/app/layout.tsx` — las variables
CSS no cambian.

**Logotipo:** compuesto tipográficamente en
`src/components/brand/Wordmark.tsx`. Cuando llegue el SVG final, se sustituye el
interior del componente; su API (`variant`, `size`) no cambia y el resto del
sitio no se toca.

---

## Añadir un procedimiento

Una sola entrada en `src/content/procedures.ts`; la página, el enlace en el
índice, el sitemap y el selector del formulario aparecen solos.

```ts
createProcedure({
  slug: 'mentoplastia',        // define la URL: /procedimientos/mentoplastia
  name: 'Mentoplastia',
  category: 'facial',
  tagline: 'Equilibrio del tercio inferior.',
  intro: 'Texto editorial no médico…',
  featured: false,             // true → aparece en portada
  order: 11,
});
```

`createProcedure` rellena por defecto objetivo, candidato ideal, recuperación y
respuestas de FAQ con marcadores `[PENDIENTE: …]`. Se sobrescriben sólo cuando
el médico entregue el texto aprobado.

---

## Formulario y privacidad

Recorrido de un envío: honeypot → tiempo mínimo de llenado → límite por IP →
validación Zod → insert en Supabase con la clave secreta.

- Sólo se piden datos de contacto. Nada de historia clínica ni diagnósticos.
- El consentimiento es obligatorio, con restricción a nivel de base de datos
  (`check (consent = true)`).
- La IP se guarda **hasheada** con SHA-256 y sal, nunca en claro.
- El contenido del formulario no se registra en logs ni se envía a analítica.

---

## Analítica

`src/lib/analytics.ts` expone `track(evento, payload)` sobre `dataLayer`/gtag.
El tipo `AnalyticsPayload` sólo admite claves categóricas (`location`,
`procedure`, `page`, `errorCode`): enviar un nombre o un teléfono **no
compila**.

Eventos: clic en valoración, clic en WhatsApp, clic en teléfono, envío exitoso,
error de envío, vista de procedimiento y vista de resultados.

Sin `NEXT_PUBLIC_GA_MEASUREMENT_ID` no se carga ningún script de terceros.

---

## Internacionalización

Preparada, no activada (brief §9). Con un solo locale, `alternateLanguages()`
no emite `hreflang`. Para añadir idiomas: agregar el locale en
`src/i18n/config.ts` y mover las rutas a `src/app/[locale]/`. Los metadatos se
adaptan solos.

---

## Rendimiento y accesibilidad

- El JavaScript de cliente se limita a lo que lo necesita: header, formulario,
  filtro de resultados, reveal y eventos. Todo lo demás son Server Components.
- Las FAQ usan `<details>`/`<summary>` nativos: accesibles por teclado sin JS.
- `next/image` con AVIF/WebP y carga diferida fuera del primer viewport.
- Enlace "Saltar al contenido", foco visible en ambos tonos, `aria-current` en
  navegación y estados de formulario anunciados con `role="status"`/`role="alert"`.
- `prefers-reduced-motion` desactiva las animaciones.
