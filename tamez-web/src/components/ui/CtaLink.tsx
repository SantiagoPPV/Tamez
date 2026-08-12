'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { track, type AnalyticsEvent, type AnalyticsPayload } from '@/lib/analytics';
import { cn } from '@/lib/utils';

export type CtaVariant = 'primary' | 'outline' | 'quiet';
export type CtaSize = 'md' | 'lg';

/**
 * Los estilos se apoyan en los tokens semánticos, así que un mismo CTA se ve
 * correcto sobre petróleo y sobre hueso sin variantes por sección.
 */
const variants: Record<CtaVariant, string> = {
  primary:
    'bg-accent text-surface hover:brightness-95 active:brightness-90 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]',
  outline: 'border border-current/35 text-fg hover:border-current/70 hover:bg-fg/5',
  quiet:
    'text-fg underline decoration-current/35 underline-offset-[6px] hover:decoration-current',
};

const sizes: Record<CtaSize, string> = {
  md: 'px-6 py-3 text-[0.8125rem]',
  lg: 'px-8 py-4 text-sm',
};

export interface CtaLinkProps {
  href: string;
  children: ReactNode;
  variant?: CtaVariant;
  size?: CtaSize;
  /** Evento de conversión a registrar al hacer clic (brief §14). */
  event?: AnalyticsEvent;
  /** Metadatos NO personales del evento. */
  analytics?: AnalyticsPayload;
  /** Abre en pestaña nueva y añade rel de seguridad. */
  external?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function CtaLink({
  href,
  children,
  variant = 'primary',
  size = 'md',
  event,
  analytics,
  external = false,
  className,
  ariaLabel,
}: CtaLinkProps) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 font-sans font-normal tracking-eyebrow uppercase transition-[filter,background-color,border-color,color] duration-300',
    variant !== 'quiet' && sizes[size],
    variants[variant],
    className,
  );

  const handleClick = () => {
    if (event) track(event, analytics);
  };

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label={ariaLabel}
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} onClick={handleClick} aria-label={ariaLabel} className={classes}>
      {children}
    </Link>
  );
}
