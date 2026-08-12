import type { Metadata } from 'next';
import { siteConfig, resolved } from '@/content/site';
import { alternateLanguages, localeTags, defaultLocale } from '@/i18n/config';
import { absoluteUrl } from './utils';

const BASE_URL = siteConfig.url;

export interface PageSeo {
  /**
   * Título de la página SIN la marca: el layout añade
   * "| TAMEZ Plastic Surgery" mediante `title.template`.
   */
  title: string;
  description: string;
  /** Ruta absoluta del sitio, p. ej. `/procedimientos/rinoplastia`. */
  path: string;
  /** El título ya incluye la marca y no debe recibir el sufijo. */
  absoluteTitle?: boolean;
  /** Excluir de buscadores (páginas internas o de agradecimiento). */
  noIndex?: boolean;
  /** Imagen social. Por defecto la OG generada del sitio. */
  ogImage?: string;
}

/**
 * Constructor único de metadatos: title/description únicos por página,
 * canonical, Open Graph y hreflang (brief §9).
 */
export function buildMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  noIndex = false,
  ogImage = '/opengraph-image',
}: PageSeo): Metadata {
  const url = absoluteUrl(BASE_URL, path);
  const languages = alternateLanguages(path, BASE_URL);

  // Open Graph no aplica plantillas, así que el título social se compone aquí
  // para que coincida exactamente con el <title> del documento.
  const socialTitle = absoluteTitle ? title : `${title} | ${siteConfig.name}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: url,
      ...(languages ? { languages } : {}),
    },
    openGraph: {
      type: 'website',
      siteName: siteConfig.name,
      locale: localeTags[defaultLocale].replace('-', '_'),
      title: socialTitle,
      description,
      url,
      images: [{ url: absoluteUrl(BASE_URL, ogImage), width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [absoluteUrl(BASE_URL, ogImage)],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

/**
 * JSON-LD de la organización médica.
 *
 * Brief §9: "Schema.org con información REAL y verificable". Por eso cada
 * campo se filtra con `resolved()`: mientras el dato siga siendo un
 * `[PENDIENTE: …]`, simplemente no se emite. Nunca se publica un marcador
 * como si fuera un dato.
 */
export function buildOrganizationJsonLd(): Record<string, unknown> {
  const { contact, social, doctor } = siteConfig;

  const sameAs = [
    resolved(social.instagram),
    resolved(social.facebook),
    resolved(social.tiktok),
  ].filter((value): value is string => Boolean(value));

  const street = resolved(contact.addressLine);
  const city = resolved(contact.city);

  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalBusiness',
    name: siteConfig.name,
    url: BASE_URL,
    description: siteConfig.description,
    ...(resolved(contact.phone) ? { telephone: resolved(contact.phone) } : {}),
    ...(resolved(contact.email) ? { email: resolved(contact.email) } : {}),
    ...(street || city
      ? {
          address: {
            '@type': 'PostalAddress',
            ...(street ? { streetAddress: street } : {}),
            ...(city ? { addressLocality: city } : {}),
            addressCountry: contact.country,
          },
        }
      : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(resolved(doctor.name)
      ? {
          employee: {
            '@type': 'Physician',
            name: resolved(doctor.name),
            medicalSpecialty: 'PlasticSurgery',
          },
        }
      : {}),
  };
}

/** JSON-LD de migas de pan para páginas internas. */
export function buildBreadcrumbJsonLd(
  items: ReadonlyArray<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(BASE_URL, item.path),
    })),
  };
}
