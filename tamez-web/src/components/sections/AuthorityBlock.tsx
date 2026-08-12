import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { CtaLink } from '@/components/ui/CtaLink';
import { MediaFrame } from '@/components/ui/MediaFrame';
import { Value } from '@/components/ui/Pending';
import { Reveal } from '@/components/ui/Reveal';
import { authority } from '@/content/home';
import { siteConfig } from '@/content/site';

/**
 * Bloque de autoridad (brief §4.1): introducción al doctor, retrato real y
 * credenciales verificadas. Las credenciales viajan como marcadores hasta que
 * el cliente entregue las reales — nunca se infieren.
 */
export function AuthorityBlock() {
  return (
    <Section tone="bone" aria-labelledby="autoridad-title">
      <Container width="wide">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
          <Reveal>
            <MediaFrame
              pendingLabel={siteConfig.doctor.portrait}
              ratio="editorial"
              sizes="(min-width: 1024px) 45vw, 100vw"
            />
          </Reveal>

          <Reveal delay={120}>
            <SectionHeading
              id="autoridad-title"
              eyebrow={authority.eyebrow}
              title={authority.title}
              lead={authority.body}
            />

            <dl className="mt-10 space-y-5">
              {authority.credentials.map((credential) => (
                <div key={credential} className="border-line border-t pt-5">
                  <dt className="sr-only">Credencial</dt>
                  <dd className="text-sm">
                    <Value value={credential} />
                  </dd>
                </div>
              ))}
            </dl>

            <p className="text-fg-subtle mt-6 text-xs leading-relaxed">
              Las credenciales se publicarán únicamente cuando estén verificadas y
              autorizadas.
            </p>

            <div className="mt-10">
              <CtaLink href="/dr-tamez" variant="outline">
                Conocer al Dr. Tamez
              </CtaLink>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
