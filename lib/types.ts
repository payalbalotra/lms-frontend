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

/** LMS access tier assigned at invite time — what this person can do in the
 *  app, distinct from the kitchen job they do. "Admin" is intentionally
 *  absent here; system admins are bootstrapped separately, not invited
 *  through the employee flow. */
export type AccessLevel = 'employee' | 'manager';

export interface Employee {
  id: string;
  name: string;
  locationId: string;
  /** LMS access tier. Distinct from `roleIds` (what job they do). */
  accessLevel: AccessLevel;
  /** One or more job roles (Line Cook, Prep Cook, ...). Sourced from the
   *  `Role` table; an employee's primary role is the first entry. */
  roleIds: string[];
  /** One or more stations the employee is assigned to. Stations are still
   *  scoped to a single `locationId`; multi-location station assignment is
   *  out of scope for stage 1. */
  stationIds: string[];
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
  /** Highest clearance level across all assigned job roles, surfaced in
   *  the admin list. `null` when the employee has no job roles. */
  roleClearance: ClearanceLevel | null;
}

export interface CreateEmployeeInput {
  name: string;
  email?: string | null;
  locationId: string;
  /** LMS access tier. Required. 'manager' implies elevated permissions;
   *  'admin' is not assignable through the employee invite flow. */
  accessLevel: AccessLevel;
  /** One or more job roles (Line Cook, Prep Cook, ...). The first entry
   *  is treated as the employee's primary role. */
  roleIds: string[];
  /** Zero or more station ids. Stations are scoped to `locationId`. */
  stationIds?: string[];
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
export interface Subcategory {
  id: string;
  slug: string;
  nameEn: string;
  nameEs: string;
  categoryId?: string;
  isStationSpecific?: boolean;
  stations?: string[];
}

export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameEs: string;
  icon?: string;
  isArchived: boolean;
  subcategories?: Subcategory[];
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
  | { id: string; kind: 'table'; headers: Localised[]; rows: Localised[][] }
  | {
      id: string;
      kind: 'checklist';
      title?: LocalisedOptional;
      items: { id: string; text: Localised }[];
    };

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

/** A quiz row in the centralised `quizzes` table — the single source of
 *  truth for quiz data. Referenced by `Procedure.quizId` and (stage 3)
 *  by `Course.quizId`. Quizzes are never shared across procedures or
 *  courses; if the admin wants the same questions in two places, they
 *  author once and duplicate. Mirrors the legacy `ProcedureQuiz` authoring
 *  shape so `QuizEditor` and `QuizReader` work unchanged — the wizard
 *  authors `ProcedureQuiz` locally, and on save creates a `Quiz` row and
 *  stamps its id back onto the procedure. */
export interface Quiz {
  id: string;
  questions: ProcedureQuizQuestion[];
  /** Manual toggle. Visibility on the read side is the OR of this flag
   *  and the parent procedure / course's training-attached flag. */
  attached: boolean;
  createdAt: string;
  updatedAt: string;
}

/** How the attached quiz surfaces on the employee side.
 *  - `'training'` (default): quiz only shows when the employee opens this SOP
 *    from inside its linked training course. Standalone reads hide it.
 *  - `'always'`: quiz surfaces on every read of the SOP, with completion
 *    state tracked per employee (stage 3 — collapse + completed badge UX).
 *  Ignored when `quizId` is null. */
export type ProcedureQuizMode = 'training' | 'always';

/** Which stations this procedure applies to. `mode: 'all'` means the
 *  procedure is shown to every station regardless of the cook's station
 *  assignment; `mode: 'specific'` with a non-empty `stationIds` narrows
 *  the audience to those stations only. The empty-arrays case
 *  (`mode: 'specific'`, `stationIds: []`) means "specific stations chosen
 *  later" — the wizard blocks submit when this state is reached for a
 *  station-specific subcategory. Mirrors the rule in the categories
 *  editor where a station-specific subcategory enforces at least one
 *  station when authored. */
export interface ProcedureStationScope {
  mode: 'all' | 'specific';
  stationIds: string[];
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
  /** FK to the subcategory under the chosen `category`. Two procedures
   *  in the same category can land in different subcategories (e.g.
   *  Food Safety → Hygiene vs Allergy). `null` means the procedure has
   *  no subcategory yet (legacy / draft before the wizard's 2-column
   *  picker landed). Backend will hold this as `subcategory_id text`
   *  (nullable). */
  subcategoryId?: string | null;
  /** Per-procedure station scope. The subcategory already carries a
   *  `stations?: string[]` hint — the procedure may narrow or widen it.
   *  Absent when the procedure is general (no station scope). */
  stationScope?: ProcedureStationScope | null;
  /** Monotonic publish version. Bumped server-side on every publish
   *  inside a SELECT FOR UPDATE transaction so two concurrent publishes
   *  don't both write N+1. Per PROJECT_OVERVIEW §02 SOP Library: "Every
   *  SOP prints cleanly for station posting, carrying a QR code that
   *  links back to the current version." Starts at 1. */
  version?: number;
  /** Soft-archive flag. Per PROJECT_OVERVIEW §02 Content Creation:
   *  "Content moves through draft, published and archived states."
   *  Archived procedures stay visible in the admin library under an
   *  opt-in filter for audit; the cook-side reader hides them. */
  isArchived?: boolean;
  /** FK to the training course this SOP feeds into. `null` means the SOP
   *  is standalone — it is not part of any training plan and the employee
   *  only ever sees it via the library search. When non-null the linked
   *  training course is what gates quiz visibility per `quizMode`. The
   *  backend will add this column as `linked_training_id text` (nullable,
   *  no FK constraint yet — the `training_courses` table itself lands in
   *  stage 3, so the column stays free of the FK until then). */
  linkedTrainingId?: string | null;
  /** How the attached quiz surfaces on the employee side. Defaults to
   *  `'training'` for new procedures; ignored when `quizId` is null. See
   *  `ProcedureQuizMode` for the full rules. */
  quizMode?: ProcedureQuizMode;
  /** FK to the centralised `quizzes` table. `null` means no quiz attached.
   *  The wizard authors the quiz locally in form state, and on save
   *  creates a `Quiz` row via `createQuiz()` and stamps its id here. The
   *  backend persists this as `quiz_id text` (nullable). */
  quizId?: string | null;
  /** Whether this procedure is part of a training plan. Legacy field —
   *  kept until the training-course UI is reworked (employee phase). */
  attachedToTraining?: boolean;
  /** Procedure ids of SOPs / recipes this one references. Legacy
   *  training-course shape — kept until the Compliance / access model
   *  is finalised. Will become `linkedProcedureIds` for the SOP-only
   *  case once we decide whether SOPs link to other SOPs. */
  linkedSops?: string[];
  /** Acknowledgement gate at the end of a training course. Legacy —
   *  kept until training chapters own their own acknowledgement
   *  columns in the training-module slice (stage 3). */
  acknowledgement?: ProcedureAcknowledgement | null;
}

/** Course acknowledgement — the `I have read and understood` checkbox at
 *  the end of a regulated training chapter (DESIGN.md §3.4 `.ack` block). */
export interface ProcedureAcknowledgement {
  /** Human-readable version label, surfaced on the receipt (e.g. "v2026.09"). */
  versionLabel: string;
  /** Bilingual statement the employee is signing. */
  statement: Localised;
}

export interface CreateProcedureInput {
  titleEn: string;
  titleEs: string;
  purposeEn: string;
  purposeEs: string;
  categoryId: string | null;
  /** FK to the subcategory under `categoryId`. Required when the chosen
   *  subcategory belongs to a category that defines subcategories;
   *  optional otherwise. */
  subcategoryId?: string | null;
  /** Per-procedure station scope. The subcategory carries a default
   *  hint; the procedure may narrow or widen it. Omit when the
   *  procedure has no station scope (general / subcategory is general). */
  stationScope?: ProcedureStationScope | null;
  status?: ProcedureStatus;
  bodyEn: ProcedureBody;
  bodyEs: ProcedureBody;
  /** Publish version to stamp on creation. Defaults to 1 on the server
   *  when omitted; the backend bumps it inside SELECT FOR UPDATE on every
   *  subsequent publish. The wizard never sets this explicitly — the
   *  server-side default is the contract. */
  version?: number;
  /** Soft-archive flag. Defaults to false on creation. The wizard never
   *  sets this explicitly — archive is a separate admin action (⋯ kebab
   *  → Archive → modal confirm). */
  isArchived?: boolean;
  /** Training course this SOP feeds into. `null` / omitted means
   *  standalone — no training plan attached. The wizard's Training &
   *  Quiz step captures this; leaving it unset is the default. */
  linkedTrainingId?: string | null;
  /** How the attached quiz surfaces on the employee side. Defaults to
   *  `'training'`. Ignored when `quiz` is null. The wizard's Training &
   *  Quiz step captures this with a radio pair (Training only / Always). */
  quizMode?: ProcedureQuizMode;
  /** FK to a `Quiz` row to attach on save. `null` / omitted means no quiz
   *  yet. The wizard authors the quiz locally in form state, calls
   *  `createQuiz()` first to materialise the row, and passes the returned
   *  id here. The backend persists this as `quiz_id text` (nullable). */
  quizId?: string | null;
  /** Marks this procedure as a training course (vs an SOP / recipe).
   *  Surfaces it in the admin Training list, makes the employee Training
   *  tab its home, and gates the optional quiz block on read. */
  attachedToTraining?: boolean;
  /** Procedure ids of SOPs / recipes referenced from this course.
   *  Legacy training-course shape. */
  linkedSops?: string[];
  /** Acknowledgement statement shown on read; null/undefined disables.
   *  Legacy training-course shape. */
  acknowledgement?: ProcedureAcknowledgement | null;
}

// ============================================================================
// Training — admin-authored courses (procedures with attachedToTraining)
// and the assignment surface that connects a course to an employee.
// ============================================================================

/** Per-employee progress on a single training course. `overdue` is a
 *  derived status (dueAt < now && !complete) so it does not need to be
 *  persisted — the admin UI computes it from `dueAt` and `status`. */
export type TrainingAssignmentStatus = 'due' | 'in_progress' | 'complete' | 'overdue';

export interface TrainingAssignment {
  id: string;
  /** `procedure.id` of the course (a Procedure where attachedToTraining is true). */
  courseId: string;
  employeeId: string;
  /** ISO timestamp — when the admin assigned the course. */
  assignedAt: string;
  /** ISO timestamp — soft deadline; the employee sees a `pill-due` until it,
   *  `pill-overdue` once passed without `complete`. */
  dueAt: string;
  /** Last non-terminal status from the employee side. The admin list
   *  re-derives `overdue` from `dueAt` — see TrainingAssignmentRow below. */
  status: Exclude<TrainingAssignmentStatus, 'overdue'>;
  /** Procedure step ids the employee marked done. Empty array until they
   *  start; the per-step list lets the receipt show "X of Y steps done"
   *  without leaking an overall % (forbidden by DESIGN.md §8). */
  completedStepIds: string[];
  quizPassedAt: string | null;
  acknowledgedAt: string | null;
}

export interface CreateTrainingAssignmentInput {
  courseId: string;
  employeeId: string;
  dueAt: string;
}

/** Aggregated row used by `/admin/training`. Avoids recomputing counts on
 *  every render and pins the date math to server load. */
export interface TrainingCourseRow {
  course: Procedure;
  assignmentCount: number;
  completeCount: number;
  inProgressCount: number;
  overdueCount: number;
}

/** Aggregated row used by `/employee/training`. `effectiveStatus` lifts
 *  the `dueAt < now && status !== 'complete'` check out of every pill. */
export interface TrainingAssignmentRow {
  assignment: TrainingAssignment;
  course: Procedure;
  effectiveStatus: TrainingAssignmentStatus;
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
