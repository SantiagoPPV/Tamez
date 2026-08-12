import { proceduresBySlug } from '@/content/procedures';

/**
 * Lee `?procedimiento=<slug>` para preseleccionar el procedimiento en el
 * formulario cuando el usuario llega desde una página de procedimiento.
 *
 * Se valida contra el catálogo: un valor arbitrario en la URL nunca llega al
 * formulario ni a la base de datos.
 */
export function procedureSlugFromSearch(
  value: string | string[] | undefined,
): string | undefined {
  const slug = Array.isArray(value) ? value[0] : value;
  if (!slug) return undefined;
  return proceduresBySlug.has(slug) ? slug : undefined;
}
