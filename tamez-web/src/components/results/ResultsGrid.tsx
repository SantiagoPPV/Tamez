import Link from 'next/link';
import { MediaFrame } from '@/components/ui/MediaFrame';
import { Pending } from '@/components/ui/Pending';
import { getProcedure } from '@/content/procedures';
import { resultsPendingLabel, type ResultCase } from '@/content/results';
import { cn } from '@/lib/utils';

/**
 * Rejilla de casos antes/después.
 *
 * Si no hay casos autorizados todavía, se muestra un estado vacío explícito
 * en lugar de imágenes de relleno: el brief prohíbe usar material generado
 * por IA o stock como si fuera un resultado clínico (§4.4, §7).
 */
export function ResultsGrid({
  results,
  columns = 3,
}: {
  results: readonly ResultCase[];
  columns?: 2 | 3 | 4;
}) {
  if (results.length === 0) {
    return <EmptyResults />;
  }

  const gridColumns = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }[columns];

  return (
    <ul className={cn('grid gap-x-8 gap-y-14', gridColumns)}>
      {results.map((item) => {
        const procedure = getProcedure(item.procedureSlug);

        return (
          <li key={item.id}>
            <article>
              <div className="grid grid-cols-2 gap-1">
                <figure>
                  <MediaFrame
                    src={item.before.src}
                    alt={item.before.alt}
                    pendingLabel="Antes"
                    ratio="portrait"
                    sizes="(min-width: 1024px) 15vw, 45vw"
                  />
                  <figcaption className="text-fg-subtle mt-2 text-[0.625rem] tracking-eyebrow uppercase">
                    Antes
                  </figcaption>
                </figure>
                <figure>
                  <MediaFrame
                    src={item.after.src}
                    alt={item.after.alt}
                    pendingLabel="Después"
                    ratio="portrait"
                    sizes="(min-width: 1024px) 15vw, 45vw"
                  />
                  <figcaption className="text-fg-subtle mt-2 text-[0.625rem] tracking-eyebrow uppercase">
                    Después
                  </figcaption>
                </figure>
              </div>

              <p className="text-fg mt-5 text-sm">{item.caption}</p>

              {procedure && (
                <Link
                  href={`/procedimientos/${procedure.slug}`}
                  className="text-fg-muted hover:text-fg mt-3 inline-block text-[0.6875rem] tracking-eyebrow uppercase underline underline-offset-4 transition-colors duration-300"
                >
                  {procedure.name}
                </Link>
              )}
            </article>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyResults() {
  return (
    <div className="border-line border py-16 text-center sm:py-20">
      <span
        aria-hidden="true"
        className="font-display text-fg-subtle block text-4xl leading-none font-light"
      >
        T
      </span>
      <p className="text-fg mt-6 text-sm">
        La galería se publicará con material clínico autorizado.
      </p>
      <p className="mt-3 text-xs">
        <Pending>{resultsPendingLabel}</Pending>
      </p>
      <p className="text-fg-subtle mx-auto mt-6 max-w-md px-6 text-xs leading-relaxed">
        No se utilizan imágenes generadas por inteligencia artificial ni fotografía
        de banco para representar resultados.
      </p>
    </div>
  );
}
