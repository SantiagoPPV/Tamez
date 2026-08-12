'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WordmarkLink } from '@/components/brand/Wordmark';
import { CtaLink } from '@/components/ui/CtaLink';
import { primaryNav, PRIMARY_CTA } from '@/content/site';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import { cn } from '@/lib/utils';

/**
 * Header sticky con CTA persistente (brief §5).
 *
 * En la portada arranca transparente sobre el hero y adopta fondo sólido al
 * hacer scroll; en el resto de páginas es sólido desde el inicio.
 */
export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);

  const isHome = pathname === '/';

  // Cerrar el menú al navegar. Se ajusta durante el render —el patrón que
  // recomienda React para derivar estado de un cambio de prop— en lugar de un
  // efecto: así funciona con cualquier navegación (enlace, atrás, adelante)
  // sin provocar un render en cascada.
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cerrar con Escape y bloquear el scroll de fondo mientras está abierto.
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const solid = scrolled || !isHome || menuOpen;

  return (
    <header
      data-tone="petrol"
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-500',
        solid
          ? 'bg-forest/95 border-b border-line backdrop-blur-sm'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-[4.5rem] w-full max-w-[88rem] items-center justify-between px-6 sm:px-8 lg:h-20 lg:px-12">
        <WordmarkLink size="sm" />

        <nav aria-label="Navegación principal" className="hidden lg:block">
          <ul className="flex items-center gap-9">
            {primaryNav.map((item) => {
              const active =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'text-fg relative py-2 text-[0.6875rem] tracking-eyebrow uppercase transition-opacity duration-300',
                      active ? 'opacity-100' : 'opacity-65 hover:opacity-100',
                    )}
                  >
                    {item.label}
                    {active && (
                      <span
                        aria-hidden="true"
                        className="bg-accent absolute -bottom-0.5 left-0 h-px w-full"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hidden lg:block">
          <CtaLink
            href={PRIMARY_CTA.href}
            variant="outline"
            event={ANALYTICS_EVENTS.ctaValoracion}
            analytics={{ location: 'header' }}
          >
            {PRIMARY_CTA.label}
          </CtaLink>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="menu-movil"
          className="text-fg -mr-2 flex items-center gap-2 p-2 text-[0.6875rem] tracking-eyebrow uppercase lg:hidden"
        >
          {menuOpen ? 'Cerrar' : 'Menú'}
          <span aria-hidden="true" className="flex h-3 w-4 flex-col justify-between">
            <span
              className={cn(
                'bg-current h-px w-full transition-transform duration-300',
                menuOpen && 'translate-y-[5.5px] rotate-45',
              )}
            />
            <span
              className={cn(
                'bg-current h-px w-full transition-opacity duration-200',
                menuOpen && 'opacity-0',
              )}
            />
            <span
              className={cn(
                'bg-current h-px w-full transition-transform duration-300',
                menuOpen && '-translate-y-[5.5px] -rotate-45',
              )}
            />
          </span>
        </button>
      </div>

      {/* Menú móvil: panel a pantalla completa bajo el header, sin animaciones
          costosas (brief §8). Ocupar el alto restante evita que el contenido
          de la página se vea por debajo y compita con el CTA del menú. */}
      <div
        id="menu-movil"
        hidden={!menuOpen}
        data-tone="forest"
        className="bg-forest border-line h-[calc(100dvh-4.5rem)] overflow-y-auto border-t lg:hidden"
      >
        <nav
          aria-label="Navegación móvil"
          className="flex min-h-full flex-col px-6 py-8 sm:px-8"
        >
          <ul className="flex flex-col gap-1">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="font-display text-fg block py-3 text-2xl font-light"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-10">
            <CtaLink
              href={PRIMARY_CTA.href}
              size="lg"
              event={ANALYTICS_EVENTS.ctaValoracion}
              analytics={{ location: 'menu_movil' }}
              className="w-full"
            >
              {PRIMARY_CTA.label}
            </CtaLink>
          </div>
        </nav>
      </div>
    </header>
  );
}
