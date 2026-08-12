'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import { WhatsAppCta } from './WhatsAppCta';
import { procedures } from '@/content/procedures';
import { siteConfig } from '@/content/site';
import {
  contactMethods,
  contactMethodLabels,
  MESSAGE_MAX_LENGTH,
  type ContactMethod,
} from '@/lib/validation';
import { track, ANALYTICS_EVENTS } from '@/lib/analytics';
import { cn } from '@/lib/utils';

/**
 * Formulario de solicitud de valoración (brief §4.5 y §13).
 *
 * · Sólo datos de contacto: nada de historia clínica ni información sensible.
 * · Consentimiento explícito obligatorio.
 * · Honeypot + tiempo mínimo de llenado como anti-spam.
 * · Estados de éxito y error claros y anunciados a lectores de pantalla.
 * · La analítica sólo recibe el evento; NUNCA el contenido de los campos.
 */

type Status = 'idle' | 'submitting' | 'success' | 'error';

interface ApiError {
  code?: string;
  fieldErrors?: Record<string, string>;
  retryAfter?: number;
}

const errorMessages: Record<string, string> = {
  not_configured:
    'El formulario todavía no está conectado. Escríbenos por WhatsApp y te atendemos de inmediato.',
  rate_limited:
    'Hemos recibido varios envíos desde esta conexión. Espera unos minutos o escríbenos por WhatsApp.',
  storage_error:
    'No pudimos registrar tu solicitud en este momento. Intenta de nuevo o escríbenos por WhatsApp.',
  validation: 'Revisa los campos marcados.',
  network:
    'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
};

