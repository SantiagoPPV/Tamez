import type { Metadata } from 'next';
import { PageHero } from '@/components/layout/PageHero';
import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Value } from '@/components/ui/Pending';
import { ContactForm } from '@/components/contact/ContactForm';
import { ContactLinks } from '@/components/contact/ContactLinks';
import { MapBlock } from '@/components/contact/MapBlock';
import { JsonLd } from '@/components/ui/JsonLd';
import { buildMetadata, buildBreadcrumbJsonLd } from '@/lib/seo';
import { siteConfig } from '@/content/site';
import { procedureSlugFromSearch } from '@/lib/search-params';

export const metadata: Metadata = buildMetadata({
  title: 'Contacto',
  description:
    'Solicita una valoración con el Dr. Tamez. Formulario de contacto, WhatsApp, teléfono y ubicación.',
  path: '/contacto',
});

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Página de contacto y conversión (brief §4.5). */
export default async function ContactPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const defaultProcedure = procedureSlugFromSearch(params.procedimiento);

  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Inicio', path: '/' },
          { name: 'Contacto', path: '/contacto' },
        ])}
      />

      <PageHero
        eyebrow="Contacto"
        title="Solicita una valoración."
        lead="Cuéntanos brevemente qué te interesa y el equipo te contactará para coordinar una cita con el Dr. Tamez."
      />

      <Section tone="bone">
        <Container width="wide">
          <div className="grid gap-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-24">
            <div>
              <Eyebrow>Formulario</Eyebrow>
              <h2 className="font-display text-fg mt-4 text-3xl font-light sm:text-4xl">
                Solicitud de valoración
              </h2>
              <p className="text-fg-muted mt-5 max-w-lg text-sm leading-relaxed">
                Sólo pedimos lo necesario para poder contactarte. No solicitamos
                información médica en este formulario.
              </p>

              <div className="mt-12">
                <ContactForm
                  {...(defaultProcedure ? { defaultProcedure } : {})}
                />
              </div>
            </div>

            <aside className="lg:pt-2">
              <div className="border-line border-t pt-8">
                <Eyebrow>Contacto directo</Eyebrow>
                <div className="mt-5">
                  <ContactLinks location="contacto" />
                </div>
              </div>

              <div className="border-line mt-10 border-t pt-8">
                <Eyebrow>Consultorio</Eyebrow>
                <address className="mt-5 space-y-2 text-sm not-italic">
                  <p>
                    <Value value={siteConfig.contact.addressLine} />
                  </p>
                  <p>
                    <Value value={siteConfig.contact.city} />
                  </p>
                </address>
              </div>

              <div className="border-line mt-10 border-t pt-8">
                <Eyebrow>Horarios</Eyebrow>
                <p className="mt-5 text-sm">
                  <Value value={siteConfig.contact.hours} />
                </p>
              </div>

              <div className="mt-10">
                <MapBlock />
              </div>
            </aside>
          </div>
        </Container>
      </Section>

      <Section tone="deep" size="compact" aria-labelledby="privacidad-title">
        <Container width="default">
          <h2
            id="privacidad-title"
            className="font-display text-fg text-2xl font-light sm:text-3xl"
          >
            Privacidad
          </h2>
          <p className="text-fg-muted mt-5 max-w-2xl text-sm leading-relaxed">
            Los datos que compartes se utilizan únicamente para contactarte y
            coordinar tu valoración. No se almacena información clínica a través de
            este sitio y el contenido del formulario no se envía a herramientas de
            analítica.
          </p>
          <p className="mt-5">
            <a
              href={siteConfig.legal.privacyNoticeUrl}
              className="text-fg text-[0.6875rem] tracking-eyebrow uppercase underline underline-offset-4"
            >
              Leer el aviso de privacidad
            </a>
          </p>
        </Container>
      </Section>
    </>
  );
}
