import type {
  AdminEmployee,
  ApiError,
  Category,
  CreateEmployeeInput,
  CreateLocationInput,
  CreateProcedureInput,
  CreateRoleInput,
  CreateStationInput,
  Employee,
  EmployeeStatus,
  ExtractedProcedure,
  ImportProcedureType,
  InviteResult,
  Location,
  Procedure,
  ProcedureQuizMode,
  Role,
  Station,
  UpdateLocationInput,
  UpdateRoleInput,
  UpdateStationInput,
} from './types';
import { SEED_QUIZZES, type Quiz } from './quizzes';

export const API_BASE = '';

export class ApiException extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: { path: string; message: string }[];

  public constructor(
    status: number,
    code: string,
    message: string,
    details: { path: string; message: string }[] = [],
  ) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ----------------------------------------------------------------------------
// Initial Mock Seed Data
// ----------------------------------------------------------------------------

const SEED_LOCATIONS: Location[] = [
  { id: 'loc-main', name: 'Almentria Mexicana - Main Kitchen' },
  { id: 'loc-express', name: 'Downtown Express' },
];

const SEED_ROLES: Role[] = [
  { id: 'role-exec', name: 'Executive Chef', clearanceLevel: 'master', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'role-sous', name: 'Sous Chef', clearanceLevel: 'master', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'role-cook', name: 'Line Cook', clearanceLevel: 'station', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'role-prep', name: 'Prep Cook', clearanceLevel: 'station', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'role-dish', name: 'Dishwasher', clearanceLevel: 'general', createdAt: '2026-01-01T00:00:00Z' },
];

const SEED_STATIONS: Station[] = [
  { id: 'stn-gm', name: 'GM - Cold section + fryer', locationId: 'loc-main', sortOrder: 1, isArchived: false },
  { id: 'stn-grill', name: 'Grill', locationId: 'loc-main', sortOrder: 2, isArchived: false },
  { id: 'stn-expo', name: 'Expo', locationId: 'loc-main', sortOrder: 3, isArchived: false },
  { id: 'stn-prep', name: 'prep kitchen', locationId: 'loc-main', sortOrder: 4, isArchived: false },
  { id: 'stn-dish', name: 'Dishwasher', locationId: 'loc-main', sortOrder: 5, isArchived: false },
];

const SEED_CATEGORIES: Category[] = [
  {
    id: 'cat-onboarding',
    slug: 'onboarding',
    nameEn: 'Onboarding',
    nameEs: 'Inducción y Capacitación',
    icon: 'LuClipboardList',
    isArchived: false,
    subcategories: [
      { id: 'sub-culture', slug: 'culture', nameEn: 'Culture', nameEs: 'Cultura' },
      { id: 'sub-uniform', slug: 'uniform', nameEn: 'Uniform', nameEs: 'Uniforme' },
      { id: 'sub-conduct', slug: 'conduct', nameEn: 'Employee Conduct', nameEs: 'Conducta del Empleado' },
    ],
  },
  {
    id: 'cat-safety',
    slug: 'food-safety',
    nameEn: 'Food Safety',
    nameEs: 'Seguridad Alimentaria',
    icon: 'LuShieldCheck',
    isArchived: false,
    subcategories: [
      { id: 'sub-hygiene', slug: 'hygiene', nameEn: 'Hygiene', nameEs: 'Higiene' },
      { id: 'sub-cross-contamination', slug: 'cross-contamination', nameEn: 'Cross-Contamination', nameEs: 'Contaminación Cruzada' },
      { id: 'sub-labeling-dating', slug: 'labeling-dating', nameEn: 'Labeling & Dating', nameEs: 'Etiquetado y Fechado' },
      { id: 'sub-allergy', slug: 'allergy', nameEn: 'Allergy', nameEs: 'Alergias' },
    ],
  },
  {
    id: 'cat-kitchen-ops',
    slug: 'kitchen-operations',
    nameEn: 'Kitchen Operations',
    nameEs: 'Operaciones de Cocina',
    icon: 'LuBuilding2',
    isArchived: false,
    subcategories: [
      { id: 'sub-station-setup', slug: 'station-setup', nameEn: 'Station Setup', nameEs: 'Montaje de Estación', isStationSpecific: true, stations: ['stn-gm', 'stn-grill', 'stn-expo', 'stn-prep', 'stn-dish'] },
      { id: 'sub-kitchen-comm', slug: 'kitchen-communication', nameEn: 'Kitchen Communication', nameEs: 'Comunicación en Cocina' },
    ],
  },
  {
    id: 'cat-cleaning',
    slug: 'cleaning',
    nameEn: 'Cleaning',
    nameEs: 'Limpieza',
    icon: 'LuBrush',
    isArchived: false,
    subcategories: [
      { id: 'sub-dishwashing', slug: 'dishwashing', nameEn: 'Dishwashing', nameEs: 'Lavadiscos' },
      { id: 'sub-chemical', slug: 'chemical-handling', nameEn: 'Chemical Handling', nameEs: 'Manejo de Químicos' },
      { id: 'sub-waste', slug: 'waste-disposal', nameEn: 'Waste Disposal', nameEs: 'Disposición de Desechos' },
    ],
  },
  {
    id: 'cat-opening-closing',
    slug: 'opening-closing',
    nameEn: 'Opening and Closing',
    nameEs: 'Apertura y Cierre',
    icon: 'LuPackage',
    isArchived: false,
    subcategories: [
      {
        id: 'sub-opening',
        slug: 'opening-procedures',
        nameEn: 'Opening Procedures',
        nameEs: 'Procedimientos de Apertura',
        isStationSpecific: true,
        stations: ['stn-gm', 'stn-grill', 'stn-expo', 'stn-prep', 'stn-dish'],
      },
      {
        id: 'sub-closing',
        slug: 'closing-procedures',
        nameEn: 'Closing Procedures',
        nameEs: 'Procedimientos de Cierre',
        isStationSpecific: true,
        stations: ['stn-gm', 'stn-grill', 'stn-expo', 'stn-prep', 'stn-dish'],
      },
      {
        id: 'sub-end-day',
        slug: 'end-of-day-checks',
        nameEn: 'End of Day Checks',
        nameEs: 'Verificaciones de Fin de Día',
        isStationSpecific: true,
        stations: ['stn-gm', 'stn-grill', 'stn-expo', 'stn-prep', 'stn-dish'],
      },
    ],
  },
  {
    id: 'cat-equipment',
    slug: 'equipment',
    nameEn: 'Equipment',
    nameEs: 'Equipamiento',
    icon: 'LuWrench',
    isArchived: false,
    subcategories: [
      {
        id: 'sub-operation',
        slug: 'operation',
        nameEn: 'Operation',
        nameEs: 'Operación',
        isStationSpecific: true,
        stations: ['stn-gm', 'stn-grill', 'stn-expo', 'stn-prep', 'stn-dish'],
      },
      {
        id: 'sub-eq-safety',
        slug: 'equipment-safety',
        nameEn: 'Safety',
        nameEs: 'Seguridad',
        isStationSpecific: true,
        stations: ['stn-gm', 'stn-grill', 'stn-expo', 'stn-prep', 'stn-dish'],
      },
      {
        id: 'sub-eq-cleaning',
        slug: 'equipment-cleaning',
        nameEn: 'Cleaning',
        nameEs: 'Limpieza',
        isStationSpecific: true,
        stations: ['stn-gm', 'stn-grill', 'stn-expo', 'stn-prep', 'stn-dish'],
      },
    ],
  },
  {
    id: 'cat-recipes',
    slug: 'recipes',
    nameEn: 'Recipes',
    nameEs: 'Recetas',
    icon: 'LuUtensils',
    isArchived: false,
    subcategories: [
      {
        id: 'sub-plating',
        slug: 'plating',
        nameEn: 'Plating',
        nameEs: 'Emplatado',
        isStationSpecific: true,
        stations: ['stn-gm', 'stn-grill', 'stn-expo'],
      },
      {
        id: 'sub-cooking',
        slug: 'cooking',
        nameEn: 'Cooking',
        nameEs: 'Cocción',
        isStationSpecific: true,
        stations: ['stn-gm', 'stn-grill'],
      },
      {
        id: 'sub-portion',
        slug: 'portion-standards',
        nameEn: 'Portion Standards',
        nameEs: 'Estándares de Porción',
      },
    ],
  },
];

