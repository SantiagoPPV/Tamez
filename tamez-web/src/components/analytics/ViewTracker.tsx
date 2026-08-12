'use client';

import { useEffect } from 'react';
import { track, type AnalyticsEvent, type AnalyticsPayload } from '@/lib/analytics';

/**
 * Registra un evento de vista al montar la página (brief §14: "visita a
 * página de procedimiento", "visualización de Resultados").
 *
 * No renderiza nada y no envía ningún dato personal.
 */
export function ViewTracker({
  event,
  payload,
}: {
  event: AnalyticsEvent;
  payload?: AnalyticsPayload;
}) {
  const procedure = payload?.procedure;
  const page = payload?.page;

  useEffect(() => {
    track(event, {
      ...(procedure ? { procedure } : {}),
      ...(page ? { page } : {}),
    });
  }, [event, procedure, page]);

  return null;
}
