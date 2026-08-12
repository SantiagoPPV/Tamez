import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { CtaLink } from '@/components/ui/CtaLink';
import { WhatsAppCta } from '@/components/contact/WhatsAppCta';
import { PRIMARY_CTA } from '@/content/site';
import { finalCta } from '@/content/home';
import { ANALYTICS_EVENTS } from '@/lib/analytics';

/**
 * Cierre del funnel (brief §4.1 y §5): firme pero sin presión artificial.
 * Sin cuenta atrás, sin escasez inventada, sin pop-up.
 */
export function FinalCta({
  eyebrow = finalCta.eyebrow,
  title = finalCta.title,
  body = finalCta.body,
  location = 'cta_final',
  procedure,
}: {
  eyebrow?: string;
  title?: string;
  body?: string;
  location?: string;
  /** Slug del procedimiento, si el CTA vive en una página de procedimiento. */
  procedure?: string;
}) {
  return (
    <Section tone="mist" aria-labelledby="cta-final-title">
      <Container width="narrow" className="text-center">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2
          id="cta-final-title"
          className="font-display text-fg mt-6 text-[2rem] font-light sm:text-4xl lg:text-5xl"
        >
          {title}
        </h2>
        <p className="text-fg-muted mx-auto mt-6 max-w-xl text-base leading-relaxed">
          {body}
        </p>

        <div className="mt-11 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <CtaLink
            href={PRIMARY_CTA.href}
            size="lg"
            event={ANALYTICS_EVENTS.ctaValoracion}
            analytics={procedure ? { location, procedure } : { location }}
          >
            {PRIMARY_CTA.label}
          </CtaLink>

          <WhatsAppCta location={location} variant="outline" size="lg" />
        </div>
      </Container>
    </Section>
  );
}