const SEED_EMPLOYEES: AdminEmployee[] = [
  {
    id: 'emp-admin',
    name: 'Chef Raúl Medina',
    locationId: 'loc-main',
    accessLevel: 'manager',
    roleIds: ['role-exec'],
    stationIds: [],
    clearanceLevel: 'master',
    role: 'admin',
    languagePref: 'en',
    employeeCode: 'EMP-001',
    status: 'active',
    createdAt: '2026-01-10T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'master',
  },
  {
    id: 'emp-cook',
    name: 'Carlos Gomez',
    locationId: 'loc-main',
    accessLevel: 'employee',
    roleIds: ['role-cook'],
    stationIds: ['stn-grill'],
    clearanceLevel: 'station',
    role: 'employee',
    languagePref: 'es',
    employeeCode: 'EMP-002',
    status: 'active',
    createdAt: '2026-02-01T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'station',
  },
  {
    id: 'emp-prep',
    name: 'Maria Santos',
    locationId: 'loc-main',
    accessLevel: 'employee',
    roleIds: ['role-prep'],
    stationIds: ['stn-prep'],
    clearanceLevel: 'general',
    role: 'employee',
    languagePref: 'es',
    employeeCode: 'EMP-003',
    status: 'active',
    createdAt: '2026-02-15T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'general',
  },
];

