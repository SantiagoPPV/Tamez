/**
 * Concatenador de clases mínimo. Evitamos dependencias externas
 * (brief §10 — "evitar dependencias innecesarias").
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

/** Convierte un texto a slug ASCII apto para URLs limpias (brief §9). */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Une segmentos de ruta en una URL absoluta sin barras duplicadas. */
export function absoluteUrl(baseUrl: string, path = '/'): string {
  const base = baseUrl.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix === '/' ? '' : suffix}`;
}
