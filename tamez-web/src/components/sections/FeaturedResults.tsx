import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { CtaLink } from '@/components/ui/CtaLink';
import { ResultsGrid } from '@/components/results/ResultsGrid';
import { getPublishableResults } from '@/content/results';
import { siteConfig } from '@/content/site';

/** Resultados destacados en portada: 2–4 casos con enlace a la galería. */
export function FeaturedResults() {
  const featured = getPublishableResults().slice(0, 4);

  return (
    <Section tone="sand" aria-labelledby="resultados-title">
      <Container width="wide">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            id="resultados-title"
            eyebrow="Resultados"
            title="Evidencia, no promesas."
            lead="Casos reales autorizados, presentados con la misma sobriedad con la que se trabajan."
          />
          <CtaLink href="/resultados" variant="quiet" className="shrink-0">
            Ver resultados
          </CtaLink>
        </div>

        <div className="mt-16">
          <ResultsGrid results={featured} columns={4} />
        </div>

        <p className="text-fg-subtle mt-10 max-w-2xl text-xs leading-relaxed">
          {siteConfig.legal.resultsDisclaimer}
        </p>
      </Container>
    </Section>
  );
}
