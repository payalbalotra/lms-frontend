import type {
  Procedure,
  ProcedureAcknowledgement,
  ProcedureBody,
  ProcedureBlock,
  ProcedureMethodStep,
  ProcedureQuiz,
  ProcedureQuizQuestion,
  TrainingAssignment,
  TrainingAssignmentStatus,
  TrainingAssignmentRow,
  TrainingCourseRow,
} from './types';

/** Lightweight employee shape used only for the training surfaces. The real
 *  employee record comes from `fetchMe` / list endpoints; this stands in
 *  during the frontend-only build. */
export interface MockEmployee {
  id: string;
  name: string;
  station: string;
}

export const mockTrainingEmployees: MockEmployee[] = [
  { id: 'emp-001', name: 'Marisol Ruiz', station: 'Cold prep' },
  { id: 'emp-002', name: 'Tomas Igwe', station: 'Pasta' },
  { id: 'emp-003', name: 'Léa Dubois', station: 'Pastry' },
  { id: 'emp-004', name: 'Hiro Watanabe', station: 'Grill' },
  { id: 'emp-005', name: 'Adaeze Okeke', station: 'Saucier' },
];

// ---------------------------------------------------------------------------
// Block + step factories — literal ids so the mock survives SSR / hydration.
// ---------------------------------------------------------------------------

const step = (
  id: string,
  en: string,
  es: string,
  critical = false,
): ProcedureMethodStep => ({
  id,
  body: { en, es },
  critical,
});

const blockText = (id: string, en: string, es: string): ProcedureBlock => ({
  id,
  kind: 'text',
  body: { en, es },
});

const blockHeading = (
  id: string,
  level: 1 | 2 | 3,
  en: string,
  es: string,
): ProcedureBlock => ({
  id,
  kind: 'heading',
  level,
  text: { en, es },
});

const blockWarning = (
  id: string,
  severity: 'warn' | 'tip' | 'alt' | 'equip' | 'allergen',
  en: string,
  es: string,
): ProcedureBlock => ({
  id,
  kind: 'warning',
  severity,
  body: { en, es },
});

const blockMethod = (id: string, steps: ProcedureMethodStep[]): ProcedureBlock => ({
  id,
  kind: 'method',
  steps,
});

// ---------------------------------------------------------------------------
// Course bodies — built once, reused for EN and ES in the mock (bilingual
// content is the literal copy, not a runtime translation).
// ---------------------------------------------------------------------------

const handwashingBody: ProcedureBody = {
  blocks: [
    blockHeading(
      'hw-h',
      1,
      'Handwashing & glove protocol',
      'Protocolo de lavado de manos y guantes',
    ),
    blockText(
      'hw-intro',
      'Hands are washed at handwash sinks only — never at prep sinks or over food. Wash on station entry, after raw protein, after touching your face, after the bin, and after any non-food task.',
      'Las manos se lavan exclusivamente en los lavamanos del personal. Lávese al entrar a la estación, después de tocar proteína cruda, después de tocarse la cara, después del bote de basura y tras cualquier tarea ajena a la comida.',
    ),
    blockWarning(
      'hw-warn',
      'warn',
      'A wet glove is not a clean glove. If a glove tears, gets wet, or you touch a non-food surface with it, take it off and wash your hands before putting a new one on.',
      'Un guante húmedo no es un guante limpio. Si se rompe, se moja o toca una superficie ajena a la comida, quíteselo y lávese las manos antes de ponerse uno nuevo.',
    ),
    blockMethod('hw-method', [
      step('hw-s1', 'Wet hands with warm water (≥ 100°F / 38°C).', 'Mójese las manos con agua tibia (≥ 38°C).'),
      step('hw-s2', 'Apply soap and lather for at least 20 seconds, including wrists and between fingers.', 'Aplique jabón y frote al menos 20 segundos, incluyendo muñecas y entre los dedos.'),
      step('hw-s3', 'Rinse under running water with fingertips down.', 'Enjuague bajo el chorro con las puntas de los dedos hacia abajo.'),
      step('hw-s4', 'Dry with a single-use paper towel; use the towel to turn off the faucet.', 'Seque con una toalla de papel de un solo uso; use la toalla para cerrar el grifo.'),
      step('hw-s5', 'Sanitise after drying if the task is ready-to-eat (≥ 60 % alcohol, 5 s wet).', 'Desinfecte después de secar si la tarea es de listo-para-comer (≥ 60 % alcohol, 5 s mojado).'),
    ]),
  ],
};

