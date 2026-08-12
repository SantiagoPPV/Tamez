import type { MetadataRoute } from 'next';
import { siteConfig } from '@/content/site';
import { procedures } from '@/content/procedures';
import { absoluteUrl } from '@/lib/utils';

/** Sitemap (brief §9). Excluye páginas internas y no indexables. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  }> = [
    { path: '/', priority: 1, changeFrequency: 'monthly' },
    { path: '/dr-tamez', priority: 0.9, changeFrequency: 'yearly' },
    { path: '/procedimientos', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/resultados', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/contacto', priority: 0.8, changeFrequency: 'yearly' },
    { path: '/aviso-de-privacidad', priority: 0.2, changeFrequency: 'yearly' },
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: absoluteUrl(siteConfig.url, route.path),
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...procedures.map((procedure) => ({
      url: absoluteUrl(siteConfig.url, `/procedimientos/${procedure.slug}`),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
