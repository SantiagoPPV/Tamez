import type { MetadataRoute } from 'next';
import { siteConfig } from '@/content/site';
import { absoluteUrl } from '@/lib/utils';

/** robots.txt (brief §9). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Rutas internas y de servicio: fuera del índice.
        disallow: ['/api/', '/pendientes'],
      },
    ],
    sitemap: absoluteUrl(siteConfig.url, '/sitemap.xml'),
    host: siteConfig.url,
  };
}