const knifeSteps: ProcedureMethodStep[] = [
  step('kn-s1', 'Place the knife in the rack with the blade facing back, never edge-out over a counter.', 'Coloque el cuchillo en la rejilla con el filo hacia atrás; nunca sobresalga del mostrador.'),
  step('kn-s2', 'Carry a knife blade-down at your side, point straight ahead — never running.', 'Transporte el cuchillo con el filo hacia abajo a su costado, punta al frente — nunca corra.'),
  step('kn-s3', 'Pass a knife handle-first; announce "Knife behind you" before letting go.', 'Pase el cuchillo por el mango; diga "Cuchillo detrás de usted" antes de soltarlo.', true),
  step('kn-s4', 'If you drop a knife, step back. Do not try to catch it.', 'Si se le cae un cuchillo, dé un paso atrás. No intente atraparlo.', true),
  step('kn-s5', 'Cut on a stable board with a damp towel underneath; never cut toward your other hand.', 'Corte sobre una tabla estable con un paño húmedo debajo; nunca corte hacia la otra mano.'),
];

const knifeSafetyBody: ProcedureBody = {
  blocks: [
    blockHeading('kn-h', 1, 'Knife safety fundamentals', 'Fundamentos de seguridad con cuchillo'),
    blockText(
      'kn-intro',
      'A knife is the most-used tool in the kitchen and the most common source of serious cuts. These five rules are what we expect every cook, every shift.',
      'El cuchillo es la herramienta más usada en la cocina y la fuente más común de cortes serios. Estas cinco reglas aplican para todos los cocineros, todos los turnos.',
    ),
    blockWarning(
      'kn-warn',
      'warn',
      'A wet board is a slipping board. The damp towel under the board is not optional — it is the rule.',
      'Una tabla mojada es una tabla que resbala. El paño húmedo bajo la tabla no es opcional — es la regla.',
    ),
    blockMethod('kn-method', knifeSteps),
  ],
};

const knifeQuizQuestions: ProcedureQuizQuestion[] = [
  {
    id: 'kn-q1',
    prompt: {
      en: 'A cook drops a knife on the floor. What is the correct action?',
      es: 'A un cocinero se le cae un cuchillo al piso. ¿Cuál es la acción correcta?',
    },
    choices: [
      { id: 'kn-q1-a', label: { en: 'Try to catch it before it hits the floor.', es: 'Intentar atraparlo antes de que caiga.' } },
      { id: 'kn-q1-b', label: { en: 'Step back. Do not try to catch it.', es: 'Dar un paso atrás. No intentar atraparlo.' } },
      { id: 'kn-q1-c', label: { en: 'Pick it up immediately with a bare hand.', es: 'Recogerlo inmediatamente con la mano desnuda.' } },
    ],
    correctChoiceId: 'kn-q1-b',
  },
  {
    id: 'kn-q2',
    prompt: {
      en: 'How do you hand a knife to another cook?',
      es: '¿Cómo se le pasa un cuchillo a otro cocinero?',
    },
    choices: [
      { id: 'kn-q2-a', label: { en: 'Blade first — they take the tip to control it.', es: 'Primero el filo — ellos agarran la punta para controlarlo.' } },
      { id: 'kn-q2-b', label: { en: 'Handle first, announce "Knife behind you".', es: 'Por el mango, diciendo "Cuchillo detrás de usted".' } },
      { id: 'kn-q2-c', label: { en: 'Lay it on a board and step aside.', es: 'Ponerlo sobre una tabla y hacerse a un lado.' } },
    ],
    correctChoiceId: 'kn-q2-b',
  },
];

const allergenSteps: ProcedureMethodStep[] = [
  step('al-s1', 'Verify all nine Big-9 allergens on every prep line, every shift.', 'Verifique los nueve alérgenos del Big-9 en cada línea de preparación, cada turno.'),
  step('al-s2', 'Use dedicated boards (purple) for allergen tickets; do not cross stations.', 'Use tablas dedicadas (moradas) para las comandas con alérgenos; no cruce estaciones.'),
  step('al-s3', 'No substitutions without manager sign-off and a new ticket.', 'Sin sustituciones sin aprobación del gerente y una nueva comanda.'),
  step('al-s4', 'Sanitise the entire station after an allergen ticket; wash boards separately.', 'Desinfecte toda la estación tras una comanda con alérgenos; lave las tablas por separado.'),
];

