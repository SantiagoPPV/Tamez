/**
 * Capa de analítica (brief §14).
 *
 * REGLA: nunca se envían nombre, teléfono, correo, mensaje ni ningún dato
 * personal. El tipo `AnalyticsPayload` sólo admite claves no sensibles, así
 * que un envío accidental de PII no compila.
 */

export const ANALYTICS_EVENTS = {
  ctaValoracion: 'cta_solicitar_valoracion',
  ctaWhatsapp: 'cta_whatsapp',
  ctaTelefono: 'cta_telefono',
  formSubmitted: 'form_valoracion_enviado',
  formError: 'form_valoracion_error',
  procedureView: 'ver_procedimiento',
  resultsView: 'ver_resultados',
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/**
 * Únicas propiedades permitidas. Todas son categóricas y no identifican a
 * una persona.
 */
export interface AnalyticsPayload {
  /** Dónde se hizo clic: 'header' | 'hero' | 'footer' | 'sticky' | 'seccion'. */
  readonly location?: string;
  /** Slug del procedimiento relacionado, nunca texto libre del usuario. */
  readonly procedure?: string;
  /** Ruta de la página; no incluye parámetros de consulta. */
  readonly page?: string;
  /** Código de error de interfaz, no el mensaje del servidor. */
  readonly errorCode?: string;
}

interface DataLayerWindow extends Window {
  dataLayer?: Array<Record<string, unknown>>;
  gtag?: (...args: unknown[]) => void;
}

/**
 * Registra un evento de conversión. Silencioso si no hay herramienta
 * instalada: el sitio funciona igual sin analítica configurada.
 */
export function track(event: AnalyticsEvent, payload: AnalyticsPayload = {}): void {
  if (typeof window === 'undefined') return;

  const w = window as DataLayerWindow;
  const params: Record<string, unknown> = {};

  if (payload.location) params.location = payload.location;
  if (payload.procedure) params.procedure = payload.procedure;
  if (payload.page) params.page = payload.page;
  if (payload.errorCode) params.error_code = payload.errorCode;

  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({ event, ...params });

  if (typeof w.gtag === 'function') {
    w.gtag('event', event, params);
  }
}
