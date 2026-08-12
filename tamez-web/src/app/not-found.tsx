import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { CtaLink } from '@/components/ui/CtaLink';

export default function NotFound() {
  return (
    <Section tone="petrol" size="large" className="pt-40">
      <Container width="narrow" className="text-center">
        <Eyebrow>Error 404</Eyebrow>
        <h1 className="font-display text-fg mt-6 text-[2.5rem] font-light sm:text-6xl">
          Esta página no existe.
        </h1>
        <p className="text-fg-muted mx-auto mt-6 max-w-md text-base leading-relaxed">
          Es posible que el enlace haya cambiado. Puedes volver al inicio o explorar
          los procedimientos.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <CtaLink href="/">Volver al inicio</CtaLink>
          <CtaLink href="/procedimientos" variant="quiet">
            Ver procedimientos
          </CtaLink>
        </div>
      </Container>
    </Section>
  );
}