const allergenBody: ProcedureBody = {
  blocks: [
    blockHeading('al-h', 1, 'Allergen awareness — front of house', 'Conocimiento de alérgenos — sala'),
    blockText(
      'al-intro',
      'Every allergen ticket is the customer telling us they could be hospitalised by a wrong ingredient. Nine allergens, one shared kitchen — mistake-proofing is the job.',
      'Cada comanda con alérgenos es el cliente diciéndonos que una ingrediente equivocada podría hospitalizarlo. Nueve alérgenos, una sola cocina — el trabajo es a prueba de errores.',
    ),
    blockWarning(
      'al-warn',
      'allergen',
      'If an allergen ticket and a non-allergen ticket for the same table both reach your station, the allergen ticket runs. Always.',
      'Si una comanda con alérgenos y otra sin alérgenos del mismo cliente llegan a su estación, va primero la de alérgenos. Siempre.',
    ),
    blockMethod('al-method', allergenSteps),
  ],
};

const allergenQuizQuestions: ProcedureQuizQuestion[] = [
  {
    id: 'al-q1',
    prompt: {
      en: 'How many of the Big-9 allergens must you verify on every prep line?',
      es: '¿Cuántos de los nueve alérgenos principales debe verificar en cada línea de preparación?',
    },
    choices: [
      { id: 'al-q1-a', label: { en: 'Five', es: 'Cinco' } },
      { id: 'al-q1-b', label: { en: 'All of them — nine', es: 'Todos — nueve' } },
      { id: 'al-q1-c', label: { en: 'Only the ones on the current ticket', es: 'Solo los de la comanda actual' } },
    ],
    correctChoiceId: 'al-q1-b',
  },
  {
    id: 'al-q2',
    prompt: {
      en: 'An allergen ticket and a regular ticket for the same table arrive together. What runs first?',
      es: 'Una comanda con alérgenos y una regular del mismo cliente llegan juntas. ¿Cuál va primero?',
    },
    choices: [
      { id: 'al-q2-a', label: { en: 'The regular ticket — speed matters.', es: 'La regular — la velocidad importa.' } },
      { id: 'al-q2-b', label: { en: 'The allergen ticket — always.', es: 'La de alérgenos — siempre.' } },
      { id: 'al-q2-c', label: { en: 'Whichever the manager picks.', es: 'La que el gerente elija.' } },
    ],
    correctChoiceId: 'al-q2-b',
  },
];

const handwashingQuiz: ProcedureQuiz = { questions: [], attached: false };
const knifeQuiz: ProcedureQuiz = { questions: knifeQuizQuestions, attached: true };
const allergenQuiz: ProcedureQuiz = { questions: allergenQuizQuestions, attached: true };

// ---------------------------------------------------------------------------
// Acknowledgement statements — the `I have read and understood` checkbox at
// the end of each course. Surfaced on the employee-side `.ack` block and on
// the receipt. Version label appears in the audit log.
// ---------------------------------------------------------------------------

const handwashingAck: ProcedureAcknowledgement = {
  versionLabel: 'v2026.09',
  statement: {
    en: 'I have read the handwashing and glove protocol, and I will follow the five-step wash at every listed trigger point.',
    es: 'He leído el protocolo de lavado de manos y guantes, y seguiré los cinco pasos de lavado en cada uno de los puntos indicados.',
  },
};

const knifeAck: ProcedureAcknowledgement = {
  versionLabel: 'v2026.08',
  statement: {
    en: 'I will follow the five knife-safety rules — carry, pass, drop, board, and never-cut-toward — every shift.',
    es: 'Seguiré las cinco reglas de seguridad con cuchillo — transporte, entrega, caída, tabla y nunca-cortar-hacia — en cada turno.',
  },
};

const allergenAck: ProcedureAcknowledgement = {
  versionLabel: 'v2026.09',
  statement: {
    en: 'I have read the Big-9 allergen protocol. I will verify every allergen ticket before plating and will not substitute ingredients without manager sign-off.',
    es: 'He leído el protocolo de los nueve alérgenos principales. Verificaré cada comanda con alérgenos antes de emplatar y no sustituiré ingredientes sin aprobación del gerente.',
  },
};

