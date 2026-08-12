import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { PageHero } from '@/components/layout/PageHero';
import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { MediaFrame } from '@/components/ui/MediaFrame';
import { Value, Pending } from '@/components/ui/Pending';
import { Reveal } from '@/components/ui/Reveal';
import { CtaLink } from '@/components/ui/CtaLink';
import { FaqSection } from '@/components/sections/FaqSection';
import { FinalCta } from '@/components/sections/FinalCta';
import { ResultsGrid } from '@/components/results/ResultsGrid';
import { JsonLd } from '@/components/ui/JsonLd';
import { ViewTracker } from '@/components/analytics/ViewTracker';

import { buildMetadata, buildBreadcrumbJsonLd } from '@/lib/seo';
import { PRIMARY_CTA, siteConfig, isPending } from '@/content/site';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import {
  procedures,
  getProcedure,
  getProceduresByCategory,
  categoryLabels,
} from '@/content/procedures';
import { getResultsForProcedure } from '@/content/results';

/**
 * Plantilla única para hasta 10 procedimientos (brief §4.3 y §16).
 *
 * Añadir un procedimiento = añadir una entrada en `content/procedures.ts`.
 * No se duplica layout ni se crea un archivo por página.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): Array<{ slug: string }> {
  return procedures.map((procedure) => ({ slug: procedure.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const procedure = getProcedure(slug);

  if (!procedure) {
    return buildMetadata({
      title: 'Procedimiento no encontrado',
      description: 'La página que buscas no está disponible.',
      path: `/procedimientos/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: procedure.metaTitle,
    description: procedure.metaDescription,
    path: `/procedimientos/${procedure.slug}`,
  });
}

export default async function ProcedurePage({ params }: PageProps) {
  const { slug } = await params;
  const procedure = getProcedure(slug);

  if (!procedure) notFound();

  const related = getProceduresByCategory(procedure.category)
    .filter((item) => item.slug !== procedure.slug)
    .slice(0, 3);

  const relatedResults = getResultsForProcedure(procedure.slug);

  return (
    <>
      <ViewTracker
        event={ANALYTICS_EVENTS.procedureView}
        payload={{ procedure: procedure.slug }}
      />

      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Inicio', path: '/' },
          { name: 'Procedimientos', path: '/procedimientos' },
          { name: procedure.name, path: `/procedimientos/${procedure.slug}` },
        ])}
      />

      <PageHero
        eyebrow={`${categoryLabels[procedure.category]} · Procedimiento`}
        title={procedure.name}
        lead={procedure.tagline}
      >
        <CtaLink
          href={`${PRIMARY_CTA.href}?procedimiento=${procedure.slug}`}
          size="lg"
          event={ANALYTICS_EVENTS.ctaValoracion}
          analytics={{ location: 'hero_procedimiento', procedure: procedure.slug }}
        >
          {PRIMARY_CTA.label}
        </CtaLink>
      </PageHero>

      {/* Introducción + objetivo -------------------------------------------- */}
      <Section tone="bone" aria-labelledby="intro-title">
        <Container width="wide">
          <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
            <Reveal>
              <SectionHeading
                id="intro-title"
                eyebrow="Introducción"
                title="En qué consiste"
              />
              <p className="mt-8 text-base leading-relaxed sm:text-lg">
                {procedure.intro}
              </p>

              <div className="border-line mt-10 border-t pt-8">
                <h3 className="text-fg-subtle text-[0.625rem] tracking-eyebrow uppercase">
                  Objetivo del procedimiento
                </h3>
                <p className="mt-3 text-sm leading-relaxed sm:text-base">
                  <Value value={procedure.objective} />
                </p>
              </div>

              {procedure.alsoKnownAs.length > 0 && (
                <p className="text-fg-subtle mt-8 text-xs">
                  También conocido como: {procedure.alsoKnownAs.join(' · ')}
                </p>
              )}
            </Reveal>

            <Reveal delay={120}>
              <MediaFrame
                pendingLabel={`Fotografía editorial · ${procedure.name}`}
                ratio="portrait"
                sizes="(min-width: 1024px) 40vw, 100vw"
              />
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* Candidato ideal + enfoque TAMEZ ------------------------------------ */}
      <Section tone="petrol" aria-labelledby="candidato-title">
        <Container width="wide">
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
            <div>
              <SectionHeading
                id="candidato-title"
                eyebrow="Candidato ideal"
                title="Para quién está indicado"
              />
              <ul className="mt-10 space-y-5">
                {procedure.idealCandidate.map((item) => (
                  <li key={item} className="border-line border-t pt-5 text-sm leading-relaxed">
                    {isPending(item) ? <Pending>{item}</Pending> : item}
                  </li>
                ))}
              </ul>
              <p className="text-fg-subtle mt-8 text-xs leading-relaxed">
                La candidatura sólo puede determinarse en una valoración presencial.
              </p>
            </div>

            <div>
              <SectionHeading eyebrow="Enfoque TAMEZ" title="Cómo lo abordamos" />
              <ol className="mt-10 space-y-8">
                {procedure.approach.map((item, index) => (
                  <li key={item} className="flex gap-6">
                    <span className="font-display text-fg-subtle text-2xl leading-none font-light">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <p className="text-fg-muted text-sm leading-relaxed">{item}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* CTA intermedio obligatorio (brief §5). */}
          <div className="border-line mt-20 flex flex-col items-start gap-6 border-t pt-10 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-display text-fg max-w-md text-xl font-light sm:text-2xl">
              ¿Quieres saber si {procedure.name.toLowerCase()} es lo que tu caso
              necesita?
            </p>
            <CtaLink
              href={`${PRIMARY_CTA.href}?procedimiento=${procedure.slug}`}
              event={ANALYTICS_EVENTS.ctaValoracion}
              analytics={{ location: 'cta_intermedio', procedure: procedure.slug }}
              className="shrink-0"
            >
              {PRIMARY_CTA.label}
            </CtaLink>
          </div>
        </Container>
      </Section>

      {/* Recuperación ------------------------------------------------------- */}
      <Section tone="deep" size="compact" aria-labelledby="recuperacion-title">
        <Container width="default">
          <SectionHeading
            id="recuperacion-title"
            eyebrow="Recuperación"
            title="Qué esperar después"
          />
          <p className="mt-8 max-w-2xl text-sm leading-relaxed sm:text-base">
            <Value value={procedure.recovery} />
          </p>
          <p className="text-fg-subtle mt-6 max-w-2xl text-xs leading-relaxed">
            Los tiempos y cuidados varían en cada paciente y se indican de forma
            individual. Esta sección no sustituye una consulta médica.
          </p>
        </Container>
      </Section>

      {/* Resultados relacionados -------------------------------------------- */}
      <Section tone="bone" aria-labelledby="resultados-proc-title">
        <Container width="wide">
          <SectionHeading
            id="resultados-proc-title"
            eyebrow="Resultados relacionados"
            title={`Casos de ${procedure.name.toLowerCase()}`}
          />
          <div className="mt-14">
            <ResultsGrid results={relatedResults} columns={3} />
          </div>
          <p className="text-fg-subtle mt-8 max-w-2xl text-xs leading-relaxed">
            {siteConfig.legal.resultsDisclaimer}
          </p>
        </Container>
      </Section>

      <FaqSection
        items={procedure.faqs}
        tone="petrol"
        id="faq-procedimiento"
        title={`Preguntas sobre ${procedure.name.toLowerCase()}`}
      />

      {/* Otros procedimientos ----------------------------------------------- */}
      {related.length > 0 && (
        <Section tone="deep" size="compact" aria-labelledby="relacionados-title">
          <Container width="wide">
            <h2
              id="relacionados-title"
              className="font-display text-fg text-2xl font-light sm:text-3xl"
            >
              Otros procedimientos {categoryLabels[procedure.category].toLowerCase()}
            </h2>
            <ul className="mt-10 grid gap-6 sm:grid-cols-3">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/procedimientos/${item.slug}`}
                    className="border-line hover:border-fg/50 group block border-t pt-5 transition-colors duration-300"
                  >
                    <span className="font-display text-fg block text-xl font-light">
                      {item.name}
                    </span>
                    <span className="text-fg-muted mt-2 block text-sm leading-relaxed">
                      {item.tagline}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}

      <FinalCta
        eyebrow="Valoración"
        title="Comienza con una valoración personalizada."
        body={`Revisamos tu caso y te explicamos, sin presión, si ${procedure.name.toLowerCase()} es la mejor alternativa para ti.`}
        location="cta_final_procedimiento"
        procedure={procedure.slug}
      />
    </>
  );
}