const SEED_PROCEDURES: Procedure[] = [
  {
    id: 'proc-cleaning',
    slug: 'cleaning-and-sanitising',
    titleEn: 'Cleaning and sanitising food contact surfaces',
    titleEs: 'Limpieza y desinfección de superficies en contacto con alimentos',
    purposeEn: 'To prevent foodborne illness by making sure every surface that touches food is cleaned and sanitised before it is used.',
    purposeEs: 'Para prevenir enfermedades transmitidas por alimentos asegurando que cada superficie que toque alimentos se limpie y desinfecte.',
    category: SEED_CATEGORIES[0],
    status: 'published',
    createdBy: 'emp-admin',
    createdAt: '2026-09-04T00:00:00Z',
    updatedAt: '2026-09-04T00:00:00Z',
    version: 1,
    isArchived: false,
    quizId: 'quiz-cleaning',
    linkedTrainingId: 'course-food-safety',
    quizMode: 'training',
    bodyEn: {
      blocks: [
        { id: 'cl-img', kind: 'image', src: '/img/cover-sanitising.jpg', hint: 'photo',
          alt: { en: 'Two red buckets on a stainless bench, labelled WASH and SANITISE, a cloth over each rim and a bottle of test strips beside them.', es: 'Dos cubetas rojas sobre una mesa de acero, rotuladas LAVAR y DESINFECTAR, con un paño en cada borde y un frasco de tiras reactivas al lado.' } },
        { id: 'b1', kind: 'heading', level: 2, text: { en: 'Who this is for', es: 'A quién está dirigido' } },
        { id: 'b2', kind: 'text', body: { en: 'Everyone who prepares, cooks or plates food. It covers cutting boards, prep tables, knives, tongs, and slicers.', es: 'Todos los que preparan o sirven alimentos.' } },
        { id: 'b3', kind: 'heading', level: 2, text: { en: 'Equipment Needed', es: 'Equipo Necesario' } },
        { id: 'b4', kind: 'text', body: { en: 'Two buckets (Wash & Sanitise), detergent, clean cloths, quaternary ammonium sanitiser, and test strips.', es: 'Dos cubetas (Lavar y Desinfectar), detergente, paños limpios y tiras reactivas.' } },
        { id: 'b5', kind: 'warning', severity: 'warn', body: { en: 'Sanitiser is a chemical. Never mix it with bleach or ammonia products: fumes are dangerous.', es: 'El desinfectante es un producto químico. Nunca lo mezcle con blanqueador.' } },
        {
          id: 'b6',
          kind: 'method',
          steps: [
            { id: 's1', body: { en: 'Scrape all food debris off the surface into the bin.', es: 'Raspe todos los residuos de alimentos.' } },
            { id: 's2', body: { en: 'Wash with detergent and warm water from the Wash bucket.', es: 'Lave con detergente y agua tibia.' } },
            { id: 's3', body: { en: 'Rinse thoroughly with clean water.', es: 'Enjuague con agua limpia.' } },
            {
              id: 's4',
              critical: true,
              body: { en: 'Apply sanitiser from Sanitise bucket. Leave for full contact time (30 sec).', es: 'Aplique el desinfectante y deje actuar 30 segundos.' },
              criticalLimit: {
                value: '200 ppm, for at least 30 seconds',
                subtitle: 'Quaternary ammonium solution strength',
                howToCheck: 'Dip a test strip into the sanitiser bucket.',
                breachLabel: 'If reading is below 200 ppm',
                breachResponse: 'Remake the sanitiser bucket fresh and test again.',
              },
            },
            { id: 's5', body: { en: 'Let surface air dry completely. Do not wipe dry with towels.', es: 'Deje secar al aire libre. No use toallas.' } },
          ],
        },
      ],
    },
    bodyEs: {
      blocks: [
        { id: 'cl-img', kind: 'image', src: '/img/cover-sanitising.jpg', hint: 'photo',
          alt: { en: 'Two red buckets on a stainless bench, labelled WASH and SANITISE, a cloth over each rim and a bottle of test strips beside them.', es: 'Dos cubetas rojas sobre una mesa de acero, rotuladas LAVAR y DESINFECTAR, con un paño en cada borde y un frasco de tiras reactivas al lado.' } },
        { id: 'b1', kind: 'heading', level: 2, text: { en: 'Who this is for', es: 'A quién está dirigido' } },
        { id: 'b2', kind: 'text', body: { en: 'Everyone who prepares, cooks or plates food.', es: 'Todos los que preparan o sirven alimentos.' } },
        { id: 'b3', kind: 'heading', level: 2, text: { en: 'Equipment Needed', es: 'Equipo Necesario' } },
        { id: 'b4', kind: 'text', body: { en: 'Two buckets (Wash & Sanitise), detergent, clean cloths.', es: 'Dos cubetas (Lavar y Desinfectar), detergente, paños limpios.' } },
        { id: 'b5', kind: 'warning', severity: 'warn', body: { en: 'Sanitiser is a chemical.', es: 'El desinfectante es un producto químico. Nunca lo mezcle con blanqueador.' } },
        {
          id: 'b6',
          kind: 'method',
          steps: [
            { id: 's1', body: { en: 'Scrape food debris.', es: 'Raspe todos los residuos de alimentos.' } },
            { id: 's2', body: { en: 'Wash with detergent.', es: 'Lave con detergente y agua tibia.' } },
            { id: 's3', body: { en: 'Rinse with clean water.', es: 'Enjuague con agua limpia.' } },
            {
              id: 's4',
              critical: true,
              body: { en: 'Apply sanitiser.', es: 'Aplique el desinfectante y deje actuar 30 segundos.' },
              criticalLimit: {
                value: '200 ppm por 30 segundos',
                subtitle: 'Concentración de solución desinfectante',
                howToCheck: 'Sumerja una tira reactiva.',
                breachLabel: 'Si es menor a 200 ppm',
                breachResponse: 'Prepare una nueva solución.',
              },
            },
            { id: 's5', body: { en: 'Air dry.', es: 'Deje secar al aire libre.' } },
          ],
        },
      ],
    },
  },
  {
    id: 'proc-handwashing',
    slug: 'handwashing-procedure',
    titleEn: 'Handwashing and Personal Hygiene Standard',
    titleEs: 'Norma de Lavado de Manos e Higiene Personal',
    purposeEn: 'Ensure all team members clean hands thoroughly before handling food.',
    purposeEs: 'Garantizar que todos se laven las manos antes de manipular alimentos.',
    category: SEED_CATEGORIES[3],
    status: 'published',
    createdBy: 'emp-admin',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    version: 1,
    isArchived: false,
    quizId: null,
    linkedTrainingId: 'course-food-safety',
    quizMode: 'training',
    bodyEn: {
      blocks: [
        { id: 'h1', kind: 'heading', level: 1, text: { en: 'Proper Handwashing Procedure', es: 'Procedimiento Correcto de Lavado de Manos' } },
        { id: 'h2', kind: 'text', body: { en: 'Wash hands for 20 seconds using warm water (100°F/38°C) and anti-bacterial soap.', es: 'Lávese las manos durante 20 segundos con agua tibia y jabón.' } },
        { id: 'h3', kind: 'heading', level: 2, text: { en: 'When to Wash Hands', es: 'Cuándo Lavarse las Manos' } },
        { id: 'h4', kind: 'text', body: { en: 'Wash before starting work, after handling raw meat, after using restrooms, and after touching face or phone.', es: 'Lávese antes de empezar a trabajar, después de manipular carne cruda y después de usar el baño.' } },
      ],
    },
    bodyEs: {
      blocks: [
        { id: 'h1', kind: 'heading', level: 1, text: { en: 'Proper Handwashing Procedure', es: 'Procedimiento Correcto de Lavado de Manos' } },
        { id: 'h2', kind: 'text', body: { en: 'Wash hands for 20 seconds using warm water (100°F/38°C) and anti-bacterial soap.', es: 'Lávese las manos durante 20 segundos con agua tibia y jabón.' } },
        { id: 'h3', kind: 'heading', level: 2, text: { en: 'When to Wash Hands', es: 'Cuándo Lavarse las Manos' } },
        { id: 'h4', kind: 'text', body: { en: 'Wash before starting work, after handling raw meat, after using restrooms, and after touching face or phone.', es: 'Lávese antes de empezar a trabajar, después de manipular carne cruda y después de usar el baño.' } },
      ],
    },
  },
  {
    id: 'proc-opening-shift',
    slug: 'opening-shift-checklist',
    titleEn: 'Kitchen Opening Shift Prep & Checklist',
    titleEs: 'Lista de Control de Apertura de Cocina',
    purposeEn: 'Ensure all station refrigeration, hot holding, and prep lines are verified before service.',
    purposeEs: 'Asegurar la refrigeración, mantenimiento en caliente y líneas de preparación antes del servicio.',
    category: SEED_CATEGORIES[0],
    status: 'published',
    createdBy: 'emp-admin',
    createdAt: '2026-09-02T00:00:00Z',
    updatedAt: '2026-09-02T00:00:00Z',
    version: 1,
    isArchived: false,
    quizId: null,
    linkedTrainingId: 'course-kitchen-ops',
    quizMode: 'training',
    bodyEn: {
      blocks: [
        { id: 'op-img', kind: 'image', src: '/img/equipment.jpg', hint: 'photo',
          alt: { en: 'Everything for the shift laid out on the bench before service: produce, a stone molcajete, a digital scale and a stainless pan.', es: 'Todo lo del turno dispuesto en la mesa antes del servicio: producto, un molcajete de piedra, una báscula digital y una charola de acero.' } },
        { id: 'op-h1', kind: 'heading', level: 1, text: { en: 'Opening Sequence', es: 'Secuencia de Apertura' } },
        { id: 'op-t1', kind: 'text', body: { en: 'Turn on main ventilation hoods and verify air flow.', es: 'Encienda las campanas de extracción y verifique el flujo de aire.' } },
        { id: 'op-t2', kind: 'text', body: { en: 'Inspect walk-in cooler temperatures (must be below 40°F / 4°C).', es: 'Inspeccione la temperatura del refrigerador (debe estar por debajo de 4°C).' } },
        { id: 'op-t3', kind: 'text', body: { en: 'Prepare fresh sanitiser buckets for all stations.', es: 'Prepare cubetas de desinfectante fresco para todas las estaciones.' } },
        { id: 'op-t4', kind: 'text', body: { en: 'Log initial temperatures on the Morning Opening Temperature Sheet.', es: 'Registre las temperaturas iniciales en la hoja de apertura.' } },
      ],
    },
    bodyEs: {
      blocks: [
        { id: 'op-img', kind: 'image', src: '/img/equipment.jpg', hint: 'photo',
          alt: { en: 'Everything for the shift laid out on the bench before service: produce, a stone molcajete, a digital scale and a stainless pan.', es: 'Todo lo del turno dispuesto en la mesa antes del servicio: producto, un molcajete de piedra, una báscula digital y una charola de acero.' } },
        { id: 'op-h1', kind: 'heading', level: 1, text: { en: 'Opening Sequence', es: 'Secuencia de Apertura' } },
        { id: 'op-t1', kind: 'text', body: { en: 'Turn on main ventilation hoods and verify air flow.', es: 'Encienda las campanas de extracción y verifique el flujo de aire.' } },
        { id: 'op-t2', kind: 'text', body: { en: 'Inspect walk-in cooler temperatures (must be below 40°F / 4°C).', es: 'Inspeccione la temperatura del refrigerador (debe estar por debajo de 4°C).' } },
        { id: 'op-t3', kind: 'text', body: { en: 'Prepare fresh sanitiser buckets for all stations.', es: 'Prepare cubetas de desinfectante fresco para todas las estaciones.' } },
        { id: 'op-t4', kind: 'text', body: { en: 'Log initial temperatures on the Morning Opening Temperature Sheet.', es: 'Registre las temperaturas iniciales en la hoja de apertura.' } },
      ],
    },
  },
  {
    id: 'proc-salsa-verde',
    slug: 'salsa-verde-prep',
    titleEn: 'Salsa Verde Batch Preparation SOP',
    titleEs: 'Preparación de Lote de Salsa Verde',
    purposeEn: 'Standard procedure for roasting tomatillos, blending fresh ingredients, and storing salsa verde.',
    purposeEs: 'Procedimiento estándar para asar tomatillos, licuar e ingredientes y almacenar salsa verde.',
    category: SEED_CATEGORIES[1],
    status: 'published',
    createdBy: 'emp-admin',
    createdAt: '2026-09-03T00:00:00Z',
    updatedAt: '2026-09-03T00:00:00Z',
    version: 1,
    isArchived: false,
    quizId: null,
    linkedTrainingId: 'course-recipes',
    quizMode: 'training',
    bodyEn: {
      blocks: [
        { id: 'sv-img', kind: 'image', src: '/img/video-cover.jpg', hint: 'photo',
          alt: { en: 'Finished green salsa in a stone molcajete, on a bench with limes and chillies.', es: 'Salsa verde terminada en un molcajete de piedra, sobre la mesa con limones y chiles.' } },
        { id: 'sv-h1', kind: 'heading', level: 1, text: { en: 'Ingredients & Preparation', es: 'Ingredientes y Preparación' } },
        { id: 'sv-t1', kind: 'text', body: { en: 'Roast 5kg husked tomatillos on the plancha until evenly charred.', es: 'Ase 5 kg de tomatillos pelados en la plancha hasta que estén tatemados.' } },
        { id: 'sv-t2', kind: 'text', body: { en: 'Blend with fresh cilantro, jalapeno, garlic, onion, and sea salt.', es: 'Licúe con cilantro fresco, jalapeño, ajo, cebolla y sal de mar.' } },
        { id: 'sv-t3', kind: 'text', body: { en: 'Chill rapidly in an ice bath to below 41°F (5°C) within 2 hours.', es: 'Enfríe rápidamente en baño de hielo por debajo de 5°C en 2 horas.' } },
        { id: 'sv-t4', kind: 'text', body: { en: 'Label with name, prep date, use-by date (4 days max), and chef initials.', es: 'Etiquete con nombre, fecha de preparación, fecha de caducidad (máx. 4 días) e iniciales.' } },
      ],
    },
    bodyEs: {
      blocks: [
        { id: 'sv-img', kind: 'image', src: '/img/video-cover.jpg', hint: 'photo',
          alt: { en: 'Finished green salsa in a stone molcajete, on a bench with limes and chillies.', es: 'Salsa verde terminada en un molcajete de piedra, sobre la mesa con limones y chiles.' } },
        { id: 'sv-h1', kind: 'heading', level: 1, text: { en: 'Ingredients & Preparation', es: 'Ingredientes y Preparación' } },
        { id: 'sv-t1', kind: 'text', body: { en: 'Roast 5kg husked tomatillos on the plancha until evenly charred.', es: 'Ase 5 kg de tomatillos pelados en la plancha hasta que estén tatemados.' } },
        { id: 'sv-t2', kind: 'text', body: { en: 'Blend with fresh cilantro, jalapeno, garlic, onion, and sea salt.', es: 'Licúe con cilantro fresco, jalapeño, ajo, cebolla y sal de mar.' } },
        { id: 'sv-t3', kind: 'text', body: { en: 'Chill rapidly in an ice bath to below 41°F (5°C) within 2 hours.', es: 'Enfríe rápidamente en baño de hielo por debajo de 5°C en 2 horas.' } },
        { id: 'sv-t4', kind: 'text', body: { en: 'Label with name, prep date, use-by date (4 days max), and chef initials.', es: 'Etiquete con nombre, fecha de preparación, fecha de caducidad (máx. 4 días) e iniciales.' } },
      ],
    },
  },
  {
    id: 'proc-grill-safety',
    slug: 'grill-station-safety',
    titleEn: 'Grill Station Setup & Temperature Logging',
    titleEs: 'Configuración de Estación de Parrilla y Registro de Temperatura',
    purposeEn: 'Ensure grill line safety standards, grease trap inspection, and core cooking temperature compliance.',
    purposeEs: 'Garantizar normas de seguridad en la parrilla, inspección de trampa de grasa y temperaturas de cocción.',
    category: SEED_CATEGORIES[4],
    status: 'published',
    createdBy: 'emp-admin',
    createdAt: '2026-09-05T00:00:00Z',
    updatedAt: '2026-09-05T00:00:00Z',
    version: 1,
    isArchived: false,
    quizId: null,
    linkedTrainingId: 'course-kitchen-ops',
    quizMode: 'training',
    bodyEn: {
      blocks: [
        { id: 'gr-img', kind: 'image', src: '/img/cover-fryer-oil.jpg', hint: 'photo',
          alt: { en: 'The hot line at the start of a shift, with the equipment clean and the guards in place.', es: 'La línea caliente al inicio del turno, con el equipo limpio y los protectores colocados.' } },
        { id: 'gr-h1', kind: 'heading', level: 1, text: { en: 'Safety & Setup Guidelines', es: 'Instrucciones de Seguridad y Configuración' } },
        { id: 'gr-t1', kind: 'text', body: { en: 'Verify grease trays are emptied and flame guards are positioned correctly.', es: 'Verifique que las charolas de grasa estén vacías y los protectores colocados.' } },
        { id: 'gr-t2', kind: 'text', body: { en: 'Preheat grill surface to minimum 450°F (230°C) before placing proteins.', es: 'Precaliente la superficie de la parrilla a un mínimo de 230°C.' } },
        { id: 'gr-t3', kind: 'text', body: { en: 'Use separate red tongs for raw proteins and yellow tongs for cooked meats.', es: 'Use pinzas rojas separadas para proteínas crudas y pinzas amarillas para carnes cocidas.' } },
      ],
    },
    bodyEs: {
      blocks: [
        { id: 'gr-img', kind: 'image', src: '/img/cover-fryer-oil.jpg', hint: 'photo',
          alt: { en: 'The hot line at the start of a shift, with the equipment clean and the guards in place.', es: 'La línea caliente al inicio del turno, con el equipo limpio y los protectores colocados.' } },
        { id: 'gr-h1', kind: 'heading', level: 1, text: { en: 'Safety & Setup Guidelines', es: 'Instrucciones de Seguridad y Configuración' } },
        { id: 'gr-t1', kind: 'text', body: { en: 'Verify grease trays are emptied and flame guards are positioned correctly.', es: 'Verifique que las charolas de grasa estén vacías y los protectores colocados.' } },
        { id: 'gr-t2', kind: 'text', body: { en: 'Preheat grill surface to minimum 450°F (230°C) before placing proteins.', es: 'Precaliente la superficie de la parrilla a un mínimo de 230°C.' } },
        { id: 'gr-t3', kind: 'text', body: { en: 'Use separate red tongs for raw proteins and yellow tongs for cooked meats.', es: 'Use pinzas rojas separadas para proteínas crudas y pinzas amarillas para carnes cocidas.' } },
      ],
    },
  },
];

