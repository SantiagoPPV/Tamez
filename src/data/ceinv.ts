import { QUALITY_LISTS } from '../domain/catalogs'
import { DEFAULT_PARAMS } from '../domain/defaults'
import type { ProjectData } from '../domain/types'
import { CEINV_PARAMS, CEINV_RAW } from './ceinv.raw'

/**
 * Caso ficticio CE-INV («Control de inventario en almacenes», Cliente Ejemplo, S.A. de C.V.)
 * al corte del viernes 12/02/2027. Cada llamada devuelve una copia nueva.
 */
export function buildCeInv(): ProjectData {
  const raw = structuredClone(CEINV_RAW)
  return {
    ...raw,
    project: { ...raw.project, params: { ...DEFAULT_PARAMS, ...CEINV_PARAMS } },
    wbs: raw.wbs.map((w) => ({
      ...w,
      // Las actividades con lista completa traen palomeadas todas las casillas de su tipo.
      checklist:
        w.checklistComplete && w.activityType
          ? QUALITY_LISTS[w.activityType].items.map((_, i) => String(i))
          : [],
    })),
  }
}
