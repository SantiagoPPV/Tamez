import { PENDING_PREFIX } from '@/content/site';

/**
 * Recorre un objeto de contenido y devuelve todos los marcadores
 * `[PENDIENTE: …]` con su ruta de acceso.
 *
 * Sirve para generar la lista de material que el cliente debe entregar
 * (brief §19) directamente desde el contenido real, en vez de mantener una
 * lista paralela que se desactualiza.
 */

export interface PendingEntry {
  /** Ruta dentro del objeto, p. ej. `contact.phone`. */
  readonly path: string;
  /** Texto del marcador. */
  readonly label: string;
}

export function collectPending(source: unknown, prefix = ''): PendingEntry[] {
  const found: PendingEntry[] = [];

  if (typeof source === 'string') {
    if (source.startsWith(PENDING_PREFIX)) {
      found.push({ path: prefix, label: source });
    }
    return found;
  }

  if (Array.isArray(source)) {
    source.forEach((item, index) => {
      found.push(...collectPending(item, `${prefix}[${index}]`));
    });
    return found;
  }

  if (source && typeof source === 'object') {
    for (const [key, value] of Object.entries(source)) {
      const path = prefix ? `${prefix}.${key}` : key;
      found.push(...collectPending(value, path));
    }
  }

  return found;
}

/** Elimina marcadores repetidos conservando el primer path donde aparecen. */
export function dedupePending(entries: readonly PendingEntry[]): PendingEntry[] {
  const seen = new Set<string>();
  const unique: PendingEntry[] = [];

  for (const entry of entries) {
    if (seen.has(entry.label)) continue;
    seen.add(entry.label);
    unique.push(entry);
  }

  return unique;
}