// ----------------------------------------------------------------------------
// Local Storage / State Helpers
// ----------------------------------------------------------------------------

function getStored<T>(key: string, seed: T): T {
  if (typeof window === 'undefined') return seed;
  try {
    const raw = localStorage.getItem(`lms_demo_${key}`);
    return raw ? (JSON.parse(raw) as T) : seed;
  } catch {
    return seed;
  }
}

function setStored<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`lms_demo_${key}`, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

let mockLocations: Location[] = getStored('locations', SEED_LOCATIONS);
let mockRoles: Role[] = getStored('roles', SEED_ROLES);
let mockStations: Station[] = getStored('stations', SEED_STATIONS);
let mockCategories: Category[] = getStored('categories_v3', SEED_CATEGORIES);
let mockEmployees: AdminEmployee[] = getStored('employees', SEED_EMPLOYEES);
let mockProcedures: Procedure[] = getStored('procedures', SEED_PROCEDURES);
// Centralised quizzes table. The wizard authors quizzes locally in form
// state and on save calls `createQuiz()` to materialise a row here and
// stamp its id onto the procedure. Stage 3 (course creation) writes to
// the same store — that is the whole point of having one table.
let mockQuizzes: Quiz[] = getStored('quizzes', SEED_QUIZZES);

function getLocationsStore(): Location[] {
  if (typeof window !== 'undefined') mockLocations = getStored('locations', SEED_LOCATIONS);
  return mockLocations;
}
function getRolesStore(): Role[] {
  if (typeof window !== 'undefined') mockRoles = getStored('roles', SEED_ROLES);
  return mockRoles;
}
function getStationsStore(): Station[] {
  if (typeof window !== 'undefined') mockStations = getStored('stations', SEED_STATIONS);
  return mockStations;
}
function getCategoriesStore(): Category[] {
  if (typeof window !== 'undefined') mockCategories = getStored('categories_v3', SEED_CATEGORIES);
  return mockCategories;
}
function getEmployeesStore(): AdminEmployee[] {
  if (typeof window !== 'undefined') mockEmployees = getStored('employees', SEED_EMPLOYEES);
  return mockEmployees;
}
function getProceduresStore(): Procedure[] {
  if (typeof window !== 'undefined') mockProcedures = getStored('procedures', SEED_PROCEDURES);
  return mockProcedures;
}
function getQuizzesStore(): Quiz[] {
  if (typeof window !== 'undefined') mockQuizzes = getStored('quizzes', SEED_QUIZZES);
  return mockQuizzes;
}

