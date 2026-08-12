'use client';

import { useMemo, useState } from 'react';
import { ResultsGrid } from './ResultsGrid';
import { getProcedure } from '@/content/procedures';
import type { ResultCase } from '@/content/results';
import { cn } from '@/lib/utils';

/**
 * Filtro por procedimiento (brief §4.4: "si existe volumen suficiente").
 *
 * Se implementa con estado local en vez de query params para no provocar
 * navegaciones ni recargas: el conjunto ya está en el cliente.
 */
export function ResultsFilter({ results }: { results: readonly ResultCase[] }) {
  const [active, setActive] = useState<string>('todos');

  const options = useMemo(() => {
    const slugs = Array.from(new Set(results.map((item) => item.procedureSlug)));
    return slugs
      .map((slug) => ({ slug, name: getProcedure(slug)?.name ?? slug }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [results]);

  const filtered = useMemo(
    () =>
      active === 'todos'
        ? results
        : results.filter((item) => item.procedureSlug === active),
    [results, active],
  );

  return (
    <div>
      <div role="group" aria-label="Filtrar resultados por procedimiento">
        <ul className="flex flex-wrap gap-3">
          <li>
            <FilterButton
              active={active === 'todos'}
              onClick={() => setActive('todos')}
            >
              Todos
            </FilterButton>
          </li>
          {options.map((option) => (
            <li key={option.slug}>
              <FilterButton
                active={active === option.slug}
                onClick={() => setActive(option.slug)}
              >
                {option.name}
              </FilterButton>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-14" aria-live="polite">
        <ResultsGrid results={filtered} columns={3} />
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'border px-5 py-2.5 text-[0.6875rem] tracking-eyebrow uppercase transition-colors duration-300',
        active
          ? 'border-accent bg-accent text-surface'
          : 'border-line text-fg-muted hover:border-fg/50',
      )}
    >
      {children}
    </button>
  );
}
