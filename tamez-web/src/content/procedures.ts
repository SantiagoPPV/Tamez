import { pending } from './site';

/**
 * Catálogo de procedimientos.
 *
 * Estructura pensada para añadir páginas sin duplicar layout (brief §11):
 * cada entrada alimenta `/procedimientos/[slug]` con el mismo componente.
 *
 * IMPORTANTE (brief §12): todo el contenido clínico —objetivo, candidato
 * ideal, recuperación y respuestas de FAQ— nace como `[PENDIENTE: …]` y debe
 * ser redactado o aprobado por el médico antes de publicar. `createProcedure`
 * impone ese default: si no se pasa el campo, queda marcado como pendiente.
 */

export const procedureCategories = ['facial', 'mamaria', 'corporal'] as const;
export type ProcedureCategory = (typeof procedureCategories)[number];

export const categoryLabels: Record<ProcedureCategory, string> = {
  facial: 'Facial',
  mamaria: 'Mamaria',
  corporal: 'Corporal',
};

export const categoryIntros: Record<ProcedureCategory, string> = {
  facial:
    'Intervenciones orientadas a la armonía del rostro, respetando la expresión y los rasgos propios de cada paciente.',
  mamaria:
    'Procedimientos centrados en la proporción, la simetría y la relación natural con la anatomía de cada paciente.',
  corporal:
    'Cirugía de contorno enfocada en el equilibrio de las proporciones y en un resultado coherente con el cuerpo real.',
};

export interface ProcedureFaq {
  readonly question: string;
  readonly answer: string;
}

export interface Procedure {
  readonly slug: string;
  readonly name: string;
  readonly category: ProcedureCategory;
  /** Sinónimos frecuentes de búsqueda; útiles para copy y SEO on-page. */
  readonly alsoKnownAs: readonly string[];
  readonly metaTitle: string;
  readonly metaDescription: string;
  /** Frase corta de encabezado. Copy de interfaz, no médico. */
  readonly tagline: string;
  /** Introducción editorial. BORRADOR no médico. */
  readonly intro: string;
  /** Objetivo clínico del procedimiento. Requiere aprobación médica. */
  readonly objective: string;
  /** Perfil de candidato. Requiere aprobación médica. */
  readonly idealCandidate: readonly string[];
  /** Enfoque TAMEZ: filosofía y método de trabajo, no afirmaciones clínicas. */
  readonly approach: readonly string[];
  /** Recuperación general. Requiere aprobación médica. */
  readonly recovery: string;
  readonly faqs: readonly ProcedureFaq[];
  /** Se muestra en la portada (brief §4.1: 4–6 tarjetas). */
  readonly featured: boolean;
  readonly order: number;
}

type ProcedureSeed = Pick<
  Procedure,
  'slug' | 'name' | 'category' | 'tagline' | 'intro' | 'order'
> &
  Partial<Procedure>;

/** Preguntas frecuentes por defecto: mismas dudas, respuestas por aprobar. */
function defaultFaqs(name: string): readonly ProcedureFaq[] {
  return [
    {
      question: `¿Cómo sé si soy candidato(a) a ${name.toLowerCase()}?`,
      answer: pending(`respuesta médica aprobada — candidatura ${name}`),
    },
    {
      question: '¿Cómo es la valoración inicial?',
      answer:
        'La valoración es una conversación con el Dr. Tamez para entender tus objetivos, revisar tu caso y explicarte con claridad las alternativas. No implica compromiso.',
    },
    {
      question: '¿Cuánto dura la recuperación?',
      answer: pending(`respuesta médica aprobada — recuperación ${name}`),
    },
    {
      question: '¿El resultado se ve natural?',
      answer:
        'El criterio de TAMEZ es la proporción: buscamos un resultado coherente con tus rasgos, no un cambio evidente. El alcance concreto se define en la valoración.',
    },
  ];
}

function createProcedure(seed: ProcedureSeed): Procedure {
  return {
    alsoKnownAs: [],
    // Sin la marca: el layout añade "| TAMEZ Plastic Surgery" automáticamente.
    metaTitle: seed.name,
    metaDescription: `${seed.tagline} Conoce el enfoque del Dr. Tamez en ${seed.name.toLowerCase()} y solicita una valoración personalizada.`,
    objective: pending(`objetivo clínico aprobado — ${seed.name}`),
    idealCandidate: [pending(`perfil de candidato aprobado — ${seed.name}`)],
    approach: [
      'Valoración individual: se estudia tu anatomía y tus objetivos antes de proponer cualquier técnica.',
      'Planeación por proporción: la decisión se toma sobre el conjunto, no sobre un rasgo aislado.',
      'Acompañamiento: seguimiento cercano antes y después del procedimiento.',
    ],
    recovery: pending(`descripción de recuperación aprobada — ${seed.name}`),
    faqs: defaultFaqs(seed.name),
    featured: false,
    ...seed,
  };
}

