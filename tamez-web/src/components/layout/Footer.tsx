import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Wordmark } from '@/components/brand/Wordmark';
import { Value } from '@/components/ui/Pending';
import { ContactLinks } from '@/components/contact/ContactLinks';
import {
  siteConfig,
  primaryNav,
  footerNav,
  resolved,
  isPending,
} from '@/content/site';
import { procedures } from '@/content/procedures';

const currentYear = new Date().getFullYear();

export function Footer() {
  const socialEntries = (
    [
      ['Instagram', siteConfig.social.instagram],
      ['Facebook', siteConfig.social.facebook],
      ['TikTok', siteConfig.social.tiktok],
    ] as const
  ).filter(([, value]) => !isPending(value));

  return (
    <footer data-tone="deep" className="bg-surface text-fg">
      <Container width="wide" className="py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Wordmark variant="stacked" size="md" className="items-start" />
            <p className="text-fg-muted mt-6 max-w-xs text-sm leading-relaxed">
              {siteConfig.tagline}
            </p>
          </div>

          <nav aria-labelledby="footer-nav-sitio">
            <h2
              id="footer-nav-sitio"
              className="font-sans text-fg-subtle text-[0.6875rem] tracking-eyebrow uppercase"
            >
              Sitio
            </h2>
            <ul className="mt-5 space-y-3">
              {primaryNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-fg-muted hover:text-fg text-sm transition-colors duration-300"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-nav-procedimientos">
            <h2
              id="footer-nav-procedimientos"
              className="font-sans text-fg-subtle text-[0.6875rem] tracking-eyebrow uppercase"
            >
              Procedimientos
            </h2>
            <ul className="mt-5 space-y-3">
              {procedures.slice(0, 6).map((procedure) => (
                <li key={procedure.slug}>
                  <Link
                    href={`/procedimientos/${procedure.slug}`}
                    className="text-fg-muted hover:text-fg text-sm transition-colors duration-300"
                  >
                    {procedure.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/procedimientos"
                  className="text-fg text-sm underline underline-offset-4"
                >
                  Ver todos
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className="font-sans text-fg-subtle text-[0.6875rem] tracking-eyebrow uppercase">
              Contacto
            </h2>
            <div className="mt-5">
              <ContactLinks location="footer" />
            </div>

            <address className="text-fg-muted mt-5 space-y-1 text-sm not-italic">
              <p>
                <Value value={siteConfig.contact.addressLine} />
              </p>
              <p>
                <Value value={siteConfig.contact.city} />
              </p>
              <p>
                <Value value={siteConfig.contact.hours} />
              </p>
            </address>

            {socialEntries.length > 0 && (
              <ul className="mt-5 flex gap-5">
                {socialEntries.map(([label, href]) => (
                  <li key={label}>
                    <a
                      href={resolved(href)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fg-muted hover:text-fg text-[0.6875rem] tracking-eyebrow uppercase transition-colors duration-300"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rule mt-14" />

        <div className="text-fg-subtle mt-8 flex flex-col gap-4 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {currentYear} {siteConfig.name}. Todos los derechos reservados.
          </p>
          <ul className="flex flex-wrap gap-6">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="hover:text-fg transition-colors duration-300"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-fg-subtle mt-6 max-w-3xl text-[0.6875rem] leading-relaxed">
          {siteConfig.legal.resultsDisclaimer}
        </p>
      </Container>
    </footer>
  );
}
