import type { Metadata } from 'next';
import { PageHero } from '@/components/layout/PageHero';
import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { MediaFrame } from '@/components/ui/MediaFrame';
import { Value, Pending } from '@/components/ui/Pending';
import { Reveal } from '@/components/ui/Reveal';
import { CtaLink } from '@/components/ui/CtaLink';
import { FinalCta } from '@/components/sections/FinalCta';
import { JsonLd } from '@/components/ui/JsonLd';
import { buildMetadata, buildBreadcrumbJsonLd } from '@/lib/seo';
import { siteConfig, pending, PRIMARY_CTA } from '@/content/site';
import { philosophy } from '@/content/home';
import { ANALYTICS_EVENTS } from '@/lib/analytics';

export const metadata: Metadata = buildMetadata({
  title: 'Dr. Tamez — Cirujano plástico',
  description:
    'Conoce la trayectoria, formación y filosofía quirúrgica del Dr. Tamez. Solicita una valoración personalizada.',
  path: '/dr-tamez',
});

/**
 * Página del cirujano (brief §4.2).
 *
 * Nada de currículum inventado: biografía, formación, certificaciones y
 * asociaciones se muestran como marcadores hasta que el cliente entregue la
 * información verificada.
 */

const biography = [
  pending('biografía breve y narrativa aprobada por el doctor'),
  pending('trayectoria profesional verificable'),
];

const credentials = [
  { label: 'Formación', value: pending('universidad y posgrado') },
  { label: 'Especialidad', value: pending('especialidad y sede de formación') },
  { label: 'Certificación', value: pending('consejo certificador y vigencia') },
  { label: 'Cédula profesional', value: pending('número de cédula') },
  { label: 'Asociaciones', value: pending('asociaciones médicas verificadas') },
  { label: 'Hospitales', value: pending('instituciones con autorización de uso') },
];

export default function DoctorPage() {
  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Inicio', path: '/' },
          { name: 'Dr. Tamez', path: '/dr-tamez' },
        ])}
      />

      <PageHero
        eyebrow="El cirujano"
        title="Dr. Tamez"
        lead="Un enfoque construido sobre precisión técnica, proporción y respeto por la identidad de cada paciente."
      >
        <CtaLink
          href={PRIMARY_CTA.href}
          size="lg"
          event={ANALYTICS_EVENTS.ctaValoracion}
          analytics={{ location: 'hero_doctor' }}
        >
          Solicitar valoración con el Dr. Tamez
        </CtaLink>
      </PageHero>

      <Section tone="sand" aria-labelledby="bio-title">
        <Container width="wide">
          <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <Reveal>
              <MediaFrame
                pendingLabel={siteConfig.doctor.portrait}
                ratio="portrait"
                sizes="(min-width: 1024px) 40vw, 100vw"
              />
              <p className="text-fg-subtle mt-4 text-xs leading-relaxed">
                Retrato profesional real. No se utilizan imágenes generadas por
                inteligencia artificial para representar al médico.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <SectionHeading
                id="bio-title"
                eyebrow="Perfil"
                title={<Value value={siteConfig.doctor.name} />}
              />

              <div className="mt-8 space-y-5">
                {biography.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-relaxed sm:text-base">
                    <Pending>{paragraph}</Pending>
                  </p>
                ))}
              </div>

              <dl className="mt-12 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                {credentials.map((item) => (
                  <div key={item.label} className="border-line border-t pt-4">
                    <dt className="text-fg-subtle text-[0.625rem] tracking-eyebrow uppercase">
                      {item.label}
                    </dt>
                    <dd className="mt-2 text-sm">
                      <Value value={item.value} />
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="text-fg-subtle mt-8 text-xs leading-relaxed">
                Ninguna credencial, certificación o afiliación se publicará sin
                documento verificable y autorización expresa.
              </p>
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section tone="forest" aria-labelledby="filosofia-doctor-title">
        <Container width="wide">
          <SectionHeading
            id="filosofia-doctor-title"
            eyebrow="Filosofía quirúrgica"
            title="Resultados naturales como criterio, no como promesa."
            lead="El objetivo de cada intervención es la coherencia: que el resultado pertenezca al rostro o al cuerpo en el que está, y no al revés."
          />

          <ul className="mt-16 grid gap-10 md:grid-cols-3">
            {philosophy.pillars.map((pillar, index) => (
              <Reveal as="li" key={pillar.title} delay={index * 100}>
                <div className="border-line border-t pt-6">
                  <h3 className="font-display text-fg text-2xl font-light">
                    {pillar.title}
                  </h3>
                  <p className="text-fg-muted mt-4 text-sm leading-relaxed">
                    {pillar.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </Container>
      </Section>

      <FinalCta
        eyebrow="Valoración"
        title="Solicita una valoración con el Dr. Tamez."
        body="Una conversación directa para revisar tu caso y explicarte con claridad las alternativas."
        location="cta_final_doctor"
      />
    </>
  );
}
