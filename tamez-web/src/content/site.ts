/**
 * Fuente única de verdad para datos institucionales.
 *
 * REGLA DEL BRIEF (§12): Codex NO puede inventar credenciales, contacto,
 * horarios, redes, precios ni contenido médico. Todo dato verificable vive
 * aquí y arranca como `pending(...)`. Los componentes detectan ese estado y:
 *   1. lo muestran como marcador visible `[PENDIENTE: …]`;
 *   2. lo excluyen de Schema.org, metadatos y enlaces.
 *
 * Para publicar: sustituir cada `pending(...)` por el valor real aprobado.
 */

export const PENDING_PREFIX = '[PENDIENTE:' as const;

/** Marca un dato como pendiente de entrega por el cliente. */
export function pending(label: string): string {
  return `${PENDING_PREFIX} ${label}]`;
}

/** ¿Este valor sigue siendo un marcador sin resolver? */
export function isPending(value: string | undefined | null): boolean {
  return !value || value.startsWith(PENDING_PREFIX);
}

/** Devuelve el valor sólo si ya es real; si no, `undefined`. */
export function resolved(value: string | undefined | null): string | undefined {
  return isPending(value) ? undefined : (value as string);
}

export interface NavItem {
  readonly label: string;
  readonly href: string;
}

export const siteConfig = {
  name: 'TAMEZ Plastic Surgery',
  shortName: 'TAMEZ',
  legalName: pending('razón social'),
  /** Frase de posicionamiento — BORRADOR sujeto a aprobación (brief §4.1). */
  tagline: 'Precisión, proporción y naturalidad.',
  taglineAlt: 'Resultados que se perciben. No procedimientos que se notan.',
  description:
    'Cirugía plástica con enfoque en precisión, proporción y resultados naturales. Solicita una valoración personalizada con el Dr. Tamez.',

  /** Se sobrescribe con NEXT_PUBLIC_SITE_URL en producción. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tamezplasticsurgery.com',

  doctor: {
    name: pending('nombre completo del Dr. Tamez'),
    shortName: 'Dr. Tamez',
    credentialsLine: pending('cédula profesional y de especialidad'),
    portrait: pending('retrato profesional real del doctor'),
  },

  contact: {
    /** Sólo dígitos con código de país, p. ej. "528112345678". */
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? pending('WhatsApp'),
    whatsappMessage:
      'Hola, me gustaría solicitar una valoración en TAMEZ Plastic Surgery.',
    phone: pending('teléfono'),
    email: pending('correo de contacto'),
    addressLine: pending('dirección del consultorio'),
    city: pending('ciudad'),
    country: 'México',
    mapsUrl: pending('enlace de Google Maps'),
    hours: pending('horarios de atención'),
  },

  social: {
    instagram: pending('Instagram'),
    facebook: pending('Facebook'),
    tiktok: pending('TikTok'),
  },

  legal: {
    privacyNoticeUrl: '/aviso-de-privacidad',
    /** Texto legal que debe entregar el cliente (brief §13). */
    consentText:
      'Acepto ser contactado(a) por el equipo de TAMEZ Plastic Surgery y he leído el aviso de privacidad.',
    resultsDisclaimer:
      'Los resultados varían entre pacientes. Las imágenes corresponden a casos reales autorizados y no representan una garantía de resultado.',
  },

  analytics: {
    gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '',
  },
} as const;

export const primaryNav: readonly NavItem[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Dr. Tamez', href: '/dr-tamez' },
  { label: 'Procedimientos', href: '/procedimientos' },
  { label: 'Resultados', href: '/resultados' },
  { label: 'Contacto', href: '/contacto' },
] as const;

export const footerNav: readonly NavItem[] = [
  { label: 'Aviso de privacidad', href: '/aviso-de-privacidad' },
  { label: 'Contacto', href: '/contacto' },
] as const;

/** CTA principal, constante en todo el sitio (brief §5). */
export const PRIMARY_CTA = {
  label: 'Solicitar valoración',
  href: '/contacto',
} as const;

export const SECONDARY_CTA = {
  label: 'Explorar procedimientos',
  href: '/procedimientos',
} as const;

/** Enlace de WhatsApp; `undefined` mientras el número siga pendiente. */
export function whatsappHref(message?: string): string | undefined {
  const number = resolved(siteConfig.contact.whatsapp)?.replace(/\D/g, '');
  if (!number) return undefined;
  const text = encodeURIComponent(message ?? siteConfig.contact.whatsappMessage);
  return `https://wa.me/${number}?text=${text}`;
}

/** Enlace tel:; `undefined` mientras el teléfono siga pendiente. */
export function phoneHref(): string | undefined {
  const phone = resolved(siteConfig.contact.phone)?.replace(/[^\d+]/g, '');
  return phone ? `tel:${phone}` : undefined;
}
