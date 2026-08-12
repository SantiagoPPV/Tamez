import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';

/**
 * Encabezado de página interior. Deja aire suficiente bajo el header fijo y
 * mantiene un único H1 por página (brief §9).
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section
      data-tone="petrol"
      className="bg-surface text-fg pt-32 pb-16 sm:pt-40 sm:pb-20"
    >
      <Container width="wide">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="font-display text-fg mt-6 max-w-3xl text-[2.5rem] leading-[1.05] font-light sm:text-6xl lg:text-7xl">
          {title}
        </h1>
        {lead && (
          <div className="text-fg-muted mt-7 max-w-xl text-base leading-relaxed sm:text-lg">
            {lead}
          </div>
        )}
        {children && <div className="mt-10">{children}</div>}
      </Container>
    </section>
  );
}
