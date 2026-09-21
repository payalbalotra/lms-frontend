// Mirror backend types (no shared package). Backend source of truth:
//   lms-backend/src/db/schema.ts (enums + table shapes)
//   lms-backend/src/controllers/admin/employees.ts (public row)

export type ClearanceLevel = 'general' | 'station' | 'confidential' | 'master';
export type LanguagePref = 'en' | 'es';
export type EmployeeStatus = 'pending' | 'active' | 'deactivated';

/** Coarse product-role gate — the only thing the frontend uses for routing,
 *  chrome visibility, and back-link target. Backend will return this from
 *  `fetchMe` once the session shape is redesigned; in mock data the seed
 *  marks one employee `admin` and the rest `employee`. `clearanceLevel`
 *  remains the fine-grained tier (general / station / confidential / master)
 *  and is still surfaced in admin tables, but is not used for navigation. */
export type EmployeeRole = 'admin' | 'employee';

export interface Employee {
  id: string;
  name: string;
  locationId: string;
  roleId: string;
  stationId: string | null;
  clearanceLevel: ClearanceLevel;
  role: EmployeeRole;
  languagePref: LanguagePref;
}

export interface Role {
  id: string;
  name: string;
  clearanceLevel: ClearanceLevel;
  createdAt: string;
}

export interface Station {
  id: string;
  name: string;
  locationId: string;
  sortOrder: number;
  isArchived: boolean;
}

export interface Location {
  id: string;
  name: string;
}

export interface InviteResult {
  url: string;
  code: string;
  expiresAt: string;
}

export interface AdminEmployee extends Employee {
  employeeCode: string | null;
  status: EmployeeStatus;
  createdAt: string;
  deactivatedAt: string | null;
  locationName: string | null;
  roleClearance: ClearanceLevel | null;
}

export interface CreateEmployeeInput {
  name: string;
  email?: string | null;
  locationId: string;
  roleId: string;
  stationId?: string | null;
  clearanceLevel: ClearanceLevel;
  employeeCode?: string | null;
  languagePref?: LanguagePref;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    lockedUntil?: string;
    /** Per-field validation details (paths + messages) returned by the
     *  backend on `INVALID_INPUT`. */
    details?: { path: string; message: string }[];
  };
}

// ============================================================================
// Settings CRUD inputs (mirror backend service input shapes)
// ============================================================================

export interface CreateStationInput {
  name: string;
  locationId: string;
  sortOrder?: number;
}

export interface UpdateStationInput {
  name?: string;
  sortOrder?: number;
  isArchived?: boolean;
}

export interface CreateRoleInput {
  name: string;
  clearanceLevel: ClearanceLevel;
}

export interface UpdateRoleInput {
  name?: string;
  clearanceLevel?: ClearanceLevel;
}

export interface CreateLocationInput {
  name: string;
}

export interface UpdateLocationInput {
  name: string;
}

// ============================================================================
// Library — procedures (SOPs, recipes, training chapters)
// ============================================================================

export type ProcedureStatus = 'draft' | 'published';

/** Manager-defined category. Slug is the stable handle (URL-safe, unique
 *  per location); `nameEn` / `nameEs` are the bilingual display labels.
 *  Soft archive via `isArchived` — procedures that referenced an archived
 *  category keep working and surface `null` on the read side. Icon lives
 *  in code, not here (see lib/category-icons.ts). */
export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameEs: string;
  isArchived: boolean;
}

/** Text filled in for both languages. */
export interface Localised {
  en: string;
  es: string;
}

/** Same shape, each side optional (captions, alt text). */
export interface LocalisedOptional {
  en?: string;
  es?: string;
}

export interface CriticalLimit {
  label?: string;
  icon?: string;
  value: string;
  subtitle?: string;
  howToCheck: string;
  breachLabel: string;
  breachResponse: string;
}

export type ProcedureNoteKind = 'warn' | 'tip' | 'alt' | 'equip' | 'allergen';

/** A clip within a video file, pinned to a specific procedure step. */
export interface ProcedureVideoSegment {
  src: string;
  startSec: number;
  endSec: number;
}

/** Recipe internals — shared by recipe block and the legacy recipe shape. */
export interface ProcedureMethodStep {
  id?: string;
  body: Localised;
  critical?: boolean;
  criticalLimit?: CriticalLimit;
  videoSegment?: ProcedureVideoSegment;
}

export interface ProcedureAllergen {
  summary: string;
  detail: string;
  /** Structured list of allergens present (e.g. ['milk', 'eggs']). The
   *  summary/detail stay as free-form supplementary copy. */
  selectedAllergens?: string[];
}

export interface ProcedureYieldItem {
  label: string;
  value: string;
  unit?: string;
  /** Does this number multiply with the batch? Batch weight and portion count do;
   *  portion size and time do not. Absent means it holds steady. */
  scales?: boolean;
}

