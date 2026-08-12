import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/ui/Reveal';
import { philosophy } from '@/content/home';

/** Bloque de filosofía: técnica + proporción + identidad (brief §4.1). */
export function Philosophy() {
  return (
    <Section tone="sand" aria-labelledby="filosofia-title">
      <Container width="wide">
        <SectionHeading
          id="filosofia-title"
          eyebrow={philosophy.eyebrow}
          title={philosophy.title}
          align="center"
        />

        <ul className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
          {philosophy.pillars.map((pillar, index) => (
            <Reveal as="li" key={pillar.title} delay={index * 100}>
              <div className="border-line border-t pt-7">
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
  );
}
