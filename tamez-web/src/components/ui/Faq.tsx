import { Value } from './Pending';
import { isPending } from '@/content/site';

export interface FaqEntry {
  readonly question: string;
  readonly answer: string;
}

/**
 * Acordeón de preguntas frecuentes con `<details>`/`<summary>` nativos:
 * accesibles por teclado y por lector de pantalla sin una sola línea de
 * JavaScript (brief §8 y §10).
 */
export function Faq({ items }: { items: readonly FaqEntry[] }) {
  return (
    <div className="border-line border-t">
      {items.map((item) => (
        <details key={item.question} className="group border-line border-b">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 text-left [&::-webkit-details-marker]:hidden">
            <span className="font-display text-fg text-lg font-light sm:text-xl">
              {item.question}
            </span>
            <span
              aria-hidden="true"
              className="text-fg-subtle relative mt-2 h-3 w-3 shrink-0"
            >
              <span className="bg-current absolute top-1/2 left-0 h-px w-3" />
              <span className="bg-current absolute top-0 left-1/2 h-3 w-px transition-transform duration-300 group-open:scale-y-0" />
            </span>
          </summary>
          <div className="pb-7">
            <p className="text-fg-muted max-w-2xl text-sm leading-relaxed sm:text-base">
              {isPending(item.answer) ? <Value value={item.answer} /> : item.answer}
            </p>
          </div>
        </details>
      ))}
    </div>
  );
}
