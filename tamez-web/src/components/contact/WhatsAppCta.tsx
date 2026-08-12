'use client';

import { CtaLink, type CtaSize, type CtaVariant } from '@/components/ui/CtaLink';
import { Pending } from '@/components/ui/Pending';
import { whatsappHref, siteConfig } from '@/content/site';
import { ANALYTICS_EVENTS } from '@/lib/analytics';

/**
 * Botón de WhatsApp. Si el número aún no está configurado, en lugar de un
 * enlace roto se muestra el marcador de dato pendiente.
 */
export function WhatsAppCta({
  location,
  label = 'Hablar por WhatsApp',
  message,
  variant = 'outline',
  size = 'md',
  className,
}: {
  location: string;
  label?: string;
  message?: string;
  variant?: CtaVariant;
  size?: CtaSize;
  className?: string;
}) {
  const href = whatsappHref(message);

  if (!href) {
    return (
      <span className="text-xs">
        <Pending>{siteConfig.contact.whatsapp}</Pending>
      </span>
    );
  }

  return (
    <CtaLink
      href={href}
      external
      variant={variant}
      size={size}
      event={ANALYTICS_EVENTS.ctaWhatsapp}
      analytics={{ location }}
      className={className}
    >
      {label}
    </CtaLink>
  );
}