export const procedures: readonly Procedure[] = [
  // ---------------------------------------------------------------- Facial
  createProcedure({
    slug: 'lifting-facial',
    name: 'Lifting facial',
    category: 'facial',
    alsoKnownAs: ['facelift', 'ritidectomía'],
    tagline: 'Devolver la estructura sin borrar la identidad.',
    intro:
      'Un lifting bien planeado no cambia el rostro: lo devuelve a su propia proporción. El trabajo se concentra en la estructura, no en la superficie, para que el resultado se lea como descanso y no como intervención.',
    featured: true,
    order: 1,
  }),
  createProcedure({
    slug: 'rinoplastia',
    name: 'Rinoplastia',
    category: 'facial',
    alsoKnownAs: ['cirugía de nariz'],
    tagline: 'La nariz que corresponde a tu rostro.',
    intro:
      'La rinoplastia es un ejercicio de milímetros. El objetivo no es una nariz ideal en abstracto, sino la que equilibra tu perfil, tu mirada y tus rasgos.',
    featured: true,
    order: 2,
  }),
  createProcedure({
    slug: 'blefaroplastia',
    name: 'Blefaroplastia',
    category: 'facial',
    alsoKnownAs: ['cirugía de párpados'],
    tagline: 'Una mirada descansada, no una mirada distinta.',
    intro:
      'La región periocular concentra buena parte de la expresión. Intervenirla exige contención: el criterio es liberar la mirada conservando por completo su carácter.',
    order: 3,
  }),
  createProcedure({
    slug: 'otoplastia',
    name: 'Otoplastia',
    category: 'facial',
    alsoKnownAs: ['cirugía de orejas'],
    tagline: 'Proporción y discreción.',
    intro:
      'La otoplastia busca que las orejas dejen de competir con el resto del rostro. Un resultado correcto es, sobre todo, un resultado que pasa desapercibido.',
    order: 4,
  }),

  // --------------------------------------------------------------- Mamaria
  createProcedure({
    slug: 'aumento-mamario',
    name: 'Aumento mamario',
    category: 'mamaria',
    alsoKnownAs: ['implantes mamarios', 'mamoplastia de aumento'],
    tagline: 'Volumen en relación con tu anatomía.',
    intro:
      'La decisión relevante no es el tamaño, sino la proporción: la relación entre el tórax, los hombros y la silueta. Ese análisis ocurre en la valoración, antes de hablar de cualquier medida.',
    featured: true,
    order: 5,
  }),
  createProcedure({
    slug: 'mastopexia',
    name: 'Mastopexia',
    category: 'mamaria',
    alsoKnownAs: ['levantamiento mamario'],
    tagline: 'Posición antes que volumen.',
    intro:
      'La mastopexia trabaja sobre la forma y la posición. En muchos casos la conversación empieza por decidir si el objetivo real es volumen, soporte o ambos.',
    order: 6,
  }),
  createProcedure({
    slug: 'reduccion-mamaria',
    name: 'Reducción mamaria',
    category: 'mamaria',
    alsoKnownAs: ['mamoplastia de reducción'],
    tagline: 'Equilibrio y proporción.',
    intro:
      'Un procedimiento donde el criterio estético y el funcional coinciden. La planeación busca una proporción estable en el tiempo y coherente con el resto de la silueta.',
    order: 7,
  }),

  // -------------------------------------------------------------- Corporal
  createProcedure({
    slug: 'liposuccion',
    name: 'Liposucción',
    category: 'corporal',
    alsoKnownAs: ['lipoescultura', 'contorno corporal'],
    tagline: 'Definir sin desdibujar.',
    intro:
      'La liposucción no es una herramienta de reducción de peso, sino de contorno. El trabajo consiste en leer la silueta completa y decidir dónde intervenir y —sobre todo— dónde no.',
    featured: true,
    order: 8,
  }),
  createProcedure({
    slug: 'abdominoplastia',
    name: 'Abdominoplastia',
    category: 'corporal',
    alsoKnownAs: ['cirugía de abdomen'],
    tagline: 'Estructura, no sólo superficie.',
    intro:
      'La abdominoplastia atiende pared abdominal y piel como un mismo problema. La planeación cuidadosa de la cicatriz forma parte del resultado, no es un detalle posterior.',
    featured: true,
    order: 9,
  }),
  createProcedure({
    slug: 'mommy-makeover',
    name: 'Mommy makeover',
    category: 'corporal',
    alsoKnownAs: ['cirugía posparto combinada'],
    tagline: 'Un plan, no una lista de procedimientos.',
    intro:
      'Más que un procedimiento, es una estrategia personalizada que combina intervenciones según cada caso. Qué se incluye —y en qué orden— se define íntegramente en la valoración.',
    featured: true,
    order: 10,
  }),
];

export const proceduresBySlug: ReadonlyMap<string, Procedure> = new Map(
  procedures.map((procedure) => [procedure.slug, procedure]),
);

export function getProcedure(slug: string): Procedure | undefined {
  return proceduresBySlug.get(slug);
}

export function getFeaturedProcedures(): readonly Procedure[] {
  return procedures.filter((procedure) => procedure.featured);
}

export function getProceduresByCategory(
  category: ProcedureCategory,
): readonly Procedure[] {
  return procedures
    .filter((procedure) => procedure.category === category)
    .sort((a, b) => a.order - b.order);
}
