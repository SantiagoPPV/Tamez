import type { Metadata } from 'next';
import { PageHero } from '@/components/layout/PageHero';
import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Reveal } from '@/components/ui/Reveal';
import { ProcedureCard } from '@/components/cards/ProcedureCard';
import { FinalCta } from '@/components/sections/FinalCta';
import { JsonLd } from '@/components/ui/JsonLd';
import { buildMetadata, buildBreadcrumbJsonLd } from '@/lib/seo';
import {
  procedureCategories,
  categoryLabels,
  categoryIntros,
  getProceduresByCategory,
} from '@/content/procedures';

export const metadata: Metadata = buildMetadata({
  title: 'Procedimientos',
  description:
    'Cirugía facial, mamaria y corporal con enfoque en proporción y resultados naturales. Conoce los procedimientos del Dr. Tamez.',
  path: '/procedimientos',
});

/** Índice de procedimientos organizado por categoría (brief §4.3). */
export default function ProceduresIndexPage() {
  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Inicio', path: '/' },
          { name: 'Procedimientos', path: '/procedimientos' },
        ])}
      />

      <PageHero
        eyebrow="Procedimientos"
        title="Cirugía facial, mamaria y corporal."
        lead="Cada procedimiento se explica con el mismo criterio con el que se planea: sin promesas, sin cifras y sin atajos."
      />

      {procedureCategories.map((category, index) => {
        const items = getProceduresByCategory(category);
        if (items.length === 0) return null;

        return (
          <Section
            key={category}
            tone={index % 2 === 0 ? 'bone' : 'petrol'}
            id={category}
            aria-labelledby={`${category}-title`}
          >
            <Container width="wide">
              <div className="max-w-2xl">
                <Eyebrow>{`0${index + 1}`}</Eyebrow>
                <h2
                  id={`${category}-title`}
                  className="font-display text-fg mt-4 text-3xl font-light sm:text-4xl"
                >
                  {categoryLabels[category]}
                </h2>
                <p className="text-fg-muted mt-5 text-base leading-relaxed">
                  {categoryIntros[category]}
                </p>
              </div>

              <ul className="mt-14 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((procedure, cardIndex) => (
                  <Reveal as="li" key={procedure.slug} delay={cardIndex * 80}>
                    <ProcedureCard procedure={procedure} />
                  </Reveal>
                ))}
              </ul>
            </Container>
          </Section>
        );
      })}

      <FinalCta
        eyebrow="¿No sabes cuál es tu caso?"
        title="Empecemos por una valoración."
        body="Si aún no tienes claro qué procedimiento necesitas, la valoración es exactamente el lugar para resolverlo."
        location="cta_final_procedimientos"
      />
    </>
  );
}
