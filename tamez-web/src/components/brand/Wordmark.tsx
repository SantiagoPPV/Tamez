import Link from 'next/link';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/**
 * Logotipo TAMEZ, construido según la retícula del Brand Book.
 *
 * [PENDIENTE: logotipo y monograma finales en vector (SVG) del Brand Book]
 * Mientras llega el vector, el logotipo se compone tipográficamente con
 * Cormorant Garamond. Al recibir el SVG basta sustituir el interior de
 * `<Mark>`: la API pública (`variant`, `size`, `clearSpace`) no cambia y el
 * resto del sitio no se toca.
 *
 * SISTEMA DE PROPORCIONES (docs/MARCA.md)
 * ---------------------------------------
 * La unidad base "X" es la altura total de las letras de TAMEZ, es decir su
 * altura de mayúscula. Todo lo demás se deriva de ella:
 *
 *     ancho del logotipo TAMEZ ......... 7.5 X
 *     ancho del descriptor ............. 5.2 X
 *     espacio logotipo · descriptor .... 0.5 X (filete vertical centrado)
 *     área de respeto .................. 1 X por los cuatro lados
 *
 * En código, `--x` es esa unidad y el tamaño de letra se calcula a partir de
 * ella dividiendo por la relación altura-de-mayúscula/em de cada familia.
 * Así, cambiar `size` reescala el conjunto sin romper ninguna proporción.
 */

/** Cormorant Garamond: altura de mayúscula ÷ em. Medido en navegador. */
const CAP_RATIO_DISPLAY = 0.6563;

/**
 * Tracking del logotipo: el valor que hace que la mancha de "TAMEZ" mida
 * exactamente 7.5 X. Calibrado midiendo el render, no estimado.
 * (El rango 200–400 del manual aplica a la secundaria, no al logotipo.)
 */
const WORDMARK_TRACKING = '0.4267em';

/**
 * Descriptor. Tamaños como múltiplo de X, calibrados midiendo el render.
 *
 * NOTA SOBRE EL ANCHO DE 5.2 X
 * ----------------------------
 * La lámina de construcción del manual anota 5.2 X para el descriptor. Ese
 * ancho, con el descriptor a dos líneas, produce un bloque casi tres veces
 * más alto que la altura de mayúscula de TAMEZ, y no es lo que se ve en el
 * arte entregado: en la portada del Brand Book el bloque PLASTIC / SURGERY
 * mide aproximadamente 1 X de alto y en torno a 3.2 X de ancho.
 *
 * Ante la discrepancia se ajusta al arte, que es inequívoco sobre cómo debe
 * verse el conjunto, y se deja anotada la duda: hay que confirmar la medida
 * contra el logotipo vectorial final. La versión centrada sí queda en 5.2 X,
 * donde el ancho y el arte coinciden.
 */
const DESCRIPTOR_EM = 0.5; // respecto a X — versión horizontal
const DESCRIPTOR_LINE_HEIGHT = 1.1; // dos líneas ≈ 1.1 X de alto
const DESCRIPTOR_EM_STACKED = 0.4216; // respecto a X — versión centrada (5.2 X)
const DESCRIPTOR_TRACKING = '0.24em'; // 240 unidades, dentro de 200–400

type WordmarkVariant = 'horizontal' | 'stacked' | 'monogram';
type WordmarkSize = 'sm' | 'md' | 'lg' | 'xl';

/** Valor de X (altura de mayúscula) para cada tamaño. */
const xUnit: Record<WordmarkSize, string> = {
  sm: '0.95rem',
  md: '1.25rem',
  lg: '2.2rem',
  xl: 'clamp(2.6rem, 6.2vw, 4.6rem)',
};

interface MarkProps {
  variant: WordmarkVariant;
  size: WordmarkSize;
}

function Mark({ variant, size }: MarkProps) {
  const style = { '--x': xUnit[size] } as CSSProperties;

  const word = (
    <span
      className="font-display leading-none font-light"
      style={{
        fontSize: `calc(var(--x) / ${CAP_RATIO_DISPLAY})`,
        letterSpacing: WORDMARK_TRACKING,
        // El tracking añade un hueco tras la última letra; se recorta para
        // que el borde derecho del bloque coincida con la retícula.
        marginRight: `-${WORDMARK_TRACKING}`,
      }}
    >
      TAMEZ
    </span>
  );

  if (variant === 'monogram') {
    return (
      <span
        style={{
          ...style,
          fontSize: `calc(var(--x) / ${CAP_RATIO_DISPLAY})`,
        }}
        className="font-display leading-none font-light"
      >
        T
      </span>
    );
  }

  if (variant === 'stacked') {
    return (
      <span style={style} className="flex flex-col items-center">
        {word}
        <span
          className="font-sans leading-none font-light uppercase"
          style={{
            fontSize: `calc(var(--x) * ${DESCRIPTOR_EM_STACKED})`,
            letterSpacing: DESCRIPTOR_TRACKING,
            marginTop: 'calc(var(--x) * 0.34)',
            marginRight: `-${DESCRIPTOR_TRACKING}`,
          }}
        >
          Plastic Surgery
        </span>
      </span>
    );
  }

  return (
    <span
      style={style}
      className="flex items-center"
      // gap = 0.5 X repartido a ambos lados del filete
    >
      {word}
      <span
        aria-hidden="true"
        className="bg-current/45 w-px self-center"
        style={{
          height: 'calc(var(--x) * 1.15)',
          // 0.5 X en total, descontando el grosor del propio filete.
          marginInline: 'calc((var(--x) * 0.5 - 1px) / 2)',
        }}
      />
      <span
        className="font-sans font-light uppercase"
        style={{
          fontSize: `calc(var(--x) * ${DESCRIPTOR_EM})`,
          letterSpacing: DESCRIPTOR_TRACKING,
          lineHeight: DESCRIPTOR_LINE_HEIGHT,
          // Igual que en el logotipo: se recorta el hueco sobrante que el
          // tracking añade tras la última letra de cada línea.
          marginRight: `-${DESCRIPTOR_TRACKING}`,
        }}
      >
        Plastic
        <br />
        Surgery
      </span>
    </span>
  );
}

export interface WordmarkProps {
  variant?: WordmarkVariant;
  size?: WordmarkSize;
  /** Aplica el área de respeto de 1 X exigida por el manual. */
  clearSpace?: boolean;
  className?: string;
}

export function Wordmark({
  variant = 'horizontal',
  size = 'md',
  clearSpace = false,
  className,
}: WordmarkProps) {
  return (
    <span
      className={cn('text-fg inline-flex', className)}
      style={clearSpace ? { padding: xUnit[size] } : undefined}
    >
      <Mark variant={variant} size={size} />
    </span>
  );
}

/** Logotipo enlazado a la portada, con nombre accesible explícito. */
export function WordmarkLink({
  variant = 'horizontal',
  size = 'md',
  className,
}: Omit<WordmarkProps, 'clearSpace'>) {
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
