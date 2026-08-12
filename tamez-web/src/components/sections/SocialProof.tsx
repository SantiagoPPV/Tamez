import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Pending } from '@/components/ui/Pending';
import { pending } from '@/content/site';

/**
 * Señales de autoridad (brief §6).
 *
 * NO se inventan cifras, premios, años de experiencia ni testimonios. Se
 * publica la estructura y se deja explícito qué falta por verificar. Cuando
 * el cliente entregue el material aprobado, se sustituyen los marcadores por
 * los logotipos o textos reales.
 */
const signals = [
  pending('certificación del consejo mexicano de la especialidad'),
  pending('asociación médica verificada'),
  pending('hospital / institución con relación real y autorización de uso'),
  pending('testimonio real con consentimiento'),
] as const;

export function SocialProof() {
  return (
    <Section tone="petrol" size="compact" aria-labelledby="respaldo-title">
      <Container width="wide">
        <Eyebrow>Respaldo</Eyebrow>
        <h2
          id="respaldo-title"
          className="font-display text-fg mt-5 max-w-xl text-2xl font-light sm:text-3xl"
        >
          Sólo publicamos lo que se puede verificar.
        </h2>

        <ul className="mt-12 grid gap-px sm:grid-cols-2 lg:grid-cols-4">
          {signals.map((signal) => (
            <li
              key={signal}
              className="border-line flex min-h-28 items-center border p-6 text-center"
            >
              <p className="mx-auto max-w-[22ch] text-xs leading-relaxed">
                <Pending>{signal}</Pending>
              </p>
            </li>
          ))}
        </ul>

        <p className="text-fg-subtle mt-8 max-w-2xl text-xs leading-relaxed">
          No se publican cifras de cirugías, años de experiencia, calificaciones ni
          reconocimientos sin fuente verificable y autorización expresa.
        </p>
      </Container>
    </Section>
  );
}
