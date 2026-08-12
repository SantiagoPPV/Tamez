import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Logotipo TAMEZ.
 *
 * [PENDIENTE: logotipo y monograma finales en vector (SVG) del Brand Book]
 *
 * Mientras llega el vector, el logotipo se compone tipográficamente con la
 * serif editorial de alto contraste y el tracking del brand book. Al recibir
 * el SVG, basta sustituir el interior de este componente: la API
 * (`variant`, `size`, `asLink`) no cambia y el resto del sitio no se toca.
 */

type WordmarkVariant = 'horizontal' | 'stacked' | 'monogram';
type WordmarkSize = 'sm' | 'md' | 'lg' | 'xl';

const wordSizes: Record<WordmarkSize, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl sm:text-5xl',
  xl: 'text-5xl sm:text-7xl lg:text-8xl',
};

const subSizes: Record<WordmarkSize, string> = {
  sm: 'text-[0.4375rem]',
  md: 'text-[0.5rem]',
  lg: 'text-[0.625rem]',
  xl: 'text-[0.6875rem] sm:text-xs',
};

function Mark({
  variant,
  size,
}: {
  variant: WordmarkVariant;
  size: WordmarkSize;
}) {
  const word = (
    <span
      className={cn(
        'font-display leading-none font-light tracking-wordmark',
        wordSizes[size],
      )}
    >
      TAMEZ
    </span>
  );

  const sub = (
    <span
      className={cn(
        'font-sans leading-[1.5] font-light tracking-eyebrow uppercase',
        subSizes[size],
      )}
    >
      Plastic
      <br />
      Surgery
    </span>
  );

  if (variant === 'monogram') {
    return (
      <span
        className={cn('font-display leading-none font-light', wordSizes[size])}
        aria-hidden="true"
      >
        T
      </span>
    );
  }

  if (variant === 'stacked') {
    return (
      <span className="flex flex-col items-center">
        {word}
        <span
          className={cn(
            'font-sans mt-1 leading-none font-light tracking-eyebrow uppercase',
            subSizes[size],
          )}
        >
          Plastic Surgery
        </span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-3 sm:gap-4">
      {word}
      <span className="bg-current/45 h-[1.6em] w-px self-center" aria-hidden="true" />
      {sub}
    </span>
  );
}

export function Wordmark({
  variant = 'horizontal',
  size = 'md',
  className,
}: {
  variant?: WordmarkVariant;
  size?: WordmarkSize;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex text-fg', className)}>
      <Mark variant={variant} size={size} />
    </span>
  );
}

/** Logotipo enlazado a la portada, con nombre accesible explícito. */
export function WordmarkLink({
  variant = 'horizontal',
  size = 'md',
  className,
}: {
  variant?: WordmarkVariant;
  size?: WordmarkSize;
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="TAMEZ Plastic Surgery — Inicio"
      className={cn(
        'text-fg inline-flex transition-opacity duration-300 hover:opacity-80',
        className,
      )}
    >
      <Mark variant={variant} size={size} />
    </Link>
  );
}
