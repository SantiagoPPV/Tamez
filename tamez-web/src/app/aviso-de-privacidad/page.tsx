import type { Metadata } from 'next';
import { PageHero } from '@/components/layout/PageHero';
import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { Pending } from '@/components/ui/Pending';
import { buildMetadata } from '@/lib/seo';
import { pending } from '@/content/site';

export const metadata: Metadata = buildMetadata({
  title: 'Aviso de privacidad',
  description:
    'Aviso de privacidad de TAMEZ Plastic Surgery: tratamiento de los datos personales recabados a través del sitio.',
  path: '/aviso-de-privacidad',
});

/**
 * Aviso de privacidad.
 *
 * El texto legal DEBE proporcionarlo el cliente (brief §12 y §19): un aviso
 * de privacidad redactado por inferencia no tiene validez y expone al médico.
 * Aquí queda la estructura y la descripción factual de lo que el sitio hace
 * realmente con los datos, para que el abogado sólo tenga que completarla.
 */

const sections = [
  {
    title: 'Responsable del tratamiento',
    body: pending('razón social, domicilio fiscal y datos del responsable'),
  },
  {
    title: 'Datos que se recaban',
    body: 'A través del formulario de este sitio se recaban únicamente: nombre, medio de contacto preferido, dato de contacto (teléfono o correo), procedimiento de interés y un mensaje opcional. No se solicita ni se almacena información clínica, diagnósticos ni fotografías.',
  },
  {
    title: 'Finalidad',
    body: 'Los datos se utilizan exclusivamente para responder a la solicitud de valoración y coordinar la cita. No se utilizan para publicidad de terceros ni se comercializan.',
  },
  {
    title: 'Conservación y seguridad',
    body: pending('plazo de conservación y medidas de seguridad declaradas'),
  },
  {
    title: 'Transferencias',
    body: pending('transferencias a terceros, si aplica (proveedores de hosting y base de datos)'),
  },
  {
    title: 'Derechos ARCO',
    body: pending('procedimiento y correo para ejercer derechos de acceso, rectificación, cancelación y oposición'),
  },
  {
    title: 'Cookies y analítica',
    body: 'El sitio puede utilizar herramientas de analítica para medir el uso de las páginas. El contenido del formulario nunca se envía a esas herramientas. El detalle de cookies utilizadas se documentará aquí.',
  },
  {
    title: 'Cambios al aviso',
    body: pending('mecanismo de notificación de cambios y fecha de última actualización'),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Aviso de privacidad"
        lead="Cómo se tratan los datos personales recabados a través de este sitio."
      />

      <Section tone="sand">
        <Container width="prose">
          <div className="border-line bg-surface-2 mb-14 border p-6">
            <p className="text-sm leading-relaxed">
              <Pending>
                {pending('texto legal definitivo del aviso de privacidad')}
              </Pending>
            </p>
            <p className="text-fg-subtle mt-3 text-xs leading-relaxed">
              Este documento debe ser redactado o validado por el asesor legal del
              cliente antes de publicar el sitio. El contenido siguiente describe el
              funcionamiento real del formulario y sirve como base.
            </p>
          </div>

          <div className="space-y-12">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-display text-fg text-2xl font-light">
                  {section.title}
                </h2>
                <p className="mt-4 text-sm leading-relaxed sm:text-base">
                  {section.body.startsWith('[PENDIENTE:') ? (
                    <Pending>{section.body}</Pending>
                  ) : (
                    section.body
                  )}
                </p>
              </section>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