// ---------------------------------------------------------------------------
// Standalone SOPs — these are not courses. An admin links them into a course
// so the employee sees them as "Read alongside" on the course reader.
// ---------------------------------------------------------------------------

const lettuceWashBody: ProcedureBody = {
  blocks: [
    blockHeading('lw-h', 1, 'Lettuce wash', 'Lavado de lechuga'),
    blockMethod('lw-method', [
      step('lw-s1', 'Fill the wash sink with cold water and a chlorine tablet (50 ppm).', 'Llene el lavabo con agua fría y una pastilla de cloro (50 ppm).'),
      step('lw-s2', 'Submerge leaves for 90 s, agitating gently.', 'Sumerja las hojas durante 90 segundos, agitando con cuidado.'),
      step('lw-s3', 'Rinse twice in clean cold water.', 'Enjuague dos veces en agua fría limpia.'),
      step('lw-s4', 'Spin dry in the salad spinner — three short bursts, not one long one.', 'Seque en la centrifugadora — tres ciclos cortos, no uno largo.', true),
    ]),
  ],
};

const pastaWaterBody: ProcedureBody = {
  blocks: [
    blockHeading('pw-h', 1, 'Pasta water — salinity & temperature', 'Agua de pasta — salinidad y temperatura'),
    blockWarning(
      'pw-warn',
      'warn',
      'Pasta water must read 1.0–1.2 % salinity and 96 °C / 205 °F. Under-salted water is the single most common cause of inedible pasta.',
      'El agua de pasta debe marcar 1.0–1.2 % de salinidad y 96 °C. Un agua mal salada es la causa más común de pasta incomible.',
    ),
    blockMethod('pw-method', [
      step('pw-s1', 'Bring 4 L of water to a rolling boil per 500 g of dry pasta.', 'Lleve 4 L de agua a hervor fuerte por cada 500 g de pasta seca.'),
      step('pw-s2', 'Add 40 g of sea salt — that is the 1 % mark.', 'Añada 40 g de sal de mar — esa es la marca del 1 %.', true),
      step('pw-s3', 'Verify with the salinity refractometer; reject under 1.0 %.', 'Verifique con el refractómetro de salinidad; rechace bajo 1.0 %.'),
    ]),
  ],
};

const fryerOilBody: ProcedureBody = {
  blocks: [
    blockHeading('fo-h', 1, 'Fryer oil change', 'Cambio de aceite de freidora'),
    blockMethod('fo-method', [
      step('fo-s1', 'Filter the oil through the built-in filter every service.', 'Filtre el aceite con el filtro integrado en cada servicio.'),
      step('fo-s2', 'Top up with fresh oil when the level drops below the lower mark.', 'Rellene con aceite nuevo cuando el nivel baje de la marca inferior.'),
      step('fo-s3', 'Discard and replace fully when TPM falls below 12 % or colour goes dark amber.', 'Deseche y reemplace por completo cuando el TPM caiga bajo 12 % o el color pase a ámbar oscuro.', true),
    ]),
  ],
};

const knifeSharpeningBody: ProcedureBody = {
  blocks: [
    blockHeading('ks-h', 1, 'Knife sharpening & honing', 'Afilado y mantenimiento de cuchillo'),
    blockMethod('ks-method', [
      step('ks-s1', 'Hone on the rod before every shift — 5 passes each side, 20°.', 'Afile en la varilla antes de cada turno — 5 pasadas por lado, 20°.'),
      step('ks-s2', 'Whetstone once a week or when the hone no longer brings the edge back.', 'Piedra de afilar una vez por semana o cuando la varilla ya no recupere el filo.', true),
      step('ks-s3', 'Strop on leather after whetstoning.', 'Asiente en cuero después de la piedra.'),
    ]),
  ],
};

const stockRotationBody: ProcedureBody = {
  blocks: [
    blockHeading('sr-h', 1, 'Stock rotation (FIFO)', 'Rotación de stock (PEPS)'),
    blockMethod('sr-method', [
      step('sr-s1', 'Label every container with prep date and use-by date.', 'Etiquete cada recipiente con fecha de preparación y fecha de uso.'),
      step('sr-s2', 'New stock goes to the back; older stock moves to the front.', 'El stock nuevo va atrás; el más viejo pasa al frente.'),
      step('sr-s3', 'Discard anything past its use-by date — no exceptions.', 'Deseche cualquier producto pasada su fecha de uso — sin excepciones.', true),
    ]),
  ],
};

