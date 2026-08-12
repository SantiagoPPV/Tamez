import { z } from 'zod';
import { procedures } from '@/content/procedures';

/**
 * Validación del formulario de valoración (brief §13).
 *
 * Sólo se piden datos necesarios para contacto comercial. NO se admite
 * historia clínica, diagnósticos ni información médica sensible.
 */

export const contactMethods = ['whatsapp', 'telefono', 'email'] as const;
export type ContactMethod = (typeof contactMethods)[number];

export const contactMethodLabels: Record<ContactMethod, string> = {
  whatsapp: 'WhatsApp',
  telefono: 'Teléfono',
  email: 'Correo electrónico',
};

const procedureSlugs = procedures.map((procedure) => procedure.slug);

/** Longitud máxima del mensaje: suficiente para contexto, no para expediente. */
export const MESSAGE_MAX_LENGTH = 600;

export const leadSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Escribe tu nombre.')
      .max(80, 'El nombre es demasiado largo.'),

    contactMethod: z.enum(contactMethods, {
      message: 'Selecciona un medio de contacto.',
    }),

    contactValue: z
      .string()
      .trim()
      .min(6, 'Escribe un dato de contacto válido.')
      .max(120, 'El dato de contacto es demasiado largo.'),

    procedureSlug: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || value === 'no-definido' || procedureSlugs.includes(value),
        'Selecciona un procedimiento de la lista.',
      )
      .optional()
      .default(''),

    message: z
      .string()
      .trim()
      .max(MESSAGE_MAX_LENGTH, `Máximo ${MESSAGE_MAX_LENGTH} caracteres.`)
      .optional()
      .default(''),

    consent: z.literal(true, {
      message: 'Necesitamos tu consentimiento para poder contactarte.',
    }),

    /** Página desde la que se envió. Uso interno, no analítica. */
    sourcePage: z.string().trim().max(200).optional().default(''),

    /**
     * Honeypot: debe llegar vacío. No se valida aquí a propósito — la ruta lo
     * revisa y descarta el envío en silencio, para no devolver un error de
     * campo sobre un input que la persona usuaria no puede ver.
     */
    website: z.string().max(200).optional().default(''),

    /** Milisegundos entre carga y envío. Los bots envían casi instantáneo. */
    elapsedMs: z.coerce.number().int().nonnegative().optional().default(0),
  })
  .superRefine((data, ctx) => {
    if (data.contactMethod === 'email') {
      const isEmail = z.email().safeParse(data.contactValue).success;
      if (!isEmail) {
        ctx.addIssue({
          code: 'custom',
          path: ['contactValue'],
          message: 'Escribe un correo electrónico válido.',
        });
      }
      return;
    }

    // WhatsApp / teléfono: al menos 8 dígitos, admitiendo espacios y signos.
    const digits = data.contactValue.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      ctx.addIssue({
        code: 'custom',
        path: ['contactValue'],
        message: 'Escribe un número telefónico válido con clave lada.',
      });
    }
  });

export type LeadInput = z.input<typeof leadSchema>;
export type LeadData = z.output<typeof leadSchema>;

/** Tiempo mínimo verosímil de llenado; por debajo se trata como bot. */
export const MIN_FILL_TIME_MS = 2500;

/** Mapea los errores de Zod a un objeto `{ campo: mensaje }` para la UI. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}
