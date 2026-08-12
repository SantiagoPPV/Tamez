import { siteConfig, resolved } from '@/content/site';
import { Pending } from '@/components/ui/Pending';

/**
 * Ubicación (brief §4.5).
 *
 * No se incrusta un iframe de mapa por defecto: cargaría scripts y cookies de
 * terceros en cada visita y penalizaría Core Web Vitals (§10). Se enlaza a
 * Google Maps. Si el cliente prefiere mapa incrustado, sustituir el enlace por
 * un `<iframe loading="lazy">` y reflejarlo en el aviso de privacidad.
 */
export function MapBlock() {
  const mapsUrl = resolved(siteConfig.contact.mapsUrl);

  return (
    <div className="border-line border-t pt-8">
      <p className="text-fg-subtle text-[0.6875rem] tracking-eyebrow uppercase">
        Ubicación
      </p>

      <div className="border-line bg-surface-2 mt-5 flex aspect-[4/3] items-center justify-center border">
        <div className="px-6 text-center">
          <span
            aria-hidden="true"
            className="font-display text-fg-subtle block text-3xl leading-none font-light"
          >
            T
          </span>
          <span className="text-fg-subtle mt-3 block text-[0.625rem] tracking-eyebrow uppercase">
            Mapa de ubicación
          </span>
        </div>
      </div>

      <p className="mt-5 text-sm">
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-fg hover:text-accent underline underline-offset-4 transition-colors duration-300"
          >
            Ver en Google Maps
          </a>
        ) : (
          <Pending>{siteConfig.contact.mapsUrl}</Pending>
        )}
      </p>
    </div>
  );
}