export interface ProcedureIngredient {
  name: string;
  form?: string;
  allergen?: boolean;
  unit?: string;
  amounts: string[];
}

// ============================================================================
// Block discriminated union
// ============================================================================

export type ProcedureImageHint = 'photo' | 'diagram';

export type ProcedureBlock =
  | { id: string; kind: 'text'; body: Localised }
  | { id: string; kind: 'heading'; level: 1 | 2 | 3; text: Localised }
  | { id: string; kind: 'method'; steps: ProcedureMethodStep[] }
  | {
      id: string;
      kind: 'recipe';
      audience?: string;
      allergen?: ProcedureAllergen;
      yieldItems?: ProcedureYieldItem[];
      factors?: number[];
      ingredients?: ProcedureIngredient[];
      steps: ProcedureMethodStep[];
    }
  | {
      id: string;
      kind: 'image';
      src: string;
      alt: Localised;
      caption?: LocalisedOptional;
      hint: ProcedureImageHint;
    }
  | { id: string; kind: 'video'; src: string; caption?: LocalisedOptional }
  | { id: string; kind: 'warning'; severity: ProcedureNoteKind; body: Localised }
  | { id: string; kind: 'attachment'; title: Localised; href: string; meta?: string }
  | { id: string; kind: 'table'; headers: Localised[]; rows: Localised[][] };

export type ProcedureBlockKind = ProcedureBlock['kind'];

export interface ProcedureBody {
  blocks: ProcedureBlock[];
}

/** One quiz question. Bilingual prompt and choices. `correctChoiceId`
 *  references the choice the admin marked as right. */
export interface ProcedureQuizQuestion {
  id: string;
  prompt: Localised;
  choices: { id: string; label: Localised }[];
  correctChoiceId: string;
}

/** Quiz attached to a procedure. `attached` is the manual toggle set by
 *  the admin in the wizard; visibility on the reader side is the OR of
 *  `attached` and `procedure.attachedToTraining` (either path renders it). */
export interface ProcedureQuiz {
  questions: ProcedureQuizQuestion[];
  attached: boolean;
}

export interface Procedure {
  id: string;
  slug: string;
  titleEn: string;
  titleEs: string;
  purposeEn: string;
  purposeEs: string;
  category: Category | null;
  status: ProcedureStatus;
  bodyEn: ProcedureBody;
  bodyEs: ProcedureBody;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** Quiz attached to this procedure. Absent means no quiz authored yet. */
  quiz?: ProcedureQuiz | null;
  /** Whether this procedure is part of a training plan. When true, the
   *  quiz (if any) renders automatically. Independent of `quiz.attached`. */
  attachedToTraining?: boolean;
}

export interface CreateProcedureInput {
  titleEn: string;
  titleEs: string;
  purposeEn: string;
  purposeEs: string;
  categoryId: string | null;
  status?: ProcedureStatus;
  bodyEn: ProcedureBody;
  bodyEs: ProcedureBody;
  /** Quiz to attach on save. `null` / omitted means no quiz yet. The
   *  backend will mirror this onto the read side as `procedure.quiz`. */
  quiz?: ProcedureQuiz | null;
}

// ============================================================================
// AI extraction — mirror of services/extracted-procedure-schema.ts (frontend
// camelCase). Used by the wizard's DocumentImportPanel preview card so the
// manager can accept or reject each block before applying.
// ============================================================================

export type ExtractedBlock =
  | { kind: 'text'; body: Localised }
  | { kind: 'heading'; level: 1 | 2 | 3; text: Localised }
  | {
      kind: 'method';
      steps: { body: Localised }[];
    }
  | {
      kind: 'warning';
      severity: ProcedureNoteKind;
      body: Localised;
    }
  | {
      kind: 'table';
      headers: Localised[];
      rows: Localised[][];
    }
  | {
      kind: 'recipe';
      audience?: string;
      /** `scales` marks the yield numbers the batch control multiplies: a batch
       *  weight doubles, a portion size and a cooking time do not. Without it on
       *  the way in, the flag cannot survive a round trip and the control moves
       *  the ingredient column while the yield sits still. */
      yieldItems?: { label: string; value: string; unit?: string; scales?: boolean }[];
      ingredients?: {
        name: string;
        unit?: string;
        amounts: string[];
      }[];
      steps?: { body: Localised }[];
    };

export interface ExtractedRecipe {
  audience?: string;
  yieldItems?: { label: string; value: string; unit?: string }[];
  ingredients?: {
    name: string;
    unit?: string;
    amounts: string[];
  }[];
  steps?: { body: Localised }[];
  allergenSummary?: string;
}

export interface ExtractedProcedure {
  title?: Localised;
  purpose?: Localised;
  blocks?: ExtractedBlock[];
  recipe?: ExtractedRecipe;
  extractedLanguage: 'en' | 'es';
  notes?: string;
}

export type ImportProcedureType = 'recipe' | 'station' | 'cleaning' | 'general';
