import { Section, type Tone } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Faq, type FaqEntry } from '@/components/ui/Faq';

/** Bloque de preguntas frecuentes, reutilizado en portada y procedimientos. */
export function FaqSection({
  items,
  eyebrow = 'Preguntas frecuentes',
  title = 'Antes de dar el siguiente paso.',
  tone = 'bone',
  id = 'faq',
}: {
  items: readonly FaqEntry[];
  eyebrow?: string;
  title?: string;
  tone?: Tone;
  id?: string;
}) {
  if (items.length === 0) return null;

  return (
    <Section tone={tone} id={id} aria-labelledby={`${id}-title`}>
      <Container width="default">
        <SectionHeading id={`${id}-title`} eyebrow={eyebrow} title={title} />
        <div className="mt-14">
          <Faq items={items} />
        </div>
      </Container>
    </Section>
  );
}