// ----------------------------------------------------------------------------
// Typed endpoints (Zero Backend Demo Mode)
// ----------------------------------------------------------------------------

export interface LoginInput {
  name: string;
  password: string;
  locationId: string;
  deviceMode?: 'personal' | 'shared';
}

export async function login(input: LoginInput): Promise<{ employee: Employee }> {
  const emps = getEmployeesStore();
  const needle = (input.name || '').toLowerCase().trim();
  let emp: AdminEmployee | undefined;

  if (needle) {
    emp = emps.find((e) => e.name.toLowerCase().includes(needle) || e.employeeCode?.toLowerCase() === needle);
  }

  if (!emp) {
    if (
      needle.includes('cook') ||
      needle.includes('employee') ||
      needle.includes('prep') ||
      needle.includes('carlos') ||
      needle.includes('maria')
    ) {
      emp = emps.find((e) => e.role === 'employee');
    } else if (needle.includes('admin') || needle.includes('chef') || needle.includes('raul')) {
      emp = emps.find((e) => e.role === 'admin');
    }
  }

  if (!emp) {
    emp = emps[0];
  }

  if (typeof window !== 'undefined') {
    setStored('current_user', emp);
    document.cookie = `lms_role=${emp.role}; path=/; max-age=864000`;
    document.cookie = `lms_emp_id=${emp.id}; path=/; max-age=864000`;
  }

  return { employee: emp };
}

