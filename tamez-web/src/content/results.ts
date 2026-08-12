import { pending } from './site';

/**
 * Casos de resultados.
 *
 * REGLA CRÍTICA (brief §4.4 y §7): nunca usar imágenes generadas por IA como
 * resultado clínico y nunca publicar un caso sin consentimiento firmado.
 * El array `results` arranca VACÍO a propósito: la galería muestra un estado
 * de "pendiente de material autorizado" hasta que el cliente entregue los
 * casos. Añadir entradas aquí sólo cuando exista autorización documentada.
 */

export interface ResultCase {
  readonly id: string;
  /** Slug del procedimiento relacionado (ver `procedures.ts`). */
  readonly procedureSlug: string;
  /** Texto corto y sobrio. Sin promesas ni cifras. */
  readonly caption: string;
  readonly before: {
    readonly src: string;
    readonly alt: string;
  };
  readonly after: {
    readonly src: string;
    readonly alt: string;
  };
  /** Debe ser `true` para poder renderizarse. */
  readonly consentOnFile: boolean;
}

export const results: readonly ResultCase[] = [
  // Ejemplo de la forma esperada (comentado — NO publicar sin material real):
  //
  // {
  //   id: 'rinoplastia-01',
  //   procedureSlug: 'rinoplastia',
  //   caption: 'Perfil a los 6 meses.',
  //   before: { src: '/resultados/rinoplastia-01-antes.webp', alt: 'Perfil antes del procedimiento' },
  //   after:  { src: '/resultados/rinoplastia-01-despues.webp', alt: 'Perfil después del procedimiento' },
  //   consentOnFile: true,
  // },
];

/** Sólo casos con consentimiento documentado llegan a la interfaz. */
export function getPublishableResults(): readonly ResultCase[] {
  return results.filter((item) => item.consentOnFile);
}

export function getResultsForProcedure(slug: string): readonly ResultCase[] {
  return getPublishableResults().filter((item) => item.procedureSlug === slug);
}

/** Marcador mostrado mientras no haya casos autorizados. */
export const resultsPendingLabel = pending(
  'casos antes/después reales con consentimiento firmado',
);
