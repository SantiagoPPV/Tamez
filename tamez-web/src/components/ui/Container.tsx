import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Width = 'default' | 'narrow' | 'wide' | 'prose';

const widths: Record<Width, string> = {
  narrow: 'max-w-3xl',
  prose: 'max-w-[68ch]',
  default: 'max-w-6xl',
  wide: 'max-w-[88rem]',
};

export function Container({
  children,
  width = 'default',
  className,
}: {
  children: ReactNode;
  width?: Width;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full px-6 sm:px-8 lg:px-12', widths[width], className)}>
      {children}
    </div>
  );
}