export async function logout(): Promise<{ ok: true }> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('lms_demo_current_user');
      document.cookie = 'lms_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'lms_emp_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    } catch {
      // Ignore
    }
  }
  return { ok: true };
}

export async function fetchMe(cookieHeader?: string, _signal?: AbortSignal): Promise<{ employee: Employee }> {
  const emps = getEmployeesStore();

  if (cookieHeader) {
    const idMatch = cookieHeader.match(/lms_emp_id=([^;]+)/);
    const roleMatch = cookieHeader.match(/lms_role=([^;]+)/);
    if (idMatch && idMatch[1]) {
      const found = emps.find((e) => e.id === idMatch[1].trim());
      if (found) return { employee: found };
    }
    if (roleMatch && roleMatch[1]) {
      const found = emps.find((e) => e.role === roleMatch[1].trim());
      if (found) return { employee: found };
    }
  }

  if (typeof window !== 'undefined') {
    const stored = getStored<Employee | null>('current_user', null);
    if (stored) {
      const found = emps.find((e) => e.id === stored.id) || stored;
      return { employee: found };
    }
    const roleMatch = document.cookie.match(/lms_role=([^;]+)/);
    if (roleMatch && roleMatch[1]) {
      const found = emps.find((e) => e.role === roleMatch[1].trim());
      if (found) return { employee: found };
    }
  }

  return { employee: emps[0] };
}

// ----------------------------------------------------------------------------
// Admin lookups
// ----------------------------------------------------------------------------

export async function listRoles(_cookieHeader?: string): Promise<{ roles: Role[] }> {
  return { roles: [...getRolesStore()] };
}

export async function listStations(
  locationId: string,
  _cookieHeader?: string,
  opts: { includeArchived?: boolean } = {},
): Promise<{ stations: Station[] }> {
  const filtered = getStationsStore().filter(
    (s) => s.locationId === locationId && (opts.includeArchived || !s.isArchived),
  );
  return { stations: filtered };
}

export async function listLocations(_cookieHeader?: string): Promise<{ locations: Location[] }> {
  return { locations: [...getLocationsStore()] };
}

// ----------------------------------------------------------------------------
// Admin employees
// ----------------------------------------------------------------------------

export async function listEmployees(
  opts: { status?: EmployeeStatus | 'all' } = {},
  _cookieHeader?: string,
): Promise<{ employees: AdminEmployee[] }> {
  const status = opts.status ?? 'all';
  const emps = getEmployeesStore();
  const filtered = status === 'all' ? emps : emps.filter((e) => e.status === status);
  return { employees: [...filtered] };
}

export async function createEmployee(input: CreateEmployeeInput): Promise<{ employee: Employee; invite: InviteResult }> {
  const loc = mockLocations.find((l) => l.id === input.locationId);

  // Highest clearance across all assigned job roles — what the LMS surfaces
  // in the employee table. Manager access defaults to 'confidential' when
  // no roles are attached yet (rare but the schema allows it).
  const assignedRoles = input.roleIds
    .map((id) => mockRoles.find((r) => r.id === id))
    .filter((r): r is Role => Boolean(r));
  const clearanceOrder: Record<typeof assignedRoles[number]['clearanceLevel'], number> = {
    general: 0,
    station: 1,
    confidential: 2,
    master: 3,
  };
  const highestClearance =
    assignedRoles.length === 0
      ? input.accessLevel === 'manager' ? 'confidential' : 'general'
      : assignedRoles.reduce((acc, r) => (clearanceOrder[r.clearanceLevel] > clearanceOrder[acc.clearanceLevel] ? r : acc)).clearanceLevel;

  const newEmp: AdminEmployee = {
    id: `emp-${Date.now()}`,
    name: input.name,
    locationId: input.locationId,
    accessLevel: input.accessLevel,
    roleIds: [...input.roleIds],
    stationIds: [...(input.stationIds ?? [])],
    clearanceLevel: highestClearance,
    role: input.accessLevel === 'manager' ? 'admin' : 'employee',
    languagePref: input.languagePref ?? 'en',
    employeeCode: input.employeeCode ?? null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    deactivatedAt: null,
    locationName: loc?.name ?? null,
    roleClearance: highestClearance,
  };

  mockEmployees = [newEmp, ...mockEmployees];
  setStored('employees', mockEmployees);

  const invite: InviteResult = {
    url: typeof window !== 'undefined' ? `${window.location.origin}/activate/demo-token` : '#',
    code: '123456',
    expiresAt: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
  };

  return { employee: newEmp, invite };
}

export async function resendInvite(_employeeId: string): Promise<{ invite: InviteResult }> {
  return {
    invite: {
      url: typeof window !== 'undefined' ? `${window.location.origin}/activate/demo-token` : '#',
      code: '654321',
      expiresAt: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
    },
  };
}

export async function deactivateEmployee(employeeId: string): Promise<{ employee: AdminEmployee }> {
  mockEmployees = mockEmployees.map((e) =>
    e.id === employeeId ? { ...e, status: 'deactivated', deactivatedAt: new Date().toISOString() } : e,
  );
  setStored('employees', mockEmployees);
  const updated = mockEmployees.find((e) => e.id === employeeId)!;
  return { employee: updated };
}

export async function reactivateEmployee(employeeId: string): Promise<{ employee: AdminEmployee }> {
  mockEmployees = mockEmployees.map((e) =>
    e.id === employeeId ? { ...e, status: 'active', deactivatedAt: null } : e,
  );
  setStored('employees', mockEmployees);
  const updated = mockEmployees.find((e) => e.id === employeeId)!;
  return { employee: updated };
}

