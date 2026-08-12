import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  leadSchema,
  toFieldErrors,
  MIN_FILL_TIME_MS,
} from '@/lib/validation';
import { checkRateLimit, getClientIp, hashIp } from '@/lib/rate-limit';
import type { LeadInsert } from '@/lib/supabase/types';

/**
 * Endpoint de captación de valoraciones.
 *
 * Recorrido: honeypot → tiempo mínimo → rate limit → validación → Supabase.
 *
 * Nunca se registra el contenido del formulario en logs ni en analítica
 * (brief §13 y §14): los `console.error` sólo emiten códigos y mensajes del
 * proveedor, jamás los campos del usuario.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ErrorCode =
  | 'not_configured'
  | 'invalid_json'
  | 'validation'
  | 'rate_limited'
  | 'rejected'
  | 'storage_error';

function fail(
  code: ErrorCode,
  status: number,
  extra: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json({ ok: false, code, ...extra }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  // --- 1. Parseo defensivo del cuerpo -------------------------------------
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail('invalid_json', 400);
  }

  // --- 2. Validación de esquema -------------------------------------------
  const parsed = leadSchema.safeParse(payload);
  if (!parsed.success) {
    return fail('validation', 422, { fieldErrors: toFieldErrors(parsed.error) });
  }
  const lead = parsed.data;

  // --- 3. Señales anti-bot -------------------------------------------------
  // Honeypot relleno o formulario enviado demasiado rápido. Se responde 200
  // para no darle al bot una señal útil, pero no se guarda nada.
  const looksAutomated =
    lead.website !== '' || (lead.elapsedMs > 0 && lead.elapsedMs < MIN_FILL_TIME_MS);

  if (looksAutomated) {
    return NextResponse.json({ ok: true, discarded: true }, { status: 200 });
  }

  // --- 4. Límite por IP ----------------------------------------------------
  const ip = getClientIp(request.headers);
  const ipHash = hashIp(ip);
  const limit = checkRateLimit(ipHash);
  if (!limit.allowed) {
    return fail('rate_limited', 429, { retryAfter: limit.retryAfterSeconds });
  }

  // --- 5. Persistencia -----------------------------------------------------
  // Si aún no hay claves de Supabase, el sitio sigue en pie y el formulario
  // muestra la alternativa de WhatsApp en lugar de fallar con un error opaco.
  if (!isSupabaseConfigured()) {
    return fail('not_configured', 503);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return fail('not_configured', 503);
  }

  const row: LeadInsert = {
    full_name: lead.fullName,
    contact_method: lead.contactMethod,
    contact_value: lead.contactValue,
    procedure_slug: lead.procedureSlug === '' ? null : lead.procedureSlug,
    message: lead.message === '' ? null : lead.message,
    consent: lead.consent,
    source_page: lead.sourcePage === '' ? null : lead.sourcePage,
    ip_hash: ipHash,
    user_agent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
  };

  const { error } = await supabase.from('leads').insert(row);

  if (error) {
    // Sólo el mensaje del proveedor; nunca los datos del prospecto.
    console.error('[leads] insert failed:', error.code, error.message);
    return fail('storage_error', 502);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

/** Cualquier otro método no está permitido. */
export function GET(): NextResponse {
  return NextResponse.json({ ok: false, code: 'method_not_allowed' }, { status: 405 });
}
