import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Antetítulo editorial: versalitas con tracking amplio. */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'text-fg-subtle text-[0.6875rem] font-normal tracking-eyebrow uppercase',
        className,
      )}
    >
      {children}
    </p>
  );
}
