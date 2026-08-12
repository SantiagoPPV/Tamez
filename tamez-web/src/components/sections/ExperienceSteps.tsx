import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/ui/Reveal';
import { Value } from '@/components/ui/Pending';
import { experience } from '@/content/home';
import { isPending } from '@/content/site';

/**
 * Experiencia TAMEZ (brief §4.1): atención, planeación y seguimiento.
 * El paso clínico permanece como marcador: no se inventan procesos médicos.
 */
export function ExperienceSteps() {
  return (
    <Section tone="forest" aria-labelledby="experiencia-title">
      <Container width="wide">
        <SectionHeading
          id="experiencia-title"
          eyebrow={experience.eyebrow}
          title={experience.title}
        />

        <ol className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {experience.steps.map((item, index) => (
            <Reveal as="li" key={item.step} delay={index * 90}>
              <div className="border-line border-t pt-6">
                <span className="font-display text-fg-subtle block text-3xl leading-none font-light">
                  {item.step}
                </span>
                <h3 className="font-display text-fg mt-5 text-xl font-light">
                  {item.title}
                </h3>
                <p className="text-fg-muted mt-3 text-sm leading-relaxed">
                  {isPending(item.body) ? <Value value={item.body} /> : item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
