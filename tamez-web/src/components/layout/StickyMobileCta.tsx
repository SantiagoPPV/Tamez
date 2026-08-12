'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { PRIMARY_CTA, whatsappHref } from '@/content/site';
import { track, ANALYTICS_EVENTS } from '@/lib/analytics';

/**
 * CTA persistente en móvil (brief §5: "accesible en móvil sin invadir la
 * experiencia").
 *
 * Barra inferior discreta, sin pop-up ni interrupción. Se oculta en la propia
 * página de contacto, donde sería redundante.
 */
export function StickyMobileCta() {
  const pathname = usePathname();
  const whatsapp = whatsappHref();

  if (pathname === '/contacto') return null;

  return (
    <div
      data-tone="forest"
      className="bg-forest/95 border-line fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-sm lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch">
        <Link
          href={PRIMARY_CTA.href}
          onClick={() =>
            track(ANALYTICS_EVENTS.ctaValoracion, { location: 'sticky_movil' })
          }
          className="bg-accent text-surface flex-1 px-4 py-4 text-center text-[0.6875rem] tracking-eyebrow uppercase"
        >
          {PRIMARY_CTA.label}
        </Link>

        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              track(ANALYTICS_EVENTS.ctaWhatsapp, { location: 'sticky_movil' })
            }
            className="text-fg border-line border-l px-6 py-4 text-[0.6875rem] tracking-eyebrow uppercase"
          >
            WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
