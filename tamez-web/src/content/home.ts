import { pending } from './site';

/**
 * Copy de la portada. Todo es BORRADOR de interfaz (permitido por brief §12);
 * cualquier afirmación verificable usa `pending(...)`.
 */

export interface FaqItem {
  readonly question: string;
  readonly answer: string;
}

export const hero = {
  eyebrow: 'Cirugía plástica',
  title: 'Precisión, proporción y naturalidad.',
  subtitle:
    'Una firma médica para quienes buscan un resultado que se perciba, no un procedimiento que se note.',
  note: 'BORRADOR — frase de posicionamiento sujeta a aprobación del cliente.',
} as const;

export const authority = {
  eyebrow: 'El cirujano',
  title: 'Criterio quirúrgico antes que técnica.',
  body: 'Cada caso empieza por una pregunta: qué necesita realmente este rostro o este cuerpo para volver a su proporción. La técnica viene después.',
  credentials: [
    pending('certificación del consejo médico'),
    pending('formación y especialidad'),
    pending('asociaciones médicas verificadas'),
  ],
} as const;

export const philosophy = {
  eyebrow: 'Filosofía',
  title: 'La sofisticación está en la precisión.',
  pillars: [
    {
      title: 'Técnica',
      body: 'Ejecución meticulosa y decisiones conservadoras. Lo que no se interviene también es parte del plan.',
    },
    {
      title: 'Proporción',
      body: 'Ningún rasgo se evalúa aislado. El criterio es siempre el conjunto y su equilibrio.',
    },
    {
      title: 'Identidad',
      body: 'El objetivo no es transformar a la paciente en otra persona, sino devolverle coherencia a la suya.',
    },
  ],
} as const;

export const experience = {
  eyebrow: 'La experiencia TAMEZ',
  title: 'Un proceso, no una cita.',
  steps: [
    {
      step: '01',
      title: 'Valoración',
      body: 'Una conversación sin compromiso para entender tus objetivos y revisar tu caso con detalle.',
    },
    {
      step: '02',
      title: 'Planeación',
      body: 'Se define un plan individual y se explican con claridad las alternativas y sus implicaciones.',
    },
    {
      step: '03',
      title: 'Procedimiento',
      body: pending('descripción del proceso quirúrgico aprobada por el doctor'),
    },
    {
      step: '04',
      title: 'Seguimiento',
      body: 'Acompañamiento posterior con el equipo, con revisiones programadas según cada caso.',
    },
  ],
} as const;

export const homeFaqs: readonly FaqItem[] = [
  {
    question: '¿Cómo solicito una valoración?',
    answer:
      'Puedes escribirnos por WhatsApp o enviar el formulario de contacto. El equipo responde para coordinar una cita de valoración con el Dr. Tamez.',
  },
  {
    question: '¿La valoración tiene costo?',
    answer: pending('política de costo de valoración confirmada por el cliente'),
  },
  {
    question: '¿Cada procedimiento se personaliza?',
    answer:
      'Sí. El plan se define caso por caso a partir de la anatomía y los objetivos de cada paciente; no existen paquetes predefinidos.',
  },
  {
    question: '¿Dónde se realizan los procedimientos?',
    answer: pending('ubicación de consultorio y hospitales autorizados'),
  },
  {
    question: '¿Cómo es la recuperación?',
    answer: pending('descripción general de recuperación aprobada por el doctor'),
  },
];

export const finalCta = {
  eyebrow: 'Siguiente paso',
  title: 'Comienza con una valoración personalizada.',
  body: 'Sin compromiso. Una conversación para entender tu caso y explicarte, con claridad, qué es posible y qué no.',
} as const;
