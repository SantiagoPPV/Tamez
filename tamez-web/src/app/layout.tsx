import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Jost } from 'next/font/google';
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
 * Tipografías (brief §7): serif editorial de alto contraste para títulos +
 * sans geométrica limpia para información.
 *
 * [PENDIENTE: familias tipográficas y licencias definitivas del Brand Book]
 * Si la identidad final usa una fuente con licencia propia, sustituir estos
 * `next/font/google` por `next/font/local` apuntando a los archivos .woff2;
 * las variables CSS (--font-cormorant / --font-jost) no cambian.
 */
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-jost',
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
  themeColor: '#2d3e45',
  colorScheme: 'dark light',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang={localeTags[defaultLocale]}
      className={`${cormorant.variable} ${jost.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh antialiased">
        <a
          href="#contenido"
          className="bg-accent text-petrol-950 sr-only z-[60] px-6 py-3 text-sm focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
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