// ----------------------------------------------------------------------------
// Admin settings — stations, roles, locations
// ----------------------------------------------------------------------------

export async function createStation(input: CreateStationInput): Promise<{ station: Station }> {
  const newStation: Station = {
    id: `stn-${Date.now()}`,
    name: input.name,
    locationId: input.locationId,
    sortOrder: input.sortOrder ?? mockStations.length + 1,
    isArchived: false,
  };
  mockStations = [...mockStations, newStation];
  setStored('stations', mockStations);
  return { station: newStation };
}

export async function updateStation(stationId: string, patch: UpdateStationInput): Promise<{ station: Station }> {
  mockStations = mockStations.map((s) => (s.id === stationId ? { ...s, ...patch } : s));
  setStored('stations', mockStations);
  const updated = mockStations.find((s) => s.id === stationId)!;
  return { station: updated };
}

export async function archiveStation(stationId: string): Promise<{ station: Station }> {
  return updateStation(stationId, { isArchived: true });
}

export async function createRole(input: CreateRoleInput): Promise<{ role: Role }> {
  const newRole: Role = {
    id: `role-${Date.now()}`,
    name: input.name,
    clearanceLevel: input.clearanceLevel,
    createdAt: new Date().toISOString(),
  };
  mockRoles = [...mockRoles, newRole];
  setStored('roles', mockRoles);
  return { role: newRole };
}

export async function updateRole(roleId: string, patch: UpdateRoleInput): Promise<{ role: Role }> {
  mockRoles = mockRoles.map((r) => (r.id === roleId ? { ...r, ...patch } : r));
  setStored('roles', mockRoles);
  const updated = mockRoles.find((r) => r.id === roleId)!;
  return { role: updated };
}

export async function deleteRole(roleId: string): Promise<{ ok: true }> {
  mockRoles = mockRoles.filter((r) => r.id !== roleId);
  setStored('roles', mockRoles);
  return { ok: true };
}

export async function createLocation(input: CreateLocationInput): Promise<{ location: Location }> {
  const newLoc: Location = {
    id: `loc-${Date.now()}`,
    name: input.name,
  };
  mockLocations = [...mockLocations, newLoc];
  setStored('locations', mockLocations);
  return { location: newLoc };
}

export async function updateLocation(locationId: string, patch: UpdateLocationInput): Promise<{ location: Location }> {
  mockLocations = mockLocations.map((l) => (l.id === locationId ? { ...l, ...patch } : l));
  setStored('locations', mockLocations);
  const updated = mockLocations.find((l) => l.id === locationId)!;
  return { location: updated };
}

export async function deleteLocation(locationId: string): Promise<{ ok: true }> {
  mockLocations = mockLocations.filter((l) => l.id !== locationId);
  setStored('locations', mockLocations);
  return { ok: true };
}

// ----------------------------------------------------------------------------
// Activate
// ----------------------------------------------------------------------------

export async function lookupInvite(_token: string): Promise<{
  employeeName: string;
  expiresAt: string;
  employeeStatus: 'pending' | 'active' | 'deactivated';
}> {
  return {
    employeeName: 'Demo Employee',
    expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
    employeeStatus: 'pending',
  };
}

export async function activate(_input: { token: string; code: string; password: string }): Promise<{ employee: Employee }> {
  return { employee: mockEmployees[0] };
}

// ----------------------------------------------------------------------------
// Library — procedures
// ----------------------------------------------------------------------------

export async function createProcedure(input: CreateProcedureInput): Promise<{ procedure: Procedure }> {
  const cats = getCategoriesStore();
  const cat = cats.find((c) => c.id === input.categoryId) ?? null;
  const slug = input.titleEn.toLowerCase().replace(/[^a-z0-0]+/g, '-').replace(/(^-|-$)/g, '') || `proc-${Date.now()}`;

  const newProc: Procedure = {
    id: `proc-${Date.now()}`,
    slug,
    titleEn: input.titleEn,
    titleEs: input.titleEs,
    purposeEn: input.purposeEn,
    purposeEs: input.purposeEs,
    category: cat,
    status: input.status ?? 'draft',
    bodyEn: input.bodyEn,
    bodyEs: input.bodyEs,
    // Subcategory under `categoryId`. Stored alongside the procedure so
    // the library can filter by it without re-joining categories.
    subcategoryId: input.subcategoryId ?? null,
    // Per-procedure station scope. Stored alongside the procedure so
    // the cook's station assignment can be matched against it on read.
    stationScope: input.stationScope ?? null,
    createdBy: 'emp-admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Per PROJECT_OVERVIEW §02 SOP Library: every print carries a QR
    // pointing at the current version. New procedures start at v1; the
    // backend bumps the version inside a SELECT FOR UPDATE on every
    // publish. The wizard never sets this explicitly.
    version: input.version ?? 1,
    // Per PROJECT_OVERVIEW §02 Content Creation: "Content moves through
    // draft, published and archived states." New procedures start
    // unarchived; archive is a separate admin action (⋯ kebab → Archive
    // → modal confirm).
    isArchived: input.isArchived ?? false,
    // FK to the centralised quizzes table. The wizard authors a quiz
    // locally in form state, calls createQuiz() first to materialise a
    // row, then passes that id here. `null` means the SOP has no quiz.
    quizId: input.quizId ?? null,
    // FK to a training course this SOP feeds into. `null` means the SOP
    // is standalone — not part of any training plan. The Training &
    // Quiz step captures this in the wizard.
    linkedTrainingId: input.linkedTrainingId ?? null,
    // Quiz visibility on the employee side. Defaults to 'training' so
    // standalone reads of the SOP hide the quiz; 'always' surfaces it on
    // every read. Ignored when quizId is null.
    quizMode: (input.quizMode ?? 'training') as ProcedureQuizMode,
  };

  mockProcedures = [newProc, ...getProceduresStore()];
  setStored('procedures', mockProcedures);
  return { procedure: newProc };
}

export async function listProcedures(
  filter: { status?: Procedure['status'] } = {},
  _cookieHeader?: string,
): Promise<{ procedures: Procedure[] }> {
  const procs = getProceduresStore();
  const filtered = filter.status ? procs.filter((p) => p.status === filter.status) : procs;
  return { procedures: [...filtered] };
}

// ----------------------------------------------------------------------------
// Library — quizzes (centralised table)
// ----------------------------------------------------------------------------

