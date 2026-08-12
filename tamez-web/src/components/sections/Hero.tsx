import { Container } from '@/components/ui/Container';
import { CtaLink } from '@/components/ui/CtaLink';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { MediaFrame } from '@/components/ui/MediaFrame';
import { Wordmark } from '@/components/brand/Wordmark';
import { PRIMARY_CTA, SECONDARY_CTA } from '@/content/site';
import { hero } from '@/content/home';
import { ANALYTICS_EVENTS } from '@/lib/analytics';

/**
 * Hero de portada (brief §4.1).
 *
 * Ambos CTA quedan above the fold. Composición asimétrica y mucho espacio
 * negativo: el peso visual lo lleva el logotipo, no un botón gritado.
 */
export function Hero() {
  return (
    <section
      data-tone="petrol"
      aria-labelledby="hero-title"
      className="bg-surface text-fg relative overflow-hidden pt-32 pb-20 sm:pt-40 lg:pt-44 lg:pb-28"
    >
      {/* Halo muy sutil; puro CSS, sin coste de red. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-1/3 -right-1/4 h-[42rem] w-[42rem] rounded-full opacity-[0.07]"
        style={{
          background:
            'radial-gradient(circle, var(--color-bone-200) 0%, transparent 65%)',
        }}
      />

      <Container width="wide" className="relative">
        <div className="grid items-end gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <div>
            <Eyebrow>{hero.eyebrow}</Eyebrow>

            <div className="mt-10 sm:mt-12">
              <Wordmark variant="stacked" size="xl" className="items-start" />
            </div>

            <h1
              id="hero-title"
              className="font-display text-fg mt-12 max-w-xl text-[2.5rem] leading-[1.06] font-light sm:text-5xl lg:text-[3.5rem]"
            >
              {hero.title}
            </h1>

            <p className="text-fg-muted mt-7 max-w-md text-base leading-relaxed sm:text-lg">
              {hero.subtitle}
            </p>

            <div className="mt-11 flex flex-col gap-4 sm:flex-row sm:items-center">
              <CtaLink
                href={PRIMARY_CTA.href}
                size="lg"
                event={ANALYTICS_EVENTS.ctaValoracion}
                analytics={{ location: 'hero' }}
              >
                {PRIMARY_CTA.label}
              </CtaLink>

              <CtaLink href={SECONDARY_CTA.href} variant="quiet" className="sm:ml-4">
                {SECONDARY_CTA.label}
              </CtaLink>
            </div>

            <p className="text-fg-subtle mt-10 text-[0.625rem] tracking-eyebrow uppercase">
              {hero.note}
            </p>
          </div>

          <div className="lg:pb-6">
            <MediaFrame
              pendingLabel="Fotografía editorial de portada — luz suave, piel real"
              ratio="portrait"
              priority
              sizes="(min-width: 1024px) 38vw, 100vw"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
