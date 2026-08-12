/**
 * Inyecta datos estructurados. Se serializa con `JSON.stringify` y se escapa
 * `<` para impedir que un valor de contenido cierre la etiqueta <script>.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      // El contenido proviene de nuestro propio catálogo, no de entrada de usuario.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
