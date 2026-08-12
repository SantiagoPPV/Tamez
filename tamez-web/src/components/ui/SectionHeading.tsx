import type { ReactNode } from 'react';
import { Eyebrow } from './Eyebrow';
import { cn } from '@/lib/utils';

/** Encabezado de sección: antetítulo + título editorial + entradilla. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  id,
  as: Tag = 'h2',
  align = 'left',
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  id?: string;
  as?: 'h1' | 'h2' | 'h3';
  align?: 'left' | 'center';
  className?: string;
}) {
  const sizes =
    Tag === 'h1'
      ? 'text-[2.75rem] sm:text-6xl lg:text-7xl'
      : 'text-[2rem] sm:text-4xl lg:text-[2.75rem]';

  return (
    <div
      className={cn(
        align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl',
        className,
      )}
    >
      {eyebrow && <Eyebrow className="mb-5">{eyebrow}</Eyebrow>}
      <Tag id={id} className={cn('text-fg font-light', sizes)}>
        {title}
      </Tag>
      {lead && (
        <p className="text-fg-muted mt-6 text-base leading-relaxed sm:text-lg">{lead}</p>
      )}
    </div>
  );
}
