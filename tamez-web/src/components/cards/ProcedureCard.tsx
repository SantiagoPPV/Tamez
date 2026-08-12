import Link from 'next/link';
import { MediaFrame } from '@/components/ui/MediaFrame';
import { categoryLabels, type Procedure } from '@/content/procedures';
import { cn } from '@/lib/utils';

/**
 * Tarjeta de procedimiento. Toda la superficie es un enlace, con el nombre
 * como texto accesible del enlace (nada de "leer más" suelto).
 */
export function ProcedureCard({
  procedure,
  className,
}: {
  procedure: Procedure;
  className?: string;
}) {
  return (
    <article className={cn('group', className)}>
      <Link
        href={`/procedimientos/${procedure.slug}`}
        className="block focus-visible:outline-offset-8"
      >
        <MediaFrame
          pendingLabel={`Fotografía editorial · ${procedure.name}`}
          ratio="editorial"
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
          className="transition-opacity duration-500 group-hover:opacity-90"
        />

        <div className="mt-6">
          <p className="text-fg-subtle text-[0.625rem] tracking-eyebrow uppercase">
            {categoryLabels[procedure.category]}
          </p>
          <h3 className="font-display text-fg mt-2 text-2xl font-light">
            {procedure.name}
          </h3>
          <p className="text-fg-muted mt-2 text-sm leading-relaxed">
            {procedure.tagline}
          </p>
          <span
            aria-hidden="true"
            className="text-fg mt-5 inline-block text-[0.6875rem] tracking-eyebrow uppercase"
          >
            Conocer el procedimiento
            <span className="bg-current mt-1 block h-px w-0 transition-[width] duration-500 group-hover:w-full" />
          </span>
        </div>
      </Link>
    </article>
  );
}
