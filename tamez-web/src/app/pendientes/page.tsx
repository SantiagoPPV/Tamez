import type { Metadata } from 'next';
import { PageHero } from '@/components/layout/PageHero';
import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { buildMetadata } from '@/lib/seo';
import { collectPending, dedupePending } from '@/lib/pending-audit';
import { siteConfig } from '@/content/site';
import { procedures } from '@/content/procedures';
import * as homeContent from '@/content/home';
import { resultsPendingLabel } from '@/content/results';

export const metadata: Metadata = buildMetadata({
  title: 'Material pendiente',
  description: 'Página interna de control del contenido pendiente de entrega.',
  path: '/pendientes',
  noIndex: true,
});

/**
 * Página interna de control (no indexada, excluida del sitemap y de robots).
 *
 * Genera la lista de §19 del brief —"información pendiente que deberá
 * entregar el cliente"— leyendo los marcadores reales del contenido. Si
 * alguien rellena un dato en `content/`, desaparece de esta lista sola.
 */

const groups = [
  {
    title: 'Datos institucionales y de contacto',
    source: 'src/content/site.ts',
    entries: dedupePending(collectPending(siteConfig)),
  },
  {
    title: 'Portada',
    source: 'src/content/home.ts',
    entries: dedupePending(collectPending(homeContent)),
  },
  {
    title: 'Contenido médico de procedimientos',
    source: 'src/content/procedures.ts',
    entries: dedupePending(collectPending(procedures)),
  },
  {
    title: 'Resultados',
    source: 'src/content/results.ts',
    entries: dedupePending(collectPending({ resultsPendingLabel })),
  },
];

const assets = [
  'Logotipo y monograma finales en vector (SVG/AI).',
  'Paleta HEX/RGB definitiva y familias tipográficas con sus licencias.',
  'Fotografía real del doctor, consultorio y material editorial.',
  'Casos antes/después con consentimiento firmado.',
  'Testimonios autorizados, si se utilizarán.',
  'Aviso de privacidad y textos legales aplicables.',
  'ID de Google Analytics y acceso a Search Console.',
];

export default function PendingPage() {
  const total = groups.reduce((sum, group) => sum + group.entries.length, 0);

  return (
    <>
      <PageHero
        eyebrow="Uso interno"
        title="Material pendiente"
        lead={`${total} marcadores activos en el contenido. Esta página no está indexada y debe retirarse antes del lanzamiento definitivo.`}
      />

      <Section tone="sand">
        <Container width="default">
          <div className="space-y-16">
            {groups.map((group) => (
              <section key={group.title}>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-display text-fg text-2xl font-light sm:text-3xl">
                    {group.title}
                  </h2>
                  <code className="text-fg-subtle text-xs">{group.source}</code>
                </div>

                {group.entries.length === 0 ? (
                  <p className="text-fg-muted mt-5 text-sm">
                    Sin marcadores pendientes.
                  </p>
                ) : (
                  <ul className="border-line mt-6 border-t">
                    {group.entries.map((entry) => (
                      <li
                        key={`${group.title}-${entry.path}`}
                        className="border-line flex flex-col gap-1 border-b py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                      >
                        <span className="text-sm">{entry.label}</span>
                        <code className="text-fg-subtle shrink-0 text-xs">
                          {entry.path}
                        </code>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <section>
              <Eyebrow>Archivos</Eyebrow>
              <h2 className="font-display text-fg mt-4 text-2xl font-light sm:text-3xl">
                Material a entregar
              </h2>
              <ul className="border-line mt-6 border-t">
                {assets.map((asset) => (
                  <li key={asset} className="border-line border-b py-4 text-sm">
                    {asset}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </Container>
      </Section>
    </>
  );
}
