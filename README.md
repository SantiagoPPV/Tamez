# TAMEZ Plastic Surgery

Sitio web oficial: experiencia institucional premium y *sales funnel* consultivo
orientado a solicitudes de valoración.

La aplicación vive en [`tamez-web/`](tamez-web/).

| Documento                                 | Para qué                                    |
| ----------------------------------------- | ------------------------------------------- |
| [`tamez-web/README.md`](tamez-web/README.md) | Arquitectura, cómo editar contenido         |
| [`tamez-web/docs/MARCA.md`](tamez-web/docs/MARCA.md) | Marca: contexto, color, tipografía, logotipo |
| [`tamez-web/DEPLOY.md`](tamez-web/DEPLOY.md) | Netlify, Supabase y dominio, paso a paso    |
| [`netlify.toml`](netlify.toml)            | Configuración de build (se lee al vincular el repo) |

## Arranque rápido

```bash
cd tamez-web
npm install
cp .env.example .env.local
npm run dev
```

## Stack

Next.js 16 (App Router) · TypeScript estricto · Tailwind CSS 4 · Supabase ·
Netlify.
