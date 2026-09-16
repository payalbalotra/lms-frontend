// Mirror backend types (no shared package). Backend source of truth:
//   lms-backend/src/db/schema.ts (enums + table shapes)
//   lms-backend/src/controllers/admin/employees.ts (public row)

export type ClearanceLevel = 'general' | 'station' | 'confidential' | 'master';
export type LanguagePref = 'en' | 'es';
export type EmployeeStatus = 'pending' | 'active' | 'deactivated';

export interface Employee {
  id: string;
  name: string;
  locationId: string;
  roleId: string;
  stationId: string | null;
  clearanceLevel: ClearanceLevel;
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

export interface Procedure {
  id: string;
  slug: string;
  titleEn: string;
  titleEs: string;
  purposeEn: string;
  purposeEs: string;
  categoryKey: string;
  status: ProcedureStatus;
  bodyEn: ProcedureBody;
  bodyEs: ProcedureBody;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProcedureInput {
  titleEn: string;
  titleEs: string;
  purposeEn: string;
  purposeEs: string;
  categoryKey: string;
  status?: ProcedureStatus;
  bodyEn: ProcedureBody;
  bodyEs: ProcedureBody;
}
