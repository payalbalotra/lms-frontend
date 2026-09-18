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
  Role,
  Station,
  UpdateLocationInput,
  UpdateRoleInput,
  UpdateStationInput,
} from './types';

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
  { id: 'stn-grill', name: 'Hot Line / Grill', locationId: 'loc-main', sortOrder: 1, isArchived: false },
  { id: 'stn-prep', name: 'Prep & Cold Station', locationId: 'loc-main', sortOrder: 2, isArchived: false },
  { id: 'stn-dish', name: 'Sanitation & Dish', locationId: 'loc-main', sortOrder: 3, isArchived: false },
  { id: 'stn-tortilla', name: 'Tortilla Station', locationId: 'loc-main', sortOrder: 4, isArchived: false },
];

const SEED_CATEGORIES: Category[] = [
  { id: 'cat-station', slug: 'station', nameEn: 'Station Procedures', nameEs: 'Procedimientos de Estación', isArchived: false },
  { id: 'cat-recipes', slug: 'recipes', nameEn: 'Recipes & Prep', nameEs: 'Recetas y Preparación', isArchived: false },
  { id: 'cat-cleaning', slug: 'cleaning', nameEn: 'Cleaning Schedules', nameEs: 'Horarios de Limpieza', isArchived: false },
  { id: 'cat-safety', slug: 'food-safety', nameEn: 'Food Safety', nameEs: 'Seguridad Alimentaria', isArchived: false },
  { id: 'cat-equipment', slug: 'equipment', nameEn: 'Equipment Handling', nameEs: 'Manejo de Equipos', isArchived: false },
];

const SEED_EMPLOYEES: AdminEmployee[] = [
  {
    id: 'emp-admin',
    name: 'Chef Raúl Medina',
    locationId: 'loc-main',
    roleId: 'role-exec',
    stationId: null,
    clearanceLevel: 'master',
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
    roleId: 'role-cook',
    stationId: 'stn-grill',
    clearanceLevel: 'station',
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
    roleId: 'role-prep',
    stationId: 'stn-prep',
    clearanceLevel: 'general',
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
let mockCategories: Category[] = getStored('categories', SEED_CATEGORIES);
let mockEmployees: AdminEmployee[] = getStored('employees', SEED_EMPLOYEES);
let mockProcedures: Procedure[] = getStored('procedures', SEED_PROCEDURES);

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
  if (typeof window !== 'undefined') mockCategories = getStored('categories', SEED_CATEGORIES);
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

// ----------------------------------------------------------------------------
// Typed endpoints (Zero Backend Demo Mode)
// ----------------------------------------------------------------------------

export interface LoginInput {
  name: string;
  password: string;
  locationId: string;
  deviceMode?: 'personal' | 'shared';
}

export async function login(_input: LoginInput): Promise<{ employee: Employee }> {
  const emp = getEmployeesStore()[0];
  return { employee: emp };
}

export async function logout(): Promise<{ ok: true }> {
  return { ok: true };
}

export async function fetchMe(_cookieHeader?: string, _signal?: AbortSignal): Promise<{ employee: Employee }> {
  const emp = getEmployeesStore()[0];
  return { employee: emp };
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
  const role = mockRoles.find((r) => r.id === input.roleId);

  const newEmp: AdminEmployee = {
    id: `emp-${Date.now()}`,
    name: input.name,
    locationId: input.locationId,
    roleId: input.roleId,
    stationId: input.stationId ?? null,
    clearanceLevel: input.clearanceLevel,
    languagePref: input.languagePref ?? 'en',
    employeeCode: input.employeeCode ?? null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    deactivatedAt: null,
    locationName: loc?.name ?? null,
    roleClearance: role?.clearanceLevel ?? null,
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
    createdBy: 'emp-admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
  setStored('categories', mockCategories);
  return { category: newCat };
}

export async function updateCategory(
  id: string,
  patch: { nameEn?: string; nameEs?: string; isArchived?: boolean },
): Promise<{ category: Category }> {
  const cats = getCategoriesStore();
  mockCategories = cats.map((c) => (c.id === id ? { ...c, ...patch } : c));
  setStored('categories', mockCategories);
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