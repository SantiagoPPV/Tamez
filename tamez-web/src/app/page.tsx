import type { Metadata } from 'next';
import { Hero } from '@/components/sections/Hero';
import { AuthorityBlock } from '@/components/sections/AuthorityBlock';
import { FeaturedProcedures } from '@/components/sections/FeaturedProcedures';
import { Philosophy } from '@/components/sections/Philosophy';
import { FeaturedResults } from '@/components/sections/FeaturedResults';
import { SocialProof } from '@/components/sections/SocialProof';
import { ExperienceSteps } from '@/components/sections/ExperienceSteps';
import { FaqSection } from '@/components/sections/FaqSection';
import { FinalCta } from '@/components/sections/FinalCta';
import { buildMetadata } from '@/lib/seo';
import { siteConfig } from '@/content/site';
import { homeFaqs } from '@/content/home';

export const metadata: Metadata = buildMetadata({
  title: `${siteConfig.name} | ${siteConfig.tagline}`,
  description: siteConfig.description,
  path: '/',
  absoluteTitle: true,
});

/**
 * Portada = funnel principal (brief §4.1 y §5).
 *
 * Orden del recorrido: Descubrimiento → Confianza → Consideración →
 * Evidencia → Conversión.
 */
export default function HomePage() {
  return (
    <>
      {/* Descubrimiento */}
      <Hero />

      {/* Confianza */}
      <AuthorityBlock />

      {/* Consideración */}
      <FeaturedProcedures />
      <Philosophy />

      {/* Evidencia */}
      <FeaturedResults />
      <SocialProof />

      {/* Conversión */}
      <ExperienceSteps />
      <FaqSection items={homeFaqs} />
      <FinalCta location="cta_final_home" />
    </>
  );
}