export const mockSops: Procedure[] = [
  {
    id: 'sop-001',
    slug: 'lettuce-wash',
    titleEn: 'Lettuce wash',
    titleEs: 'Lavado de lechuga',
    purposeEn: 'Sanitise and dry whole-leaf lettuce for cold prep.',
    purposeEs: 'Desinfectar y secar hojas enteras de lechuga para la preparación en frío.',
    category: null,
    status: 'published',
    bodyEn: lettuceWashBody,
    bodyEs: lettuceWashBody,
    createdBy: 'admin-001',
    createdAt: '2026-05-10T08:00:00Z',
    updatedAt: '2026-08-22T08:00:00Z',
  },
  {
    id: 'sop-002',
    slug: 'pasta-water-salinity',
    titleEn: 'Pasta water — salinity & temperature',
    titleEs: 'Agua de pasta — salinidad y temperatura',
    purposeEn: 'The 1 % salt rule and the rolling-boil rule, with salinity verification.',
    purposeEs: 'La regla del 1 % de sal y la regla del hervor fuerte, con verificación de salinidad.',
    category: null,
    status: 'published',
    bodyEn: pastaWaterBody,
    bodyEs: pastaWaterBody,
    createdBy: 'admin-001',
    createdAt: '2026-04-18T08:00:00Z',
    updatedAt: '2026-07-30T08:00:00Z',
  },
  {
    id: 'sop-003',
    slug: 'fryer-oil-change',
    titleEn: 'Fryer oil change',
    titleEs: 'Cambio de aceite de freidora',
    purposeEn: 'When to filter, when to top up, and when to discard.',
    purposeEs: 'Cuándo filtrar, cuándo rellenar y cuándo desechar.',
    category: null,
    status: 'published',
    bodyEn: fryerOilBody,
    bodyEs: fryerOilBody,
    createdBy: 'admin-001',
    createdAt: '2026-03-22T08:00:00Z',
    updatedAt: '2026-09-02T08:00:00Z',
  },
  {
    id: 'sop-004',
    slug: 'knife-sharpening-honing',
    titleEn: 'Knife sharpening & honing',
    titleEs: 'Afilado y mantenimiento de cuchillo',
    purposeEn: 'Daily honing on the rod, weekly whetstoning, and after-strop.',
    purposeEs: 'Afilado diario en varilla, piedra semanal y asentado en cuero.',
    category: null,
    status: 'published',
    bodyEn: knifeSharpeningBody,
    bodyEs: knifeSharpeningBody,
    createdBy: 'admin-001',
    createdAt: '2026-02-12T08:00:00Z',
    updatedAt: '2026-08-10T08:00:00Z',
  },
  {
    id: 'sop-005',
    slug: 'stock-rotation-fifo',
    titleEn: 'Stock rotation (FIFO)',
    titleEs: 'Rotación de stock (PEPS)',
    purposeEn: 'Label, rotate, and discard — the three rules of FIFO.',
    purposeEs: 'Etiquetar, rotar y desechar — las tres reglas del PEPS.',
    category: null,
    status: 'published',
    bodyEn: stockRotationBody,
    bodyEs: stockRotationBody,
    createdBy: 'admin-001',
    createdAt: '2026-01-30T08:00:00Z',
    updatedAt: '2026-06-20T08:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Courses — Procedures with attachedToTraining: true.
// ---------------------------------------------------------------------------

export const mockTrainingCourses: Procedure[] = [
  {
    id: 'course-001',
    slug: 'handwashing-glove-protocol',
    titleEn: 'Handwashing & glove protocol',
    titleEs: 'Protocolo de lavado de manos y guantes',
    purposeEn:
      'A short onboarding course on when and how to wash hands and change gloves — the rest of food safety depends on this being right.',
    purposeEs:
      'Curso corto de inducción sobre cuándo y cómo lavarse las manos y cambiar guantes — el resto de la seguridad alimentaria depende de hacerlo bien.',
    category: null,
    status: 'published',
    bodyEn: handwashingBody,
    bodyEs: handwashingBody,
    createdBy: 'admin-001',
    createdAt: '2026-08-12T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
    quiz: handwashingQuiz,
    attachedToTraining: true,
    linkedSops: ['sop-001', 'sop-004'],
    acknowledgement: handwashingAck,
  },
  {
    id: 'course-002',
    slug: 'knife-safety-fundamentals',
    titleEn: 'Knife safety fundamentals',
    titleEs: 'Fundamentos de seguridad con cuchillo',
    purposeEn:
      'Five rules every cook, every shift. Includes a short quiz covering the two critical-step rules (carry and pass).',
    purposeEs:
      'Cinco reglas que aplican para todos los cocineros, todos los turnos. Incluye un breve cuestionario sobre las dos reglas críticas (transporte y entrega).',
    category: null,
    status: 'published',
    bodyEn: knifeSafetyBody,
    bodyEs: knifeSafetyBody,
    createdBy: 'admin-001',
    createdAt: '2026-07-22T08:00:00Z',
    updatedAt: '2026-08-15T08:00:00Z',
    quiz: knifeQuiz,
    attachedToTraining: true,
    linkedSops: ['sop-004'],
    acknowledgement: knifeAck,
  },
  {
    id: 'course-003',
    slug: 'allergen-awareness-foh',
    titleEn: 'Allergen awareness — FOH',
    titleEs: 'Conocimiento de alérgenos — sala',
    purposeEn:
      'Regulated training for every front-of-house and prep-line cook. Quiz must pass before any allergen-ticket exposure.',
    purposeEs:
      'Capacitación regulada para cada cocinero de sala y línea de preparación. Debe aprobar el cuestionario antes de exponerse a comandas con alérgenos.',
    category: null,
    status: 'published',
    bodyEn: allergenBody,
    bodyEs: allergenBody,
    createdBy: 'admin-001',
    createdAt: '2026-06-04T08:00:00Z',
    updatedAt: '2026-09-12T08:00:00Z',
    quiz: allergenQuiz,
    attachedToTraining: true,
    linkedSops: [],
    acknowledgement: allergenAck,
  },
];

// ---------------------------------------------------------------------------
// Assignments — mix of statuses so every status pill has a representative row.
// IDs and timestamps are absolute; "overdue" is derived in `effectiveStatus`.
// ---------------------------------------------------------------------------

export const mockTrainingAssignments: TrainingAssignment[] = [
  {
    id: 'ta-001',
    courseId: 'course-002',
    employeeId: 'emp-001',
    assignedAt: '2026-09-10T08:00:00Z',
    dueAt: '2026-09-25T08:00:00Z',
    status: 'due',
    completedStepIds: [],
    quizPassedAt: null,
    acknowledgedAt: null,
  },
  {
    id: 'ta-002',
    courseId: 'course-002',
    employeeId: 'emp-002',
    assignedAt: '2026-09-08T08:00:00Z',
    dueAt: '2026-09-22T08:00:00Z',
    status: 'in_progress',
    completedStepIds: ['kn-s1', 'kn-s2', 'kn-s3'],
    quizPassedAt: null,
    acknowledgedAt: null,
  },
  {
    id: 'ta-003',
    courseId: 'course-002',
    employeeId: 'emp-003',
    assignedAt: '2026-09-01T08:00:00Z',
    dueAt: '2026-09-15T08:00:00Z',
    status: 'complete',
    completedStepIds: knifeSteps.map((s) => s.id!),
    quizPassedAt: '2026-09-14T15:42:00Z',
    acknowledgedAt: '2026-09-14T15:45:00Z',
  },
  {
    id: 'ta-004',
    courseId: 'course-003',
    employeeId: 'emp-003',
    assignedAt: '2026-09-18T08:00:00Z',
    dueAt: '2026-09-23T08:00:00Z',
    status: 'due',
    completedStepIds: [],
    quizPassedAt: null,
    acknowledgedAt: null,
  },
  {
    id: 'ta-005',
    courseId: 'course-003',
    employeeId: 'emp-004',
    assignedAt: '2026-08-25T08:00:00Z',
    dueAt: '2026-09-15T08:00:00Z',
    status: 'due',
    completedStepIds: [],
    quizPassedAt: null,
    acknowledgedAt: null,
  },
  {
    id: 'ta-006',
    courseId: 'course-003',
    employeeId: 'emp-005',
    assignedAt: '2026-08-20T08:00:00Z',
    dueAt: '2026-09-10T08:00:00Z',
    status: 'complete',
    completedStepIds: allergenSteps.map((s) => s.id!),
    quizPassedAt: '2026-09-09T11:11:00Z',
    acknowledgedAt: '2026-09-09T11:14:00Z',
  },
  {
    id: 'ta-007',
    courseId: 'course-001',
    employeeId: 'emp-005',
    assignedAt: '2026-09-19T08:00:00Z',
    dueAt: '2026-09-26T08:00:00Z',
    status: 'due',
    completedStepIds: [],
    quizPassedAt: null,
    acknowledgedAt: null,
  },
  {
    id: 'ta-008',
    courseId: 'course-001',
    employeeId: 'emp-002',
    assignedAt: '2026-09-15T08:00:00Z',
    dueAt: '2026-09-29T08:00:00Z',
    status: 'in_progress',
    completedStepIds: [],
    quizPassedAt: null,
    acknowledgedAt: null,
  },
];

// ---------------------------------------------------------------------------
// Selectors — pure, run on either side. These are the page's data layer
// while the frontend is mock-only; the live backend will swap each function
// for a `fetch` to the corresponding route.
// ---------------------------------------------------------------------------

export function effectiveStatus(
  a: TrainingAssignment,
  now: Date = new Date(),
): TrainingAssignmentStatus {
  if (a.status === 'complete') return 'complete';
  if (new Date(a.dueAt).getTime() < now.getTime()) return 'overdue';
  return a.status;
}

export function listTrainingCourses(): Procedure[] {
  return mockTrainingCourses.filter((p) => p.attachedToTraining === true);
}

export function listTrainingAssignments(): TrainingAssignment[] {
  return mockTrainingAssignments;
}

export function listTrainingAssignmentsForCourse(courseId: string): TrainingAssignment[] {
  return mockTrainingAssignments.filter((a) => a.courseId === courseId);
}

export function listTrainingAssignmentsForEmployee(employeeId: string): TrainingAssignment[] {
  return mockTrainingAssignments.filter((a) => a.employeeId === employeeId);
}

export function getCourseById(id: string): Procedure | undefined {
  return mockTrainingCourses.find((c) => c.id === id);
}

export function getTrainingRowsForEmployee(
  employeeId: string,
  now: Date = new Date(),
): TrainingAssignmentRow[] {
  return listTrainingAssignmentsForEmployee(employeeId).flatMap((assignment) => {
    const course = getCourseById(assignment.courseId);
    if (!course) return [];
    return [
      {
        assignment,
        course,
        effectiveStatus: effectiveStatus(assignment, now),
      },
    ];
  });
}

export function getTrainingCourseRowsForAdmin(now: Date = new Date()): TrainingCourseRow[] {
  return listTrainingCourses().map((course) => {
    const assignments = listTrainingAssignmentsForCourse(course.id);
    return {
      course,
      assignmentCount: assignments.length,
      completeCount: assignments.filter((a) => a.status === 'complete').length,
      inProgressCount: assignments.filter((a) => {
        const s = effectiveStatus(a, now);
        return s === 'in_progress' || s === 'due';
      }).length,
      overdueCount: assignments.filter((a) => effectiveStatus(a, now) === 'overdue').length,
    };
  });
}

export function findMockEmployee(id: string): MockEmployee | undefined {
  return mockTrainingEmployees.find((e) => e.id === id);
}

/** Standalone SOPs an admin can link into a training course. Standalone
 *  means `attachedToTraining === false` (or undefined) — i.e. procedures
 *  that live in the library but are not on the Training tab. */
export function listAvailableSops(): Procedure[] {
  return mockSops.filter((p) => p.attachedToTraining !== true);
}

export function getSopById(id: string): Procedure | undefined {
  return mockSops.find((s) => s.id === id);
}

/** Resolve every SOP id in a course's `linkedSops` to its Procedure record.
 *  Missing ids are dropped (defensive — the admin could link a SOP that was
 *  later archived in the library). */
export function listLinkedSops(course: Procedure): Procedure[] {
  if (!course.linkedSops?.length) return [];
  const byId = new Map(mockSops.map((s) => [s.id, s]));
  return course.linkedSops
    .map((id) => byId.get(id))
    .filter((s): s is Procedure => Boolean(s));
}