/** Look up every quiz in the centralised store. The reader-side
 *  component joins `procedure.quizId` against this list to render the
 *  quiz block. The wizard reads this list when it needs to copy an
 *  existing quiz onto a new procedure. */
export async function listQuizzes(): Promise<{ quizzes: Quiz[] }> {
  return { quizzes: [...getQuizzesStore()] };
}

/** Sync lookup for a single quiz by id. Read-side components
 *  (`procedure-view-client`, training pages) read this on each render
 *  to resolve `procedure.quizId` to its quiz data. The backend will
 *  swap this for a server-side join in the procedure / course response. */
export function getQuizById(id: string | null): Quiz | null {
  if (!id) return null;
  return getQuizzesStore().find((q) => q.id === id) ?? null;
}

/** Materialise a quiz row from the wizard's authored form state. Returns
 *  the id the wizard then stamps onto `procedure.quizId` via
 *  `createProcedure({ quizId })`. The backend will replace this with a
 *  POST to `/api/admin/quizzes`. */
export async function createQuiz(input: {
  questions: Quiz['questions'];
  attached: boolean;
}): Promise<{ quiz: Quiz }> {
  const now = new Date().toISOString();
  const newQuiz: Quiz = {
    id: `quiz-${Date.now()}`,
    questions: input.questions,
    attached: input.attached,
    createdAt: now,
    updatedAt: now,
  };
  mockQuizzes = [newQuiz, ...getQuizzesStore()];
  setStored('quizzes', mockQuizzes);
  return { quiz: newQuiz };
}

export async function getProcedureBySlug(
  slug: string,
  _cookieHeader?: string,
): Promise<{ procedure: Procedure }> {
  const normSlug = slug.toLowerCase();
  const procs = getProceduresStore();
  const proc = procs.find((p) => p.slug.toLowerCase() === normSlug || p.id.toLowerCase() === normSlug);

  if (!proc) {
    throw new ApiException(404, 'PROCEDURE_NOT_FOUND', `Procedure ${slug} not found`);
  }
  return { procedure: proc };
}

// ----------------------------------------------------------------------------
// Library — categories
// ----------------------------------------------------------------------------

export async function listCategories(
  _locationId: string,
  opts: { includeArchived?: boolean } = {},
  _cookieHeader?: string,
): Promise<{ categories: Category[] }> {
  const cats = getCategoriesStore();
  const filtered = opts.includeArchived ? cats : cats.filter((c) => !c.isArchived);
  return { categories: [...filtered] };
}

export async function createCategory(input: {
  locationId: string;
  slug: string;
  nameEn: string;
  nameEs: string;
}): Promise<{ category: Category }> {
  const newCat: Category = {
    id: `cat-${Date.now()}`,
    slug: input.slug,
    nameEn: input.nameEn,
    nameEs: input.nameEs,
    isArchived: false,
  };
  mockCategories = [...getCategoriesStore(), newCat];
  setStored('categories_v3', mockCategories);
  return { category: newCat };
}

export async function updateCategory(
  id: string,
  patch: { nameEn?: string; nameEs?: string; isArchived?: boolean },
): Promise<{ category: Category }> {
  const cats = getCategoriesStore();
  mockCategories = cats.map((c) => (c.id === id ? { ...c, ...patch } : c));
  setStored('categories_v3', mockCategories);
  const updated = mockCategories.find((c) => c.id === id)!;
  return { category: updated };
}

export async function archiveCategory(id: string): Promise<{ category: Category }> {
  return updateCategory(id, { isArchived: true });
}

// ----------------------------------------------------------------------------
// Uploads & AI Import (Mock Presigned Uploads)
// ----------------------------------------------------------------------------

export interface PresignedUpload {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
}

export async function requestImageUpload(
  input: { filename: string; contentType: string; size: number },
  _cookieHeader?: string,
): Promise<PresignedUpload> {
  return {
    uploadUrl: 'mock-upload',
    key: `images/${Date.now()}-${input.filename}`,
    publicUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    expiresIn: 3600,
  };
}

export async function requestVideoUpload(
  input: { filename: string; contentType: string; size: number },
  _cookieHeader?: string,
): Promise<PresignedUpload> {
  return {
    uploadUrl: 'mock-upload',
    key: `videos/${Date.now()}-${input.filename}`,
    publicUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    expiresIn: 3600,
  };
}

export async function requestDocumentUpload(
  input: { filename: string; contentType: string; size: number },
): Promise<PresignedUpload> {
  return {
    uploadUrl: 'mock-upload',
    key: `docs/${Date.now()}-${input.filename}`,
    publicUrl: `https://example.com/demo-${input.filename}`,
    expiresIn: 3600,
  };
}

export async function importDocument(input: {
  publicUrl: string;
  filename: string;
  contentType: string;
  procedureType: ImportProcedureType;
}): Promise<{ extraction: ExtractedProcedure }> {
  // Simulate Gemini AI Extraction delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  const sampleTitle = input.filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  return {
    extraction: {
      extractedLanguage: 'en',
      title: {
        en: sampleTitle.charAt(0).toUpperCase() + sampleTitle.slice(1),
        es: sampleTitle.charAt(0).toUpperCase() + sampleTitle.slice(1) + ' (ES)',
      },
      purpose: {
        en: 'Imported standard operating procedure draft generated from document analysis.',
        es: 'Borrador de procedimiento operativo estándar generado a partir del análisis del documento.',
      },
      blocks: [
        {
          kind: 'heading',
          level: 2,
          text: { en: 'Overview & Purpose', es: 'Descripción y Propósito' },
        },
        {
          kind: 'text',
          body: {
            en: `Extracted key instructions from source file "${input.filename}". Review steps and critical bounds below.`,
            es: `Instrucciones clave extraídas del archivo de origen "${input.filename}".`,
          },
        },
        {
          kind: 'method',
          steps: [
            { body: { en: 'Prepare equipment and verify safety area is clear.', es: 'Prepare el equipo y verifique el área.' } },
            { body: { en: 'Check temperature / concentration requirements before operating.', es: 'Verifique los requisitos de temperatura.' } },
          ],
        },
      ],
    },
  };
}

export async function uploadToR2(
  _uploadUrl: string,
  _file: Blob,
  _contentType: string,
): Promise<void> {
  // Demo mode: No-op
}

export async function deleteUpload(_input: { url: string }): Promise<{ ok: true }> {
  return { ok: true };
}