export function ContactForm({
  /** Preselecciona un procedimiento al llegar desde su página. */
  defaultProcedure,
}: {
  defaultProcedure?: string;
}) {
  const pathname = usePathname();
  const baseId = useId();

  // Marca de tiempo de montaje para el control anti-bot. Se toma en un efecto
  // y no durante el render: `Date.now()` es impuro y haría el render inestable.
  const mountedAt = useRef(0);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const [status, setStatus] = useState<Status>('idle');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>('');
  const [contactMethod, setContactMethod] = useState<ContactMethod>('whatsapp');
  const [messageLength, setMessageLength] = useState(0);

  const fieldId = (name: string) => `${baseId}-${name}`;
  const errorId = (name: string) => `${baseId}-${name}-error`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'submitting') return;

    setStatus('submitting');
    setFieldErrors({});
    setFormError('');

    const formData = new FormData(event.currentTarget);
    const payload = {
      fullName: String(formData.get('fullName') ?? ''),
      contactMethod: String(formData.get('contactMethod') ?? ''),
      contactValue: String(formData.get('contactValue') ?? ''),
      procedureSlug: String(formData.get('procedureSlug') ?? ''),
      message: String(formData.get('message') ?? ''),
      consent: formData.get('consent') === 'on',
      website: String(formData.get('website') ?? ''),
      sourcePage: pathname,
      elapsedMs: mountedAt.current === 0 ? 0 : Date.now() - mountedAt.current,
    };

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStatus('success');
        track(ANALYTICS_EVENTS.formSubmitted, {
          page: pathname,
          ...(payload.procedureSlug ? { procedure: payload.procedureSlug } : {}),
        });
        return;
      }

      const data = (await response.json().catch(() => ({}))) as ApiError;
      const code = data.code ?? 'storage_error';

      setStatus('error');
      setFieldErrors(data.fieldErrors ?? {});
      setFormError(errorMessages[code] ?? errorMessages.storage_error!);
      track(ANALYTICS_EVENTS.formError, { page: pathname, errorCode: code });
    } catch {
      setStatus('error');
      setFormError(errorMessages.network!);
      track(ANALYTICS_EVENTS.formError, { page: pathname, errorCode: 'network' });
    }
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="border-line border p-8 sm:p-10"
      >
        <span
          aria-hidden="true"
          className="font-display text-fg block text-4xl leading-none font-light"
        >
          T
        </span>
        <h3 className="font-display text-fg mt-6 text-2xl font-light sm:text-3xl">
          Recibimos tu solicitud.
        </h3>
        <p className="text-fg-muted mt-4 max-w-md text-sm leading-relaxed">
          El equipo de TAMEZ se pondrá en contacto contigo por el medio que
          indicaste para coordinar tu valoración.
        </p>
        <div className="mt-8">
          <WhatsAppCta location="form_success" label="Escribir por WhatsApp ahora" />
        </div>
      </div>
    );
  }

  const contactValueLabel =
    contactMethod === 'email' ? 'Correo electrónico' : 'Número telefónico';
  const contactValuePlaceholder =
    contactMethod === 'email' ? 'nombre@correo.com' : '+52 81 0000 0000';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {/* Honeypot: invisible para personas, irresistible para bots. */}
      <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
        <label htmlFor={fieldId('website')}>No llenar este campo</label>
        <input
          id={fieldId('website')}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <Field
        label="Nombre"
        htmlFor={fieldId('fullName')}
        error={fieldErrors.fullName}
        errorId={errorId('fullName')}
        required
      >
        <input
          id={fieldId('fullName')}
          name="fullName"
          type="text"
          autoComplete="name"
          required
          maxLength={80}
          aria-invalid={Boolean(fieldErrors.fullName)}
          aria-describedby={fieldErrors.fullName ? errorId('fullName') : undefined}
          className={inputClass(Boolean(fieldErrors.fullName))}
        />
      </Field>

      <fieldset>
        <legend className="text-fg-subtle text-[0.6875rem] tracking-eyebrow uppercase">
          Medio de contacto preferido
        </legend>
        <div className="mt-4 flex flex-wrap gap-3">
          {contactMethods.map((method) => (
            <label
              key={method}
              className={cn(
                'cursor-pointer border px-5 py-2.5 text-xs tracking-eyebrow uppercase transition-colors duration-300',
                contactMethod === method
                  ? 'border-accent bg-accent text-surface'
                  : 'border-line text-fg-muted hover:border-fg/50',
              )}
            >
              <input
                type="radio"
                name="contactMethod"
                value={method}
                checked={contactMethod === method}
                onChange={() => setContactMethod(method)}
                className="sr-only"
              />
              {contactMethodLabels[method]}
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label={contactValueLabel}
        htmlFor={fieldId('contactValue')}
        error={fieldErrors.contactValue}
        errorId={errorId('contactValue')}
        required
      >
        <input
          id={fieldId('contactValue')}
          name="contactValue"
          type={contactMethod === 'email' ? 'email' : 'tel'}
          inputMode={contactMethod === 'email' ? 'email' : 'tel'}
          autoComplete={contactMethod === 'email' ? 'email' : 'tel'}
          placeholder={contactValuePlaceholder}
          required
          maxLength={120}
          aria-invalid={Boolean(fieldErrors.contactValue)}
          aria-describedby={
            fieldErrors.contactValue ? errorId('contactValue') : undefined
          }
          className={inputClass(Boolean(fieldErrors.contactValue))}
        />
      </Field>

      <Field
        label="Procedimiento de interés"
        htmlFor={fieldId('procedureSlug')}
        error={fieldErrors.procedureSlug}
        errorId={errorId('procedureSlug')}
      >
        {/* `appearance-none` quita el estilo nativo, así que la flecha se
            dibuja aparte: sin ella el select parece un campo de texto. */}
        <div className="relative">
          <select
            id={fieldId('procedureSlug')}
            name="procedureSlug"
            defaultValue={defaultProcedure ?? ''}
            className={cn(inputClass(false), 'cursor-pointer appearance-none pr-8')}
          >
            <option value="">Aún no lo he definido</option>
            {procedures.map((procedure) => (
              <option key={procedure.slug} value={procedure.slug}>
                {procedure.name}
              </option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            viewBox="0 0 12 8"
            className="text-fg-subtle pointer-events-none absolute top-1/2 right-1 h-2 w-3 -translate-y-1/2"
          >
            <path
              d="M1 1l5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        </div>
      </Field>

      <Field
        label="Mensaje"
        htmlFor={fieldId('message')}
        error={fieldErrors.message}
        errorId={errorId('message')}
        hint={`Opcional · ${messageLength}/${MESSAGE_MAX_LENGTH}`}
      >
        <textarea
          id={fieldId('message')}
          name="message"
          rows={4}
          maxLength={MESSAGE_MAX_LENGTH}
          onChange={(event) => setMessageLength(event.currentTarget.value.length)}
          aria-describedby={`${fieldId('message')}-privacidad`}
          className={cn(inputClass(Boolean(fieldErrors.message)), 'resize-y')}
        />
        <p
          id={`${fieldId('message')}-privacidad`}
          className="text-fg-subtle mt-2 text-xs leading-relaxed"
        >
          Por tu seguridad, no compartas información médica, diagnósticos ni
          fotografías en este formulario.
        </p>
      </Field>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="consent"
            required
            aria-invalid={Boolean(fieldErrors.consent)}
            aria-describedby={fieldErrors.consent ? errorId('consent') : undefined}
            className="border-line accent-accent mt-1 h-4 w-4 shrink-0"
          />
          <span className="text-fg-muted leading-relaxed">
            {siteConfig.legal.consentText}{' '}
            <a
              href={siteConfig.legal.privacyNoticeUrl}
              className="text-fg underline underline-offset-4"
            >
              Ver aviso de privacidad
            </a>
            .
          </span>
        </label>
        {fieldErrors.consent && (
          <p id={errorId('consent')} className="text-accent mt-2 text-xs">
            {fieldErrors.consent}
          </p>
        )}
      </div>

      {formError && (
        <p
          role="alert"
          className="border-accent/60 bg-fg/5 border-l-2 py-3 pl-4 text-sm"
        >
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-5 pt-2 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="bg-accent text-surface inline-flex items-center justify-center px-8 py-4 text-sm tracking-eyebrow uppercase transition-[filter] duration-300 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'submitting' ? 'Enviando…' : 'Solicitar valoración'}
        </button>

        <WhatsAppCta location="form_alterno" variant="quiet" />
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */

function inputClass(hasError: boolean): string {
  return cn(
    'w-full border-b bg-transparent px-0 py-3 text-base text-fg placeholder:text-fg-subtle',
    'transition-colors duration-300 focus:outline-none',
    hasError ? 'border-accent' : 'border-line focus:border-fg',
  );
}

function Field({
  label,
  htmlFor,
  children,
  error,
  errorId,
  hint,
  required = false,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  error?: string | undefined;
  errorId: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label
          htmlFor={htmlFor}
          className="text-fg-subtle text-[0.6875rem] tracking-eyebrow uppercase"
        >
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>
        {hint && <span className="text-fg-subtle text-xs">{hint}</span>}
      </div>
      <div className="mt-2">{children}</div>
      {error && (
        <p id={errorId} className="text-accent mt-2 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
