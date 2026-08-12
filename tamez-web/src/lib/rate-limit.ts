import { createHash } from 'node:crypto';
import { env } from './env';

/**
 * Protección anti-spam básica (brief §13).
 *
 * Ventana deslizante en memoria. En un entorno serverless cada instancia
 * tiene su propio mapa, así que esto NO sustituye a un WAF: su objetivo es
 * frenar ráfagas triviales y envíos automatizados repetidos. Si en el futuro
 * hace falta un límite global, sustituir el `Map` por una tabla en Supabase o
 * por el rate limiting de Netlify.
 */

const WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const MAX_REQUESTS = 5;

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const previous = hits.get(key) ?? [];
  const recent = previous.filter((timestamp) => now - timestamp < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    const oldest = recent[0] ?? now;
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((WINDOW_MS - (now - oldest)) / 1000),
    };
  }

  recent.push(now);
  hits.set(key, recent);

  // Limpieza oportunista para que el mapa no crezca sin límite.
  if (hits.size > 500) {
    for (const [mapKey, timestamps] of hits) {
      if (timestamps.every((timestamp) => now - timestamp >= WINDOW_MS)) {
        hits.delete(mapKey);
      }
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Deriva la IP del cliente de las cabeceras del proxy de Netlify.
 * Devuelve `unknown` si no hay ninguna disponible.
 */
export function getClientIp(headers: Headers): string {
  const candidates = [
    headers.get('x-nf-client-connection-ip'),
    headers.get('x-forwarded-for')?.split(',')[0],
    headers.get('x-real-ip'),
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) return value;
  }

  return 'unknown';
}

/**
 * Hash irreversible de la IP. Se guarda para poder detectar abuso sin
 * almacenar la dirección en claro.
 */
export function hashIp(ip: string): string {
  return createHash('sha256').update(`${env.leadIpSalt}:${ip}`).digest('hex').slice(0, 32);
}
