import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { CtaLink } from '@/components/ui/CtaLink';
import { Reveal } from '@/components/ui/Reveal';
import { ProcedureCard } from '@/components/cards/ProcedureCard';
import { getFeaturedProcedures } from '@/content/procedures';

/** Procedimientos destacados: 4–6 tarjetas visuales (brief §4.1). */
export function FeaturedProcedures() {
  const featured = getFeaturedProcedures().slice(0, 6);

  return (
    <Section tone="petrol" aria-labelledby="procedimientos-title">
      <Container width="wide">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            id="procedimientos-title"
            eyebrow="Procedimientos"
            title="Un catálogo corto, un criterio largo."
            lead="Cada intervención se explica con el mismo detalle con el que se planea."
          />
          <CtaLink href="/procedimientos" variant="quiet" className="shrink-0">
            Ver todos los procedimientos
          </CtaLink>
        </div>

        <ul className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((procedure, index) => (
            <Reveal as="li" key={procedure.slug} delay={index * 80}>
              <ProcedureCard procedure={procedure} />
            </Reveal>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
