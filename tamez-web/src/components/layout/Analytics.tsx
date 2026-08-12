import Script from 'next/script';
import { siteConfig } from '@/content/site';

/**
 * Carga de Google Analytics (brief §14).
 *
 * Sólo se inyecta si existe `NEXT_PUBLIC_GA_MEASUREMENT_ID`, con la cuenta del
 * cliente. Sin ID configurado no se carga ningún script de terceros, lo que
 * mantiene la portada limpia de JavaScript externo.
 *
 * `anonymize_ip` activado y sin envío automático de datos de formulario.
 */
export function Analytics() {
  const measurementId = siteConfig.analytics.gaMeasurementId;
  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            anonymize_ip: true,
            allow_google_signals: false
          });
        `}
      </Script>
    </>
  );
}
