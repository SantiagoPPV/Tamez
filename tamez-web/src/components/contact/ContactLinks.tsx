'use client';

import { siteConfig, whatsappHref, phoneHref, isPending } from '@/content/site';
import { track, ANALYTICS_EVENTS } from '@/lib/analytics';
import { Value } from '@/components/ui/Pending';
import { cn } from '@/lib/utils';

/**
 * Bloque de contacto directo. Cada dato aparece como enlace si ya es real, o
 * como marcador `[PENDIENTE: …]` si el cliente todavía no lo entregó — nunca
 * como un enlace roto.
 */
export function ContactLinks({
  location,
  className,
}: {
  /** Origen del clic para la analítica: 'footer' | 'contacto' | 'hero'… */
  location: string;
  className?: string;
}) {
  const whatsapp = whatsappHref();
  const phone = phoneHref();
  const email = isPending(siteConfig.contact.email) ? undefined : siteConfig.contact.email;

  return (
    <ul className={cn('space-y-3 text-sm', className)}>
      <li>
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track(ANALYTICS_EVENTS.ctaWhatsapp, { location })}
            className="text-fg hover:text-accent inline-flex items-center gap-2 transition-colors duration-300"
          >
            <WhatsAppGlyph />
            WhatsApp
          </a>
        ) : (
          <span className="inline-flex items-center gap-2">
            <WhatsAppGlyph />
            <Value value={siteConfig.contact.whatsapp} />
          </span>
        )}
      </li>

      <li>
        {phone ? (
          <a
            href={phone}
            onClick={() => track(ANALYTICS_EVENTS.ctaTelefono, { location })}
            className="text-fg hover:text-accent transition-colors duration-300"
          >
            {siteConfig.contact.phone}
          </a>
        ) : (
          <Value value={siteConfig.contact.phone} />
        )}
      </li>

      <li>
        {email ? (
          <a
            href={`mailto:${email}`}
            className="text-fg hover:text-accent transition-colors duration-300"
          >
            {email}
          </a>
        ) : (
          <Value value={siteConfig.contact.email} />
        )}
      </li>
    </ul>
  );
}

function WhatsAppGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="h-4 w-4 shrink-0 fill-current"
    >
      <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.2-1.36a9.9 9.9 0 0 0 4.84 1.24h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2Zm0 18.2h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.09.81.83-3.01-.2-.31a8.24 8.24 0 1 1 6.96 3.84Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.8-.23-.09-.39-.13-.56.12-.16.25-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.22.25-.85.83-.85 2.03s.87 2.35.99 2.51c.12.17 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  );
}
