import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type Tone = 'petrol' | 'deep' | 'bone' | 'sand';

/**
 * Bloque de página con su propio contexto de color.
 *
 * `data-tone` reasigna las variables semánticas (--surface, --fg, --line…),
 * así los hijos usan siempre `bg-surface`/`text-fg` y se adaptan solos.
 */
export function Section({
  children,
  tone = 'petrol',
  size = 'default',
  id,
  className,
  as: Tag = 'section',
  'aria-labelledby': ariaLabelledBy,
}: {
  children: ReactNode;
  tone?: Tone;
  size?: 'default' | 'large' | 'compact' | 'none';
  id?: string;
  className?: string;
  as?: 'section' | 'div' | 'footer' | 'header' | 'article';
  'aria-labelledby'?: string;
}) {
  const padding = {
    none: '',
    compact: 'py-14 sm:py-16',
    default: 'py-20 sm:py-24 lg:py-28',
    large: 'py-24 sm:py-32 lg:py-40',
  }[size];

  return (
    <Tag
      id={id}
      data-tone={tone}
      aria-labelledby={ariaLabelledBy}
      className={cn('bg-surface text-fg', padding, className)}
    >
      {children}
    </Tag>
  );
}
