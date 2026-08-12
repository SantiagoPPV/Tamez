/**
 * Preparación para internacionalización (brief §9 y §11).
 *
 * La primera versión es SÓLO en español. La arquitectura queda lista para
 * añadir locales sin reescribir rutas:
 *
 *   1. Añadir el locale a `locales`.
 *   2. Mover `src/app/(rutas)` a `src/app/[locale]/(rutas)`.
 *   3. `alternateLanguages()` empezará a emitir hreflang automáticamente.
 *
 * NO activar traducciones en esta versión.
 */

export const locales = ['es'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'es';

/** Etiqueta BCP-47 para el atributo `lang` del documento. */
export const localeTags: Record<Locale, string> = {
  es: 'es-MX',
};

/** ¿El sitio ya es multilingüe? Mientras sea `false`, no se emite hreflang. */
export const isMultilingual = locales.length > 1;

/**
 * Mapa de idiomas alternos para la Metadata API.
 * Devuelve `undefined` con un solo locale para no emitir hreflang inútil.
 */
export function alternateLanguages(
  pathname: string,
  baseUrl: string,
): Record<string, string> | undefined {
  if (!isMultilingual) return undefined;

  const entries = locales.map((locale) => {
    const prefix = locale === defaultLocale ? '' : `/${locale}`;
    return [localeTags[locale], `${baseUrl}${prefix}${pathname}`] as const;
  });

  return Object.fromEntries(entries);
}
