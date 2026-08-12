import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Contenedor de imagen con relación de aspecto fija.
 *
 * Si `src` sigue pendiente (brief §12/§19: el cliente aún no entrega la
 * fotografía real), no se inventa una imagen ni se usa stock: se muestra un
 * marcador editorial con el monograma y la descripción de lo que falta.
 * Así el layout es el definitivo y el hueco es evidente.
 */

export type AspectRatio = 'portrait' | 'square' | 'landscape' | 'editorial' | 'wide';

const ratios: Record<AspectRatio, string> = {
  portrait: 'aspect-[3/4]',
  square: 'aspect-square',
  landscape: 'aspect-[4/3]',
  editorial: 'aspect-[4/5]',
  wide: 'aspect-[16/9]',
};

export interface MediaFrameProps {
  /** Ruta de la imagen real. Omitir mientras esté pendiente. */
  src?: string;
  /** Texto alternativo descriptivo (brief §9). Obligatorio si hay `src`. */
  alt?: string;
  /** Qué material falta; se muestra dentro del marcador. */
  pendingLabel: string;
  ratio?: AspectRatio;
  /** `true` sólo para imágenes del primer viewport. */
  priority?: boolean;
  sizes?: string;
  className?: string;
}

export function MediaFrame({
  src,
  alt,
  pendingLabel,
  ratio = 'portrait',
  priority = false,
  sizes = '(min-width: 1024px) 33vw, 100vw',
  className,
}: MediaFrameProps) {
  const shell = cn('relative overflow-hidden bg-surface-2', ratios[ratio], className);

  if (src) {
    return (
      <div className={shell}>
        <Image
          src={src}
          alt={alt ?? ''}
          fill
          sizes={sizes}
          priority={priority}
          // Brief §10: carga diferida fuera del primer viewport.
          loading={priority ? 'eager' : 'lazy'}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(shell, 'border-line flex items-center justify-center border')}
      role="img"
      aria-label={`Espacio reservado para imagen: ${pendingLabel}`}
    >
      <div className="px-6 text-center">
        <span
          aria-hidden="true"
          className="font-display text-fg-subtle block text-3xl leading-none font-light"
        >
          T
        </span>
        <span className="text-fg-subtle mt-3 block text-[0.625rem] leading-relaxed tracking-eyebrow uppercase">
          {pendingLabel}
        </span>
      </div>
    </div>
  );
}
