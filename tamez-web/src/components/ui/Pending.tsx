import type { ReactNode } from 'react';
import { isPending } from '@/content/site';
import { cn } from '@/lib/utils';

/**
 * Marcador de contenido pendiente (brief §12).
 *
 * Hace visible —de forma sobria— lo que el cliente todavía debe entregar,
 * en lugar de rellenarlo por inferencia. Se distingue del texto real por el
 * subrayado punteado y el color atenuado, sin romper la estética.
 */
export function Pending({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      data-pending="true"
      title="Contenido pendiente de entrega o aprobación del cliente"
      className={cn(
        'text-fg-subtle decoration-fg-subtle/60 underline decoration-dotted underline-offset-4',
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Renderiza el valor real, o el marcador si sigue pendiente.
 * Es el componente que deben usar las plantillas para cualquier dato del
 * cliente, de modo que nunca se publique un `[PENDIENTE: …]` sin señalar.
 */
export function Value({
  value,
  className,
}: {
  value: string | undefined | null;
  className?: string;
}) {
  if (isPending(value)) {
    return <Pending className={className}>{value ?? '[PENDIENTE]'}</Pending>;
  }
  return <span className={className}>{value}</span>;
}
