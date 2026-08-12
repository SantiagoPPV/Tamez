import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Nunito_Sans } from 'next/font/google';
import './globals.css';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { StickyMobileCta } from '@/components/layout/StickyMobileCta';
import { Analytics } from '@/components/layout/Analytics';
import { JsonLd } from '@/components/ui/JsonLd';
import { buildOrganizationJsonLd } from '@/lib/seo';
import { siteConfig } from '@/content/site';
import { localeTags, defaultLocale } from '@/i18n/config';

/**
 * Tipografías del Brand Book (ver docs/MARCA.md).
 *
 * PRINCIPAL — Cormorant Garamond. Es la del manual, es libre (SIL OFL) y se
 * sirve desde aquí. Títulos y logotipo.
 *
 * SECUNDARIA — Avenir LT Std. De licencia comercial (Linotype): no puede
 * distribuirse desde este repositorio y no está en Google Fonts. Mientras el
 * cliente no entregue los archivos con licencia se usa Nunito Sans, que
 * comparte el esqueleto geométrico de Avenir, la 'a' de doble piso, la 'g'
 * de un piso y una altura de x similar.
 *
 * PARA ACTIVAR AVENIR REAL (3 pasos, sin tocar nada más):
 *   1. Copiar los .woff2 con licencia a `src/fonts/`.
 *   2. Sustituir el bloque `Nunito_Sans({…})` por:
 *
 *        import localFont from 'next/font/local';
 *        const avenir = localFont({
 *          src: [
 *            { path: '../fonts/AvenirLTStd-Light.woff2',  weight: '300', style: 'normal' },
 *            { path: '../fonts/AvenirLTStd-Book.woff2',   weight: '400', style: 'normal' },
 *            { path: '../fonts/AvenirLTStd-Medium.woff2', weight: '500', style: 'normal' },
 *          ],
 *          variable: '--font-avenir-fallback',
 *          display: 'swap',
 *        });
 *
 *   3. Cambiar `nunito.variable` por `avenir.variable` en el <html>.
 *
 * La variable CSS no cambia de nombre, así que `--font-sans` y todo el resto
 * del sitio siguen igual.
 */
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const nunito = Nunito_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-avenir-fallback',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  formatDetection: { telephone: false, address: false, email: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#33464e', // PANTONE 7545 C
  colorScheme: 'dark light',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang={localeTags[defaultLocale]}
      className={`${cormorant.variable} ${nunito.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh antialiased">
        <a
          href="#contenido"
          className="bg-sand text-forest sr-only z-[60] px-6 py-3 text-sm focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
        >
          Saltar al contenido
        </a>

        <Header />

        {/* pb-20 en móvil deja espacio para la barra de CTA fija. */}
        <main id="contenido" className="pb-20 lg:pb-0">
          {children}
        </main>

        <Footer />
        <StickyMobileCta />

        <JsonLd data={buildOrganizationJsonLd()} />
        <Analytics />
      </body>
    </html>
  );
}
