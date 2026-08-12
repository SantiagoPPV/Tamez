import type { Metadata } from 'next';
import { PageHero } from '@/components/layout/PageHero';
import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { ResultsGrid } from '@/components/results/ResultsGrid';
import { ResultsFilter } from '@/components/results/ResultsFilter';
import { FinalCta } from '@/components/sections/FinalCta';
import { JsonLd } from '@/components/ui/JsonLd';
import { ViewTracker } from '@/components/analytics/ViewTracker';
import { buildMetadata, buildBreadcrumbJsonLd } from '@/lib/seo';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import { getPublishableResults } from '@/content/results';
import { siteConfig } from '@/content/site';

export const metadata: Metadata = buildMetadata({
  title: 'Resultados',
  description:
    'Galería de casos reales autorizados. Los resultados varían entre pacientes y se presentan con consentimiento del paciente.',
  path: '/resultados',
});

/**
 * Galería de resultados (brief §4.4).
 *
 * El filtro por procedimiento sólo aparece cuando hay volumen suficiente
 * (más de un procedimiento representado); con pocos casos, un filtro vacío
 * resta más de lo que aporta.
 */
export default function ResultsPage() {
  const results = getPublishableResults();
  const distinctProcedures = new Set(results.map((item) => item.procedureSlug));
  const showFilter = results.length >= 6 && distinctProcedures.size > 1;

  return (
    <>
      <ViewTracker event={ANALYTICS_EVENTS.resultsView} payload={{ page: '/resultados' }} />

      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Inicio', path: '/' },
          { name: 'Resultados', path: '/resultados' },
        ])}
      />

      <PageHero
        eyebrow="Resultados"
        title="Casos reales, presentación sobria."
        lead="Cada caso se publica con consentimiento del paciente y con la misma iluminación, encuadre y distancia en el antes y el después."
      />

      <Section tone="bone">
        <Container width="wide">
          {showFilter ? (
            <ResultsFilter results={results} />
          ) : (
            <ResultsGrid results={results} columns={3} />
          )}

          <div className="border-line mt-16 border-t pt-8">
            <p className="text-fg-subtle max-w-2xl text-xs leading-relaxed">
              {siteConfig.legal.resultsDisclaimer}
            </p>
            <p className="text-fg-subtle mt-3 max-w-2xl text-xs leading-relaxed">
              Las imágenes no han sido retocadas para modificar el resultado
              quirúrgico y no se utiliza material generado por inteligencia
              artificial en esta sección.
            </p>
          </div>
        </Container>
      </Section>

      <FinalCta
        eyebrow="Tu caso"
        title="Cada resultado empieza por una valoración."
        body="Los casos publicados no predicen tu resultado. La única manera de saber qué es posible en tu caso es una valoración individual."
        location="cta_final_resultados"
      />
    </>
  );
}
