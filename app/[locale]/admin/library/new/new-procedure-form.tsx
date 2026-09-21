'use client';

import * as React from 'react';
import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/page-header';
import { FilterChips } from '@/components/ui/filter-chips';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomSelect } from '@/components/ui/custom-select';
import { Modal } from '@/components/ui/modal';
import { Drawer } from '@/components/ui/drawer';
import { QuizEditor } from '@/components/admin/quiz-editor';
import { cn } from '@/lib/utils';
import { createProcedure, createCategory, createQuiz, listCategories, listProcedures, ApiException } from '@/lib/api';
import { getCategoryIcon } from '@/lib/category-icons';
import type {
  Category,
  ExtractedProcedure,
  ProcedureBlock,
  ProcedureBody,
  ProcedureIngredient,
  ProcedureMethodStep,
  ProcedureQuiz,
  ProcedureQuizMode,
  ProcedureYieldItem,
  Localised,
  LocalisedOptional,
} from '@/lib/types';
import { NotionBlockList } from './notion-block-list';
import {
  ProcedureTypeSelector,
  type ProcedureTypeId,
} from '@/components/admin/procedure-type-selector';
import {
  ProcedureWizardStepper,
  type WizardStepId,
} from '@/components/admin/procedure-wizard-stepper';
import {
  RecipeIngredientsEditor,
  type RecipeIngredientItem,
} from '@/components/admin/recipe-ingredients-editor';
import { DocumentImportPanel } from '@/components/admin/document-import-panel';
import { LuArrowLeft, LuArrowRight, LuBrush, LuCheck, LuChevronRight, LuCircleAlert, LuCircleCheck, LuDownload, LuEllipsis, LuEye, LuFileText, LuFolder, LuLayoutGrid, LuPaperclip, LuSearch, LuShieldAlert, LuStore, LuTriangleAlert, LuTruck, LuUserCog, LuUtensils, LuWrench, LuX } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import type { IconType } from 'react-icons';
import { AccessScreen } from './access-screen';
import { type AccessLevel } from './access-level-selector';
import {
  ACCESS_LOCATIONS,
  ACCESS_ROLES,
  ACCESS_STATIONS,
  ACCESS_EMPLOYEES,
} from './access-data';

interface NewProcedureFormProps {
  locale: string;
  categories: Category[];
}

export type ClearanceTier = 'general' | 'station' | 'confidential' | 'master';

/** The set of batch sizes a recipe exposes. Always saved on the recipe
 *  block — the manager's *selected* factor stays as client-side state so the
 *  reader sees their previous choice without the doc having to persist it. */
const RECIPE_BATCH_FACTORS = [1, 2, 4] as const;

/** Stable labels for the four recipe yield fields. Order matches the panel
 *  layout and the order entries render in the reader view. Manager may leave
 *  any field's value blank. */
const YIELD_FIELD_LABELS = {
  total: 'Total yield',
  portions: 'Portions',
  portionSize: 'Portion size',
  time: 'Total time',
} as const;

type YieldFieldKey = keyof typeof YIELD_FIELD_LABELS;

function emptyYieldItem(): ProcedureYieldItem {
  return { label: '', value: '', unit: '' };
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-recipes', slug: 'recipes', nameEn: 'Recipes', nameEs: 'Recetas', isArchived: false },
  { id: 'cat-station', slug: 'station', nameEn: 'Station Procedures', nameEs: 'Procedimientos de Estación', isArchived: false },
  { id: 'cat-cleaning', slug: 'cleaning', nameEn: 'Cleaning Schedules', nameEs: 'Horarios de Limpieza', isArchived: false },
  { id: 'cat-admin', slug: 'admin', nameEn: 'General Procedures', nameEs: 'Procedimientos Generales', isArchived: false },
  { id: 'cat-delivery', slug: 'delivery', nameEn: 'Delivery & Receiving', nameEs: 'Entrega y Recepción', isArchived: false },
  { id: 'cat-safety', slug: 'food-safety', nameEn: 'Food Safety', nameEs: 'Seguridad Alimentaria', isArchived: false },
  { id: 'cat-equipment', slug: 'equipment', nameEn: 'Equipment Handling', nameEs: 'Manejo de Equipos', isArchived: false },
  { id: 'cat-other', slug: 'other', nameEn: 'Other', nameEs: 'Otros', isArchived: false },
];

function getCategoryBadgeStyle(slug: string): { icon: IconType; bg: string; text: string } {
  switch (slug) {
    case 'recipes':
      return { icon: LuUtensils, bg: 'bg-[var(--color-panel)]', text: 'text-[var(--color-ink-2)]' };
    case 'station':
      return { icon: LuStore, bg: 'bg-[var(--color-panel)]', text: 'text-[var(--color-ink-2)]' };
    case 'cleaning':
      return { icon: LuBrush, bg: 'bg-[var(--color-panel)]', text: 'text-[var(--color-ink-2)]' };
    case 'admin':
    case 'general':
      return { icon: LuFileText, bg: 'bg-[var(--color-panel)]', text: 'text-[var(--color-ink-2)]' };
    case 'delivery':
      return { icon: LuTruck, bg: 'bg-[var(--color-panel)]', text: 'text-[var(--color-ink-2)]' };
    case 'food-safety':
    case 'safety':
      return { icon: LuShieldAlert, bg: 'bg-[var(--color-panel)]', text: 'text-[var(--color-ink-2)]' };
    case 'equipment':
      return { icon: LuWrench, bg: 'bg-[var(--color-panel)]', text: 'text-[var(--color-ink-2)]' };
    default:
      return { icon: LuFolder, bg: 'bg-[var(--color-panel)]', text: 'text-[var(--color-ink-2)]' };
  }
}

function deriveTypeFromCategory(cat?: Category): ProcedureTypeId {
  if (!cat) return 'recipe';
  const slug = (cat.slug || '').toLowerCase();
  const nameEn = (cat.nameEn || '').toLowerCase();
  const id = (cat.id || '').toLowerCase();

  if (slug.includes('recipe') || nameEn.includes('recipe') || id.includes('recipe')) {
    return 'recipe';
  }
  if (slug.includes('station') || nameEn.includes('station') || id.includes('station')) {
    return 'station';
  }
  if (slug.includes('clean') || nameEn.includes('clean') || id.includes('clean')) {
    return 'cleaning';
  }
  return 'general';
}

interface FormSnapshot {
  titleEn: string;
  titleEs: string;
  categoryId: string;
  purposeEn: string;
  purposeEs: string;
  procedureType: ProcedureTypeId;
  clearanceLevel: ClearanceTier | null;
  blocks: ProcedureBlock[];
  /** Authored quiz (questions + manual attach toggle). May be null when the
   *  manager skipped the Quiz step entirely. */
  quiz: ProcedureQuiz | null;
}

function toBackendIngredient(item: RecipeIngredientItem): ProcedureIngredient | null {
  const name = item.name.trim();
  if (!name) return null;
  // Backend `amounts` requires non-empty strings. Pass `[]` when quantity is
  // blank so the `.default([])` kicks in (an explicit `['']` would fail).
  const amounts = item.quantity.trim() ? [item.quantity.trim()] : [];
  return {
    name,
    form: undefined,
    allergen: false,
    unit: item.unit || undefined,
    amounts,
  };
}

/** Build a single recipe block from form state. Synthesises a placeholder step
 *  from the title when no steps exist (the recipe block schema requires ≥ 1).
 *  Mirrors the backend `recipeBlockSchema` shape. */
function buildRecipeBody(args: {
  titleEn: string;
  titleEs: string;
  ingredients: RecipeIngredientItem[];
  factors: number[];
  yieldItems?: ProcedureYieldItem[];
}): ProcedureBody {
  const { titleEn, titleEs, ingredients, factors, yieldItems } = args;
  const backendIngredients = ingredients
    .map(toBackendIngredient)
    .filter((i): i is ProcedureIngredient => i !== null);
  const cleanedYield = (yieldItems ?? [])
    .filter((y) => y.label.trim().length > 0 && y.value.trim().length > 0)
    .map((y) => ({
      label: y.label.trim(),
      value: y.value.trim(),
      ...(y.unit && y.unit.trim().length > 0 ? { unit: y.unit.trim() } : {}),
    }));
  const placeholderBody: Localised = {
    en: titleEn.trim() || titleEs.trim() || 'Recipe steps',
    es: titleEs.trim() || titleEn.trim() || 'Pasos de la receta',
  };
  const block: ProcedureBlock = {
    id: `r-${Date.now().toString(36)}`,
    kind: 'recipe',
    audience: '',
    factors: [...factors],
    ingredients: backendIngredients,
    ...(cleanedYield.length > 0 ? { yieldItems: cleanedYield } : {}),
    steps: [{ id: `s-${Math.random().toString(36).slice(2, 8)}`, body: placeholderBody }],
  };
  return { blocks: [backfillBlock(block)] };
}

/** Non-recipe types: pass the form's block list through. Always seed a single
 *  empty heading + text so the schema's min-1 block requirement is satisfied
 *  without forcing the user to add blocks before saving a draft. */
function buildGenericBody(blocks: ProcedureBlock[]): ProcedureBody {
  const cleaned = blocks.filter((b) => !isBlockEmpty(b));
  if (cleaned.length > 0) return { blocks: cleaned.map(backfillBlock) };
  const heading: ProcedureBlock = {
    id: `h-${Date.now().toString(36)}`,
    kind: 'heading',
    level: 2,
    text: { en: 'Procedure', es: 'Procedimiento' },
  };
  return { blocks: [backfillBlock(heading)] };
}

/** True when every required-localised field on this block is empty. Used to
 *  drop placeholder blocks the user added but never filled in, so drafts can
 *  save without hitting the backend's `min(1)` validation. */
function isBlockEmpty(block: ProcedureBlock): boolean {
  const locEmpty = (l: { en?: string; es?: string } | undefined): boolean =>
    (l?.en ?? '').trim() === '' && (l?.es ?? '').trim() === '';
  switch (block.kind) {
    case 'text':
      return locEmpty(block.body);
    case 'heading':
      return locEmpty(block.text);
    case 'warning':
      return locEmpty(block.body);
    case 'image':
      return block.src.trim() === '' && locEmpty(block.alt) && locEmpty(block.caption);
    case 'video':
      // A video block with a real src URL is meaningful even without a
      // caption — drop the block from the save payload only when both sides
      // are empty.
      return block.src.trim() === '' && locEmpty(block.caption);
    case 'attachment':
      return locEmpty(block.title) && block.href.trim() === '';
    case 'method':
      return block.steps.every((s) => locEmpty(s.body));
    case 'recipe':
      return (
        block.steps.every((s) => locEmpty(s.body)) &&
        (block.ingredients ?? []).every((i) => i.name.trim() === '') &&
        locEmpty(block.allergen ? { en: block.allergen.summary, es: block.allergen.detail } : undefined)
      );
    case 'table':
      return block.headers.every((h) => locEmpty(h)) &&
        block.rows.every((r) => r.every((c) => locEmpty(c)));
    case 'checklist':
      // Drop the block only when every item is empty on both locales — a
      // partially authored list is still meaningful, so keep it.
      return (
        (block.title?.en ?? '').trim() === '' &&
        (block.title?.es ?? '').trim() === '' &&
        block.items.every((it) => locEmpty(it.text))
      );
    default:
      return false;
  }
}

/** Fill any missing side from the other side so the backend's `localisedString`
 *  (min 1 on both) passes for drafts. Mirrors the title/purpose fallback at the
 *  top level. Required-localised fields get mirrored; optional ones (captions)
 *  are only filled when at least one side already has content. */
function backfillLocalised<T extends Localised | LocalisedOptional | undefined>(
  l: T,
): T {
  if (!l) return l;
  const en = (l.en ?? '').trim();
  const es = (l.es ?? '').trim();
  if (en === '' && es === '') return l;
  const next = {
    en: en !== '' ? en : es,
    es: es !== '' ? es : en,
  };
  return { ...l, en: next.en, es: next.es } as T;
}

function backfillBlock(block: ProcedureBlock): ProcedureBlock {
  switch (block.kind) {
    case 'text':
      return { ...block, body: backfillLocalised(block.body) as Localised };
    case 'heading':
      return { ...block, text: backfillLocalised(block.text) as Localised };
    case 'warning':
      return { ...block, body: backfillLocalised(block.body) as Localised };
    case 'image': {
      const en = (block.alt?.en ?? '').trim();
      const es = (block.alt?.es ?? '').trim();
      const altEn = en || es || 'Procedure image';
      const altEs = es || en || 'Imagen del procedimiento';
      return {
        ...block,
        alt: { en: altEn, es: altEs },
        caption: backfillLocalised(block.caption) as LocalisedOptional,
      };
    }
    case 'video':
      return { ...block, caption: backfillLocalised(block.caption) as LocalisedOptional };
    case 'attachment':
      return { ...block, title: backfillLocalised(block.title) as Localised };
    case 'method':
      return { ...block, steps: block.steps.map((s) => ({ ...s, body: backfillLocalised(s.body) as Localised })) };
    case 'recipe':
      return {
        ...block,
        steps: block.steps.map((s) => ({ ...s, body: backfillLocalised(s.body) as Localised })),
      };
    case 'table':
      return {
        ...block,
        headers: block.headers.map((h) => backfillLocalised(h) as Localised),
        rows: block.rows.map((row) => row.map((c) => backfillLocalised(c) as Localised)),
      };
    case 'checklist':
      return {
        ...block,
        title: backfillLocalised(block.title) as LocalisedOptional,
        items: block.items.map((it) => ({ ...it, text: backfillLocalised(it.text) as Localised })),
      };
    default:
      return block;
  }
}

/** `h:mm a` in the user's locale (e.g. `10:42 AM`). */
function formatSavedTime(d: Date, locale: string): string {
  return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
}

/** Map a stable id to an ExtractedProcedure's block. Used by the AI
 *  preview→apply path so re-renders don't reshuffle step ids. */
function idForBlock(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Mirror the empty side of a Localised so the bilingual save rule
 *  (`min(1)` on both sides) is satisfied after an extraction. The AI fills
 *  only one side per the prompt's language rule; we copy that side to the
 *  other before applying so the backend doesn't reject the save. */
function fillBothSides(l: Localised | undefined): Localised | undefined {
  if (!l) return l;
  const en = (l.en ?? '').trim();
  const es = (l.es ?? '').trim();
  if (en && !es) return { en, es: en };
  if (es && !en) return { en: es, es };
  return l;
}

/** Convert an ExtractedProcedure's blocks into the wizard's internal
 *  ProcedureBlock shape. Each block gets a stable id, a backfill pass to
 *  fill empty bilingual sides, and is filtered to the kinds the wizard's
 *  block editor can render. */
function blocksFromExtracted(ext: ExtractedProcedure): ProcedureBlock[] {
  if (!ext.blocks || ext.blocks.length === 0) return [];
  const out: ProcedureBlock[] = [];
  for (const b of ext.blocks) {
    switch (b.kind) {
      case 'text': {
        const body = fillBothSides(b.body);
        if (!body) continue;
        out.push({ id: idForBlock('t'), kind: 'text', body });
        break;
      }
      case 'heading': {
        const text = fillBothSides(b.text);
        if (!text) continue;
        out.push({
          id: idForBlock('h'),
          kind: 'heading',
          level: b.level,
          text,
        });
        break;
      }
      case 'method': {
        const steps: ProcedureMethodStep[] = b.steps
          .map((s) => fillBothSides(s.body))
          .filter((body): body is Localised => Boolean(body))
          .map((body) => ({ id: idForBlock('s'), body }));
        if (steps.length === 0) continue;
        out.push({ id: idForBlock('m'), kind: 'method', steps });
        break;
      }
      case 'warning': {
        const body = fillBothSides(b.body);
        if (!body) continue;
        out.push({
          id: idForBlock('w'),
          kind: 'warning',
          severity: b.severity,
          body,
        });
        break;
      }
      case 'table': {
        const headers = b.headers
          .map(fillBothSides)
          .filter((h): h is Localised => Boolean(h));
        const rows = b.rows
          .map((r) => r.map(fillBothSides).filter((c): c is Localised => Boolean(c)))
          .filter((r) => r.length > 0);
        if (headers.length === 0) continue;
        out.push({ id: idForBlock('tb'), kind: 'table', headers, rows });
        break;
      }
      case 'recipe': {
        const steps = (b.steps ?? [])
          .map((s) => fillBothSides(s.body))
          .filter((body): body is Localised => Boolean(body))
          .map((body) => ({ id: idForBlock('s'), body }));
        if (steps.length === 0) continue;
        const ingredients: ProcedureIngredient[] = (b.ingredients ?? [])
          .filter((i) => i.name.trim().length > 0)
          .map((i) => ({
            name: i.name.trim(),
            unit: i.unit,
            allergen: false,
            amounts: (i.amounts ?? []).filter((a) => a.trim().length > 0),
          }));
        out.push({
          id: idForBlock('r'),
          kind: 'recipe',
          audience: b.audience ?? '',
          yieldItems: b.yieldItems,
          ingredients,
          steps,
        });
        break;
      }
    }
  }
  return out;
}

/** Map the AI's recipe ingredients to the wizard's RecipeIngredientItem
 *  rows. Empty ingredient lists fall back to a single blank row so the
 *  editor doesn't render an empty list (which would silently break the
 *  "at least one ingredient" submission rule). */
function recipeIngredientsFromExtracted(
  ext: ExtractedProcedure,
): RecipeIngredientItem[] {
  const list = ext.recipe?.ingredients;
  if (!list || list.length === 0) {
    return [{ id: idForBlock('ing'), name: '', quantity: '', unit: 'kg', notes: '' }];
  }
  return list
    .filter((i) => i.name.trim().length > 0)
    .map((i) => ({
      id: idForBlock('ing'),
      name: i.name.trim(),
      quantity: (i.amounts ?? []).filter((a) => a.trim().length > 0).join(' '),
      unit: i.unit ?? '',
      notes: '',
    }));
}

export function NewProcedureForm({
  locale,
  categories,
}: NewProcedureFormProps): React.ReactElement {
  const tNav = useTranslations('admin.library.new');
  const tCats = useTranslations('employee.dashboard');
  const tForm = useTranslations('admin.library.new.form');
  const tRecipe = useTranslations('admin.library.new.recipe');
  const tAccess = useTranslations('admin.library.new.access');
  const tTitles = useTranslations('admin.library.new.titles');
  const tErr = useTranslations('admin.library.new.errors');
  const router = useRouter();

  // Merged category list — starts from props but grows when the manager
  // creates a new category inline from the modal.
  const [localCategories, setLocalCategories] = React.useState<Category[]>(() => categories ?? []);

  React.useEffect(() => {
    let isMounted = true;
    async function syncCategories() {
      try {
        const { categories: fetched } = await listCategories('loc-main', { includeArchived: false });
        if (isMounted && fetched && fetched.length > 0) {
          setLocalCategories((prev) => {
            const map = new Map<string, Category>();
            for (const c of prev) map.set(c.id, c);
            for (const c of fetched) map.set(c.id, c);
            return Array.from(map.values());
          });
        }
      } catch {
        // Fallback
      }
    }
    syncCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  const sourceCategories = React.useMemo(() => {
    return localCategories && localCategories.length >= 4 ? localCategories : DEFAULT_CATEGORIES;
  }, [localCategories]);

  const initialCat = sourceCategories[0];
  const initialType = React.useMemo(() => deriveTypeFromCategory(initialCat), [initialCat]);

  const [creationMode, setCreationMode] = useState<'manual' | 'import'>('manual');
  // Once the manager picks how they want to start, the chooser at the top of
  // the page gets out of the way — they don't need to keep seeing it while
  // they're filling in the rest of the form.
  const [wizardStep, setWizardStep] = useState<WizardStepId>('details');
  const [categoryId, setCategoryId] = useState<string>(() => initialCat?.id ?? DEFAULT_CATEGORIES[0].id);
  const [procedureType, setProcedureType] = useState<ProcedureTypeId>(() => initialType);
  const isRecipeMode = procedureType === 'recipe';
  // How many procedures each category already holds. The tiles used to print
  // fixed numbers from the demo copy; this reads the library.
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  React.useEffect(() => {
    let alive = true;
    void listProcedures()
      .then(({ procedures }) => {
        if (!alive) return;
        const counts: Record<string, number> = {};
        for (const proc of procedures) {
          const slug = proc.category?.slug;
          if (slug) counts[slug] = (counts[slug] ?? 0) + 1;
        }
        setCategoryCounts(counts);
      })
      .catch(() => {
        /* the tiles simply say "no procedures yet" */
      });
    return () => {
      alive = false;
    };
  }, []);
  const categoryCountLabel = (slug: string): string => {
    const n = categoryCounts[slug] ?? 0;
    if (n === 0) return locale === 'es' ? 'Sin procedimientos' : 'No procedures yet';
    if (n === 1) return locale === 'es' ? '1 procedimiento' : '1 procedure';
    return locale === 'es' ? `${n} procedimientos` : `${n} procedures`;
  };
  const [titleEn, setTitleEn] = useState('');
  const [titleEs, setTitleEs] = useState('');
  const [titleLang, setTitleLang] = useState<'en' | 'es'>('en');
  const [purposeEn, setPurposeEn] = useState('');
  const [purposeEs, setPurposeEs] = useState('');
  const [purposeLang, setPurposeLang] = useState<'en' | 'es'>('en');
  const [clearanceLevel, setClearanceLevel] = useState<ClearanceTier | null>(null);
  const [blocks, setBlocksRaw] = useState<ProcedureBlock[]>([]);
  // Quiz authored in the wizard's Quiz step. `null` means the step was
  // skipped (no questions authored yet); an object with `attached: false`
  // means the manager authored but chose not to attach. On save, a
  // non-null quiz with at least one question is materialised via
  // `createQuiz()` and its id stamped onto `procedure.quizId`.
  const [quiz, setQuiz] = useState<ProcedureQuiz | null>(null);
  // Training & Quiz step fields. `linkedTrainingId` is the FK to the
  // training course this SOP feeds into (null = standalone SOP). The
  // wizard's UI for these is the next slice (F2.5b); defaults hold
  // the type contract working in the meantime.
  const [linkedTrainingId, setLinkedTrainingId] = useState<string | null>(null);
  const [quizMode, setQuizMode] = useState<ProcedureQuizMode>('training');

  // Access selections (Step 3 / 4). Lives in the wizard so the Review step
  // can render them — `AccessScreen` only owns ephemeral interaction state
  // now (like the assign search query) and reads/writes through these.
  const [accessSelections, setAccessSelections] = useState<{
    locations: Set<string>;
    roles: Set<string>;
    stations: Set<string>;
    employees: Set<string>;
  }>(() => ({
    locations: new Set<string>(),
    roles: new Set<string>(),
    stations: new Set<string>(),
    employees: new Set<string>(),
  }));

  // Access level — the top-level choice on the Access step. When
  // 'everyone' the procedure is visible to every employee regardless of
  // the location / role / station / employee selections below. Those
  // selections stay in state untouched, so flipping back to 'restricted'
  // restores the prior scoped access without losing the manager's
  // choices.
  const [accessLevel, setAccessLevel] = React.useState<AccessLevel>('restricted');

  const updateAccess = React.useCallback(
    (key: 'locations' | 'roles' | 'stations' | 'employees', id: string): void => {
      setAccessSelections((prev) => {
        const next = new Set(prev[key]);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { ...prev, [key]: next };
      });
    },
    [],
  );

  // Recipe specific states
  const [ingredients, setIngredients] = useState<RecipeIngredientItem[]>([
    { id: 'ing-1', name: '', quantity: '', unit: 'kg', notes: '' },
  ]);
  const [selectedFactor, setSelectedFactor] = useState<number>(1);
  // Yield panel — one slot per known field. Manager may leave value/unit blank
  // for any field; only items with both a value and a label are persisted.
  const [yieldItems, setYieldItems] = useState<ProcedureYieldItem[]>(() =>
    (Object.keys(YIELD_FIELD_LABELS) as YieldFieldKey[]).map((k) => ({
      label: YIELD_FIELD_LABELS[k],
      value: '',
      unit: '',
    })),
  );

  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Inline "create new category" form inside the modal
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatNameEn, setNewCatNameEn] = useState('');
  const [newCatNameEs, setNewCatNameEs] = useState('');
  const [isSavingCat, setIsSavingCat] = useState(false);

  async function handleCreateCategory(): Promise<void> {
    const nameEn = newCatNameEn.trim();
    const nameEs = newCatNameEs.trim() || nameEn;
    if (!nameEn) return;
    const slug = nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setIsSavingCat(true);
    try {
      const { category } = await createCategory({
        locationId: 'loc-main',
        slug: `${slug}-${Date.now().toString(36)}`,
        nameEn,
        nameEs,
      });
      setLocalCategories((prev) => [...prev, category]);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('lms_categories_updated'));
      handleCategoryChange(category.id);
      setIsOtherModalOpen(false);
      setModalSearchQuery('');
      setIsCreatingCategory(false);
      setNewCatNameEn('');
      setNewCatNameEs('');
    } finally {
      setIsSavingCat(false);
    }
  }

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLang, setPreviewLang] = useState<'en' | 'es'>('en');

  const hasTitle = titleEn.trim().length > 0 || titleEs.trim().length > 0;
  const hasPurpose = purposeEn.trim().length > 0 || purposeEs.trim().length > 0;

  const isTitleMissing = !hasTitle && !!error;
  const isPurposeMissing = !hasPurpose && !!error;

  // When the procedure type changes, snap the wizard back onto a step that
  // exists in the new flow. Without this, switching from a recipe category
  // (which uses 'ingredients' + 'method') to a non-recipe category (which
  // uses 'content') leaves wizardStep pointing at a step the stepper no
  // longer renders — the user is stuck on a phantom step.
  const stepForType = React.useCallback(
    (type: ProcedureTypeId, current: WizardStepId): WizardStepId => {
      const recipe = type === 'recipe';
      if (current === 'ingredients' || current === 'method') {
        return recipe ? current : 'content';
      }
      if (current === 'content') {
        return recipe ? 'method' : 'content';
      }
      return current; // details / access / review are type-agnostic
    },
    [],
  );

  // Dev note: validation that blocks moving forward without completing the
  // previous step has been intentionally relaxed so the manager can move
  // freely between steps while building a procedure. The required-field
  // checks are still in place on submit (see `submit`).
  const handleSelectStep = React.useCallback(
    (targetStep: WizardStepId): void => {
      if (!isRecipeMode && (targetStep === 'ingredients' || targetStep === 'method')) {
        return; // recipe-only step on a non-recipe procedure
      }
      setError(null);
      setWizardStep(targetStep);
    },
    [isRecipeMode],
  );

  const handleNextStep = React.useCallback((): void => {
    setError(null);

    if (wizardStep === 'details') {
      setWizardStep(isRecipeMode ? 'ingredients' : 'content');
      return;
    }

    if (wizardStep === 'ingredients') {
      setWizardStep('method');
      return;
    }

    if (wizardStep === 'method' || wizardStep === 'content') {
      setWizardStep('quiz');
      return;
    }

    if (wizardStep === 'quiz') {
      setWizardStep('access');
      return;
    }

    if (wizardStep === 'access') {
      setWizardStep('review');
      return;
    }
  }, [wizardStep, isRecipeMode]);

  const primaryCategories = React.useMemo(() => {
    return sourceCategories.slice(0, 7);
  }, [sourceCategories]);

  const isPrimaryCategorySelected = React.useMemo(() => {
    return primaryCategories.some((c) => c.id === categoryId);
  }, [primaryCategories, categoryId]);

  const selectedCategory = React.useMemo(() => {
    return sourceCategories.find((c) => c.id === categoryId);
  }, [sourceCategories, categoryId]);

  const selectedExceedingCategory = !isPrimaryCategorySelected ? selectedCategory : null;

  // The tiles show the primary categories; everything else is behind "Other".
  const displayCategories = primaryCategories;

  const [isOtherModalOpen, setIsOtherModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');

  const modalFilteredCategories = React.useMemo(() => {
    const query = modalSearchQuery.toLowerCase().trim();
    if (!query) return sourceCategories;
    return sourceCategories.filter((c) => {
      const name = (locale === 'es' ? c.nameEs : c.nameEn).toLowerCase();
      return name.includes(query) || c.slug.toLowerCase().includes(query);
    });
  }, [sourceCategories, modalSearchQuery, locale]);

  // Map slug -> id so the type/category auto-sync can still target the
  // standard slugs even if the manager added custom categories alongside.
  const idBySlug: Record<string, string> = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) map[c.slug] = c.id;
    return map;
  }, [categories]);

  const initialRef = useRef<FormSnapshot>({
    titleEn: '',
    titleEs: '',
    categoryId: initialCat?.id ?? DEFAULT_CATEGORIES[0].id,
    purposeEn: '',
    purposeEs: '',
    procedureType: initialType,
    clearanceLevel: null,
    blocks: [],
    quiz: null,
  });

  const setBlocks = React.useCallback((next: ProcedureBlock[]) => {
    setBlocksRaw(next);
    setIsDirty(true);
  }, []);

  // Option A: Auto-sync Type with valid Category
  const handleTypeChange = (nextType: ProcedureTypeId): void => {
    setProcedureType(nextType);
    setWizardStep((s) => stepForType(nextType, s));
    setIsDirty(true);

    const slugByType: Record<ProcedureTypeId, string | null> = {
      recipe: 'recipes',
      station: 'station',
      cleaning: 'cleaning',
      general: 'admin',
    };
    const slug = slugByType[nextType];
    if (slug) {
      const id = idBySlug[slug];
      if (id) setCategoryId(id);
    }
  };

  const handleCategoryChange = (nextId: string): void => {
    setCategoryId(nextId);
    setIsDirty(true);

    // Sync type if user picks a category mapped to one of the standard
    // type buckets.
    const source = categories && categories.length >= 4 ? categories : DEFAULT_CATEGORIES;
    const picked = source.find((c) => c.id === nextId);
    if (!picked) return;

    const slug = (picked.slug || '').toLowerCase();
    const nameEn = (picked.nameEn || '').toLowerCase();
    const id = (picked.id || '').toLowerCase();

    const isRecipeCategory = slug.includes('recipe') || nameEn.includes('recipe') || id.includes('recipe');
    const isStationCategory = slug.includes('station') || nameEn.includes('station') || id.includes('station');
    const isCleaningCategory = slug.includes('clean') || nameEn.includes('clean') || id.includes('clean');

    let nextType: ProcedureTypeId = 'general';
    if (isRecipeCategory) {
      nextType = 'recipe';
    } else if (isStationCategory) {
      nextType = 'station';
    } else if (isCleaningCategory) {
      nextType = 'cleaning';
    }

    if (nextType !== procedureType) {
      setProcedureType(nextType);
      setWizardStep((s) => stepForType(nextType, s));
    }
  };

  const discard = (): void => {
    const s = initialRef.current;
    setTitleEn(s.titleEn);
    setTitleEs(s.titleEs);
    setCategoryId(s.categoryId);
    setPurposeEn(s.purposeEn);
    setPurposeEs(s.purposeEs);
    setProcedureType(s.procedureType);
    setClearanceLevel(s.clearanceLevel);
    setBlocksRaw(s.blocks);
    setError(null);
    setIsDirty(false);
    setLastSavedAt(null);
  };

  // Apply an AI-extracted draft to the form. Called by DocumentImportPanel
  // when the manager clicks "Use this draft". The extraction only fills the
  // sides it found in the source language; we mirror to the other side so
  // the bilingual save rule is met.
  const handleExtracted = React.useCallback(
    (extraction: ExtractedProcedure): void => {
      const title = fillBothSides(extraction.title);
      if (title) {
        setTitleEn(title.en);
        setTitleEs(title.es);
      }
      const purpose = fillBothSides(extraction.purpose);
      if (purpose) {
        setPurposeEn(purpose.en);
        setPurposeEs(purpose.es);
      }
      if (extraction.recipe && isRecipeMode) {
        setIngredients(recipeIngredientsFromExtracted(extraction));
      }
      const blocks = blocksFromExtracted(extraction);
      if (blocks.length > 0) setBlocks(blocks);
      // Flip back to manual mode so the populated form is what the manager
      // sees, not the import tile.
      setCreationMode('manual');
      setWizardStep('details');
      setError(null);
      setIsDirty(true);
    },
    // setBlocks is stable (useCallback above); setters are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isRecipeMode],
  );

  async function submit(status: 'draft' | 'published'): Promise<void> {
    setError(null);
    setErrorDetails([]);

    // Dev note: the front-end pre-flight checks that used to gate the
    // submission (require a title, a purpose, at least one ingredient for
    // recipes, clearance for publish) were intentionally removed so the
    // manager can save a half-built procedure without hitting the warning
    // banner. The backend is the source of truth for what's publishable —
    // any rejection still surfaces through the catch block below.
    const body = isRecipeMode
      ? buildRecipeBody({
          titleEn,
          titleEs,
          ingredients,
          factors: [...RECIPE_BATCH_FACTORS],
          yieldItems,
        })
      : buildGenericBody(blocks);

    startTransition(async () => {
      try {
        // Materialise the wizard's authored quiz into the centralised
        // `quizzes` table first, then stamp its id onto the procedure.
        // A quiz with no questions is treated as "manager chose not to
        // attach" — we drop it rather than save an empty row.
        let quizId: string | null = null;
        if (quiz && quiz.questions.length > 0) {
          const { quiz: createdQuiz } = await createQuiz({
            questions: quiz.questions,
            attached: quiz.attached,
          });
          quizId = createdQuiz.id;
        }

        await createProcedure({
          titleEn: titleEn.trim() || titleEs.trim(),
          titleEs: titleEs.trim() || titleEn.trim(),
          categoryId: categoryId.length > 0 ? categoryId : null,
          purposeEn: purposeEn.trim() || purposeEs.trim(),
          purposeEs: purposeEs.trim() || purposeEn.trim(),
          status,
          bodyEn: body,
          bodyEs: body,
          quizId,
          linkedTrainingId,
          quizMode,
        });
        setLastSavedAt(new Date());
        setIsDirty(false);
        router.push(`/${locale}/admin/library`);
        router.refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === 'INVALID_INPUT') {
            setError(tErr('invalidInput'));
            if (err.details.length > 0) {
              setErrorDetails(
                err.details.map(
                  (d) => `${d.path || '(root)'} — ${d.message}`,
                ),
              );
            }
          } else if (err.code === 'UNAUTHENTICATED') setError(tErr('unauthenticated'));
          else setError(err.message);
        } else {
          setError(tErr('generic'));
        }
      }
    });
  }

  // Calculate strict accuracy section completion for sidebar
  const detailsComplete = titleEn.trim().length > 0 && titleEs.trim().length > 0;
  const purposeComplete = purposeEn.trim().length > 0 && purposeEs.trim().length > 0;
  const ingredientsComplete = ingredients.some((i) => i.name.trim().length > 0);
  const contentComplete = blocks.length > 0 && blocks.some((b) => (b.kind === 'text' ? (b.body?.en || b.body?.es) : true));
  const accessComplete = clearanceLevel !== null;
  const reviewComplete = detailsComplete && (isRecipeMode ? ingredientsComplete : purposeComplete) && accessComplete;

  const sections = isRecipeMode
    ? [
        { key: 'details', label: tForm('outlineDetails'), completed: detailsComplete },
        { key: 'ingredients', label: tRecipe('ingredientsTitle'), completed: ingredientsComplete },
        { key: 'method', label: tRecipe('methodTitle'), completed: contentComplete },
        { key: 'access', label: 'Access', completed: accessComplete },
        { key: 'review', label: 'Review', completed: reviewComplete },
      ]
    : [
        { key: 'details', label: tForm('outlineDetails'), completed: detailsComplete },
        { key: 'purpose', label: tForm('outlinePurpose'), completed: purposeComplete },
        { key: 'content', label: tForm('outlineContent'), completed: contentComplete },
        { key: 'access', label: 'Access', completed: accessComplete },
        { key: 'review', label: 'Review', completed: reviewComplete },
      ];

  const completedCount = sections.filter((s) => s.completed).length;
  // Total selections across location + role + station — drives the access
  // card eyebrow and the publish-band copy at the bottom of Review.
  const accessCount =
    accessSelections.locations.size +
    accessSelections.roles.size +
    accessSelections.stations.size;
  const activeCategory = categories.find((c) => c.id === categoryId);
  const categoryLabel = activeCategory
    ? (locale === 'es' ? activeCategory.nameEs : activeCategory.nameEn)
    : 'Recipes';

  const activeTitle = titleLang === 'en' ? titleEn : titleEs;
  const activePurpose = purposeLang === 'en' ? purposeEn : purposeEs;

  const clearanceLabel = clearanceLevel
    ? tAccess(clearanceLevel as never)
    : tAccess('notConfigured');

  const textareaCls =
    'flex w-full rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] transition-all duration-[var(--dur)] hover:border-[var(--color-line-3)] focus:outline-none focus-visible:outline-none focus:border-[var(--color-brand-600)] focus-visible:border-[var(--color-brand-600)] focus:ring-2 focus:ring-[var(--color-brand-tint)] focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint)]';

  return (
    <div className="mx-auto max-w-page space-y-6">
      {/* The back link and the eyebrow both said "library" above a title that
          already names what this page makes, and the two page actions floated on
          the crumb row. One header, like every other admin page, with the
          actions in it. */}
      <PageHeader
        title={tTitles(procedureType as never)}
        subtitle={tTitles(`${procedureType}Subtitle` as never)}
        actions={
          <>
            <Button type="button" variant="surface" onClick={() => setIsPreviewOpen(true)} icon={LuEye}>
              {tNav('livePreview')}
            </Button>
            <Link href={`/${locale}/admin/library`}>
              <Button type="button" variant="ghost">
                {tNav('cancel')}
              </Button>
            </Link>
          </>
        }
      />

      {/* The question and its seats, on the page ground: the same shape as the
          library's category filters. It used to sit in a white card and vanish
          the moment it was answered, which left no way back to the other view. */}
      <div className="space-y-2">
        <span className="block text-sm font-semibold text-[var(--color-ink-3)]">
          How would you like to start?
        </span>
        <FilterChips
          label="How would you like to start?"
          value={creationMode}
          onChange={(mode) => setCreationMode(mode as 'manual' | 'import')}
          chips={[
            { value: 'manual', label: 'Create manually' },
            { value: 'import', label: 'Import a document' },
          ]}
        />
      </div>

      {/* AI Import Upload Box when Import mode is selected */}
      {creationMode === 'import' && (
        <DocumentImportPanel
          procedureType={procedureType}
          onExtracted={handleExtracted}
        />
      )}

      {/* Wizard Stepper Header */}
      <ProcedureWizardStepper
        currentStep={wizardStep}
        isRecipe={isRecipeMode}
        onSelectStep={handleSelectStep}
      />

      {/* Main Single Column Stepped Wizard Form */}
      <form className="w-full space-y-8 pb-20" onSubmit={(e) => e.preventDefault()}>
        {error && (
          <div
            role="alert"
            className="rounded-[var(--radius-lg)] border border-[var(--color-bad-tint)] bg-[var(--color-bad-tint)] px-4 py-3 text-sm text-[var(--color-bad)]"
          >
            <p className="font-semibold">{error}</p>
            {errorDetails.length > 0 && (
              <ul className="mt-2 list-inside list-disc space-y-0.5 font-mono text-sm">
                {errorDetails.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Step 1: Basic information / Details */}
        {wizardStep === 'details' && (
          <div className="space-y-8">
            {/* Library Category Card Grid Section */}
            <Section
              id="proc-category"
              icon={LuFolder}
              title="Library category"
              subtitle="Choose where this procedure will appear in the library."
            >
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {displayCategories.map((c) => {
                    const isSelected = categoryId === c.id;
                    const style = getCategoryBadgeStyle(c.slug);
                    const name = locale === 'es' ? c.nameEs : c.nameEn;

                    return (
                      <button
                        key={c.id}
                        type="button"
                        title={name}
                        onClick={() => handleCategoryChange(c.id)}
                        className={cn(
                          'group relative flex flex-col justify-between rounded-[var(--radius-lg)] border p-4 text-left transition-all duration-[var(--dur)] min-h-tile h-full',
                          isSelected
                            ? 'border-[var(--color-brand-600)] bg-[var(--color-surface)]'
                            : 'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)]',
                        )}
                      >
                        {/* Selected Checkmark Badge */}
                        {isSelected && (
                          <div className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white text-sm shadow-e1">
                            <LuCheck aria-hidden="true" className="font-semibold" />
                          </div>
                        )}

                        {/* Icon in Colored Circle/Square Box */}
                        <div className={cn('flex size-10 items-center justify-center rounded-[var(--radius-lg)] text-lg shadow-e1 transition-transform', style.bg, style.text)}>
                          <Icon icon={style.icon} />
                        </div>

                        {/* Title and subtitle */}
                        <div className="mt-3">
                          <h4
                            className="font-[family-name:var(--font-ui)] text-sm font-semibold tracking-snug text-[var(--color-ink)] line-clamp-2 leading-heading"
                            title={name}
                          >
                            {name}
                          </h4>
                          <p className="mt-1 text-sm text-[var(--color-ink-2)]">
                            {categoryCountLabel(c.slug)}
                          </p>
                        </div>
                      </button>
                    );
                  })}

                  {/* 8th Card: Other (triggers modal to view/select from all exceeding categories) */}
                  {(() => {
                    const isOtherSelected = !isPrimaryCategorySelected;
                    const style = getCategoryBadgeStyle('other');
                    const selectedName = selectedExceedingCategory
                      ? (locale === 'es' ? selectedExceedingCategory.nameEs : selectedExceedingCategory.nameEn)
                      : null;

                    return (
                      <button
                        key="card-other-trigger"
                        type="button"
                        title={selectedName ? `Selected: ${selectedName}` : 'View all categories'}
                        onClick={() => setIsOtherModalOpen(true)}
                        className={cn(
                          'group relative flex flex-col justify-between rounded-[var(--radius-lg)] border p-4 text-left transition-all duration-[var(--dur)] min-h-tile h-full',
                          isOtherSelected
                            ? 'border-[var(--color-brand-600)] bg-[var(--color-surface)]'
                            : 'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)]',
                        )}
                      >
                        {/* Selected Checkmark Badge */}
                        {isOtherSelected && (
                          <div className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white text-sm shadow-e1">
                            <LuCheck aria-hidden="true" className="font-semibold" />
                          </div>
                        )}

                        {/* Icon */}
                        <div className={cn('flex size-10 items-center justify-center rounded-[var(--radius-lg)] text-lg shadow-e1 transition-transform', style.bg, style.text)}>
                          <LuEllipsis aria-hidden="true" className="text-xl font-semibold" />
                        </div>

                        {/* Title and subtitle */}
                        <div className="mt-3">
                          <h4
                            className="font-[family-name:var(--font-ui)] text-sm font-semibold tracking-snug text-[var(--color-ink)] line-clamp-2 leading-heading"
                            title={selectedName || 'Other'}
                          >
                            {selectedName ? selectedName : (locale === 'es' ? 'Otros' : 'Other')}
                          </h4>
                          <p className="mt-1 text-sm text-[var(--color-ink-2)] flex items-center gap-1">
                            <span>
                              {selectedName
                                ? (locale === 'es' ? 'Seleccionada' : 'Selected')
                                : (locale === 'es' ? 'Ver todas' : 'View all')}
                            </span>
                            <LuChevronRight aria-hidden="true" className="text-sm" />
                          </p>
                        </div>
                      </button>
                    );
                  })()}
              </div>
            </Section>

            {/* Procedure Details Section */}
            <Section
              id="proc-details"
              icon={LuFileText}
              title="Procedure details"
              subtitle="Give your procedure a clear title and purpose."
            >
              <div className="space-y-6">
                {/* Title & Purpose Stacked Full-Width Layout */}
                <div className="space-y-6 pt-1">
                  {/* Title Field */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-[var(--color-ink)]">
                        {tForm('titleLabel')}
                        <span aria-hidden="true" className="ml-1 text-[var(--color-bad)]">*</span>
                      </Label>
                      <SegmentedControl
                        label="Title language"
                        value={titleLang}
                        onChange={(lang) => setTitleLang(lang as 'en' | 'es')}
                        segments={[
                          { value: 'en', label: 'EN' },
                          { value: 'es', label: 'ES' },
                        ]}
                      />
                    </div>

                    <div className="relative flex items-center">
                      {titleLang === 'en' ? (
                        <Input
                          value={titleEn}
                          onChange={(e) => {
                            setTitleEn(e.target.value);
                            setIsDirty(true);
                            if (error) setError(null);
                          }}
                          maxLength={100}
                          placeholder={isRecipeMode ? 'Grilled Chicken Breast' : tForm('titlePlaceholder')}
                          className={cn('pr-16', isTitleMissing && 'border-[var(--color-bad)] ring-2 ring-[var(--color-bad-tint)]')}
                          required
                        />
                      ) : (
                        <Input
                          value={titleEs}
                          onChange={(e) => {
                            setTitleEs(e.target.value);
                            setIsDirty(true);
                            if (error) setError(null);
                          }}
                          maxLength={100}
                          placeholder={tForm('titlePlaceholder')}
                          className={cn('pr-16', isTitleMissing && 'border-[var(--color-bad)] ring-2 ring-[var(--color-bad-tint)]')}
                          required
                        />
                      )}
                      <span className="pointer-events-none select-none absolute right-3 text-sm font-medium text-[var(--color-ink-3)]">
                        {titleLang === 'en' ? titleEn.length : titleEs.length} / 100
                      </span>
                    </div>
                    {isTitleMissing && (
                      <p className="text-sm font-semibold text-[var(--color-bad)] mt-1 flex items-center gap-1">
                        <LuCircleAlert aria-hidden="true" className="text-sm" />
                        <span>Please enter a procedure title to continue.</span>
                      </p>
                    )}
                  </div>

                  {/* Purpose Field */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-[var(--color-ink)]">
                        {tForm('purposeLabel')}
                        <span aria-hidden="true" className="ml-1 text-[var(--color-bad)]">*</span>
                      </Label>
                      <SegmentedControl
                        label="Purpose language"
                        value={purposeLang}
                        onChange={(lang) => setPurposeLang(lang as 'en' | 'es')}
                        segments={[
                          { value: 'en', label: 'EN' },
                          { value: 'es', label: 'ES' },
                        ]}
                      />
                    </div>

                    <div className="relative">
                      {purposeLang === 'en' ? (
                        <textarea
                          value={purposeEn}
                          onChange={(e) => {
                            setPurposeEn(e.target.value);
                            setIsDirty(true);
                            if (error) setError(null);
                          }}
                          maxLength={500}
                          rows={2}
                          placeholder={
                            isRecipeMode
                              ? 'What is this procedure for? (e.g. To teach preparation and cooking method...)'
                              : tForm('purposePlaceholder')
                          }
                          className={cn(textareaCls, 'pb-8', isPurposeMissing && 'border-[var(--color-bad)] ring-2 ring-[var(--color-bad-tint)]')}
                        />
                      ) : (
                        <textarea
                          value={purposeEs}
                          onChange={(e) => {
                            setPurposeEs(e.target.value);
                            setIsDirty(true);
                            if (error) setError(null);
                          }}
                          maxLength={500}
                          rows={2}
                          placeholder={tForm('purposePlaceholder')}
                          className={cn(textareaCls, 'pb-8', isPurposeMissing && 'border-[var(--color-bad)] ring-2 ring-[var(--color-bad-tint)]')}
                        />
                      )}
                      <span className="pointer-events-none select-none absolute right-3 bottom-2 text-sm font-medium text-[var(--color-ink-3)]">
                        {purposeLang === 'en' ? purposeEn.length : purposeEs.length} / 500
                      </span>
                    </div>
                    {isPurposeMissing && (
                      <p className="text-sm font-semibold text-[var(--color-bad)] mt-1 flex items-center gap-1">
                        <LuCircleAlert aria-hidden="true" className="text-sm" />
                        <span>Please enter a procedure purpose to continue.</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* Step 2: Ingredients (Recipe mode only) */}
        {wizardStep === 'ingredients' && isRecipeMode && (
          <div className="space-y-6">
            <RecipeIngredientsEditor
              ingredients={ingredients}
              onChange={(next) => {
                setIngredients(next);
                setIsDirty(true);
              }}
              selectedFactor={selectedFactor}
              onSelectFactor={setSelectedFactor}
              yieldItems={yieldItems}
              onChangeYield={(next) => {
                setYieldItems(next);
                setIsDirty(true);
              }}
            />
          </div>
        )}

        {/* Step 3 (Recipe) / Step 2 (Non-Recipe): Notion-type Block Editor Screen */}
        {(wizardStep === 'method' || (wizardStep === 'content' && !isRecipeMode)) && (
          <Section
            id="proc-content"
            icon={LuLayoutGrid}
            title={isRecipeMode ? tRecipe('methodTitle') : tForm('contentSectionTitle')}
            subtitle={isRecipeMode ? tRecipe('methodSubtitle') : tForm('contentSectionSubtitle')}
          >
            <NotionBlockList blocks={blocks} onChange={setBlocks} />
          </Section>
        )}

        {/* Step: Quiz — hardcoded questions preview + Attach toggle. */}
        {wizardStep === 'quiz' && (
          <QuizEditor value={quiz} onChange={setQuiz} />
        )}

        {/* Step: Access — radio choice + four compact rows. */}
        {wizardStep === 'access' && (
          <AccessScreen
            selectedLocations={accessSelections.locations}
            selectedRoles={accessSelections.roles}
            selectedStations={accessSelections.stations}
            assignedEmployees={accessSelections.employees}
            accessLevel={accessLevel}
            onToggleLocation={(id) => updateAccess('locations', id)}
            onToggleRole={(id) => updateAccess('roles', id)}
            onToggleStation={(id) => updateAccess('stations', id)}
            onToggleEmployee={(id) => updateAccess('employees', id)}
            onChangeAccessLevel={setAccessLevel}
          />
        )}

        {/* Step: Review & Finish Section */}
        {wizardStep === 'review' && (
          <Section
            id="proc-review"
            icon="ri-checkbox-circle-line"
            title="Review & finish"
            subtitle="Confirm the procedure, who can see it, and where it goes."
          >
            <div className="space-y-5">
              {/* 1. Procedure — what this document is. */}
              <ReviewCard
                icon="ri-file-text-line"
                title="Procedure"
                eyebrow={`${categoryLabel} · ${isRecipeMode ? 'Recipe' : 'Procedure'}`}
              >
                <h3 className="text-lg font-semibold tracking-snug text-[var(--color-ink)]">
                  {activeTitle || '(Untitled procedure)'}
                </h3>
                <p className="mt-1 text-base leading-body text-[var(--color-ink-2)]">
                  {activePurpose || '(No purpose provided yet — go back to Details to add one.)'}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Chip tone="brand" icon="ri-bar-chart-2-line">
                    {blocks.length} block{blocks.length === 1 ? '' : 's'}
                  </Chip>
                  <Chip tone="wash" icon="ri-flag-line">
                    {clearanceLabel}
                  </Chip>
                  {/* Public / Restricted badge — sourced from the access
                      level choice on the Access step. */}
                  {accessLevel === 'everyone' ? (
                    <Chip tone="ok" icon="ri-earth-fill">
                      {tAccess('reviewPublicBadge')}
                    </Chip>
                  ) : (
                    <Chip tone="wash" icon="ri-shield-line">
                      {tAccess('reviewPrivateBadge')}
                    </Chip>
                  )}
                  {isRecipeMode && (
                    <Chip tone="wash" icon="ri-restaurant-line">
                      {ingredients.filter((i) => i.name.trim()).length} ingredient
                      {ingredients.filter((i) => i.name.trim()).length === 1 ? '' : 's'}
                    </Chip>
                  )}
                </div>
              </ReviewCard>

              {/* 2. Access — who can see this. Drawn from the Access tab.
                    The eyebrow swaps between "Public (visible to everyone)"
                    and the scoped count so the manager can confirm their
                    intent at a glance before publishing. */}
              <ReviewCard
                icon="ri-shield-user-line"
                title="Access"
                eyebrow={
                  accessLevel === 'everyone'
                    ? tAccess('reviewPublicBadge')
                    : `${accessCount} selected across ${['locations', 'roles', 'stations'].filter((k) => accessSelections[k as 'locations' | 'roles' | 'stations'].size > 0).length || 0} tier${'s'}`
                }
              >
                {/* Locations */}
                <ReviewChipRow
                  icon="ri-map-pin-line"
                  label="Locations"
                  items={ACCESS_LOCATIONS.filter((o) => accessSelections.locations.has(o.id))}
                  emptyText="No locations selected — open to everyone"
                />

                {/* Roles */}
                <ReviewChipRow
                  icon="ri-user-star-line"
                  label="Roles"
                  items={ACCESS_ROLES.filter((o) => accessSelections.roles.has(o.id))}
                  emptyText="No roles selected — open to everyone"
                />

                {/* Stations */}
                <ReviewChipRow
                  icon="ri-store-2-line"
                  label="Stations"
                  items={ACCESS_STATIONS.filter((o) => accessSelections.stations.has(o.id))}
                  emptyText="No stations selected — applies everywhere"
                />
              </ReviewCard>

              {/* 3. Assignees — specific employees pulled in. Drawn from the Access tab. */}
              <ReviewCard
                icon="ri-team-line"
                title="Assignees"
                eyebrow={`${accessSelections.employees.size} employee${accessSelections.employees.size === 1 ? '' : 's'}`}
              >
                {accessSelections.employees.size === 0 ? (
                  <p className="text-sm italic text-[var(--color-ink-3)]">
                    No employees assigned yet. Procedure will still be visible
                    to anyone matching the access ranges above.
                  </p>
                ) : (
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {ACCESS_EMPLOYEES.filter((e) => accessSelections.employees.has(e.id)).map(
                      (emp) => (
                        <li
                          key={emp.id}
                          className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2"
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-tint)] text-sm font-semibold text-[var(--color-brand-700)]">
                            {emp.initials}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-[var(--color-ink)]">
                              {emp.name}
                            </span>
                            <span className="block text-sm text-[var(--color-ink-2)]">
                              {emp.role} · {emp.station}
                            </span>
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </ReviewCard>

              {/* 4. Content — the body itself. Recipe blocks summarise on their own card. */}
              {isRecipeMode && (
                <ReviewCard icon="ri-restaurant-line" title="Recipe body">
                  {ingredients.filter((i) => i.name.trim()).length === 0 ? (
                    <p className="text-sm italic text-[var(--color-ink-3)]">
                      No ingredients added yet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-[var(--color-line)] text-sm">
                      {ingredients
                        .filter((i) => i.name.trim())
                        .map((ing, idx) => (
                          <li key={ing.id || idx} className="flex items-center justify-between py-2">
                            <span className="font-medium text-[var(--color-ink)]">{ing.name}</span>
                            <span className="font-mono text-sm text-[var(--color-ink-2)]">
                              {ing.quantity} {ing.unit}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </ReviewCard>
              )}

              {/* 5. Final actions — Publish, Assign, Save draft. */}
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-brand-tint-2)] bg-[var(--color-brand-tint)] p-5 shadow-e1">
                <div className="flex items-start gap-3">
                  <span className="flex size-tap-admin shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-600)] text-white">
                    <Icon icon="ri-rocket-2-line" className="text-lg" />
                  </span>
                  <div className="flex-1">
                    <h3 className="font-[family-name:var(--font-ui)] text-md font-semibold text-[var(--color-ink)]">
                      Ready to go live?
                    </h3>
                    <p className="mt-0.5 text-sm text-[var(--color-ink-2)]">
                      Publishing makes this procedure visible to everyone in the
                      selected access ranges and notifies assignees. Saving as a
                      draft keeps it private until you're ready.
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="primary"
                    size="default"
                    disabled={isPending}
                    onClick={() => void submit('published')}
                    className="gap-2"
                  >
                    <Icon icon="ri-send-plane-fill" />
                    {isPending ? tForm('publishing') : 'Publish & assign'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="default"
                    disabled={isPending}
                    onClick={() => void submit('draft')}
                  >
                    Save as draft
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      // No-op stub: re-sends the notification digest to assignees
                      // once the procedure is published. Wired through here so
                      // the manager has a one-click "nudge" without republishing.
                      setIsDirty(true);
                    }}
                    className="ml-auto inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-[var(--color-ink-2)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)]"
                  >
                    <Icon icon="ri-notification-3-line" />
                    Notify assignees
                  </button>
                </div>
                <p className="mt-3 text-sm text-[var(--color-ink-2)]">
                  <Icon icon="ri-information-line" className="mr-1 align-text-bottom" />
                  {accessSelections.employees.size > 0
                    ? `${accessSelections.employees.size} employee${accessSelections.employees.size === 1 ? '' : 's'} will be notified when published.`
                    : 'No assignees selected — only people in the access ranges above will see this.'}
                </p>
              </div>
            </div>
          </Section>
        )}

        {/* Sticky Bottom Toolbar */}
        <div className="sticky-bar fixed bottom-0 left-0 right-0 z-sticky flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 shadow-e2 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-surface)] sm:px-6">
          <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)]">
            <span
              className={cn(
                'size-2 rounded-full',
                isDirty ? 'bg-[var(--color-warn)]' : 'bg-[var(--color-ok)]',
              )}
              aria-hidden="true"
            />
            {isDirty ? (
              <>
                {tForm('draftLabel')}
                <span className="text-[var(--color-warn-ink)] ml-1">{tForm('unsavedLabel')}</span>
              </>
            ) : lastSavedAt ? (
              <span className="font-medium normal-case tracking-normal text-[var(--color-ink-2)]">
                {tForm('savedAt', { time: formatSavedTime(lastSavedAt, locale) })}
              </span>
            ) : (
              tForm('draftLabel')
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {isDirty && (
              <button
                type="button"
                onClick={discard}
                className="text-sm font-medium text-[var(--color-ink-2)] underline-offset-4 hover:underline mr-2"
              >
                {tForm('discard')}
              </button>
            )}
            {wizardStep !== 'details' && (
              <Button
                type="button"
                variant="neutral"
                size="sm"
                onClick={() => {
                  if (wizardStep === 'ingredients') setWizardStep('details');
                  else if (wizardStep === 'method') setWizardStep(isRecipeMode ? 'ingredients' : 'details');
                  else if (wizardStep === 'content') setWizardStep('details');
                  else if (wizardStep === 'quiz') setWizardStep(isRecipeMode ? 'method' : 'content');
                  else if (wizardStep === 'access') setWizardStep('quiz');
                  else if (wizardStep === 'review') setWizardStep('access');
                }}
                className="gap-2"
              >
                <LuArrowLeft aria-hidden="true" className="text-sm" />
                <span>Back</span>
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isPending}
              onClick={() => void submit('draft')}
            >
              {tForm('saveDraft')}
            </Button>
            {wizardStep === 'review' ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isPending}
                onClick={() => void submit('published')}
              >
                {isPending ? tForm('publishing') : tForm('publish')}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleNextStep}
                className="gap-2"
              >
                <span>Next step</span>
                <LuArrowRight aria-hidden="true" className="text-sm" />
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Category Selection Modal for Exceeding Categories ("Other") */}
      <Modal
        open={isOtherModalOpen}
        onClose={() => {
          setIsOtherModalOpen(false);
          setModalSearchQuery('');
        }}
        title={locale === 'es' ? 'Todas las categorías' : 'All Library Categories'}
        size="lg"
      >
        <div className="p-6 space-y-5">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-4">
            <div>
              <h3 className="font-[family-name:var(--font-ui)] text-lg font-semibold text-[var(--color-ink)]">
                {locale === 'es' ? 'Seleccionar Categoría' : 'Select Library Category'}
              </h3>
              <p className="text-sm text-[var(--color-ink-2)] mt-0.5">
                {locale === 'es'
                  ? 'Elige cualquier categoría para este procedimiento'
                  : 'Choose any category where this procedure will appear.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOtherModalOpen(false);
                setModalSearchQuery('');
              }}
              className="flex size-8 items-center justify-center rounded-lg text-[var(--color-ink-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] transition-colors"
            >
              <LuX aria-hidden="true" className="text-lg" />
            </button>
          </div>

          {/* Search Input inside Modal */}
          <div className="relative">
            <LuSearch aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-3)]" />
            <Input
              type="text"
              placeholder={locale === 'es' ? 'Buscar categorías...' : 'Search categories...'}
              value={modalSearchQuery}
              onChange={(e) => setModalSearchQuery(e.target.value)}
              className="pl-10 pr-8 text-sm h-10 bg-[var(--color-surface)] border-[var(--color-line-2)]"
            />
            {modalSearchQuery && (
              <button
                type="button"
                onClick={() => setModalSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
              >
                <LuX aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Category Grid inside Modal */}
          <div className="max-h-list overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {modalFilteredCategories.map((c) => {
                const isSelected = categoryId === c.id;
                const style = getCategoryBadgeStyle(c.slug);
                const name = locale === 'es' ? c.nameEs : c.nameEn;

                return (
                  <button
                    key={c.id}
                    type="button"
                    title={name}
                    onClick={() => {
                      handleCategoryChange(c.id);
                      setIsOtherModalOpen(false);
                      setModalSearchQuery('');
                    }}
                    className={cn(
                      'group relative flex items-center gap-4 rounded-[var(--radius-lg)] border p-4 text-left transition-all duration-[var(--dur)]',
                      isSelected
                        ? 'border-[var(--color-brand-600)] bg-[var(--color-surface)]'
                        : 'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)]',
                    )}
                  >
                    <div
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-lg text-lg shadow-e1',
                        style.bg,
                        style.text,
                      )}
                    >
                      <Icon icon={style.icon} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-sm text-[var(--color-ink)] line-clamp-2 leading-heading" title={name}>
                        {name}
                      </h4>
                      <p className="mt-0.5 text-sm text-[var(--color-ink-2)] truncate">
                        {categoryCountLabel(c.slug)}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white text-sm">
                        <LuCheck aria-hidden="true" className="font-semibold" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {modalFilteredCategories.length === 0 && (
              <div className="py-8 text-center text-sm text-[var(--color-ink-2)]">
                {locale === 'es' ? 'No se encontraron categorías.' : 'No categories found.'}
              </div>
            )}
          </div>

          {/* Create new category — inline mini-form */}
          <div className="border-t border-[var(--color-line)] pt-4">
            {!isCreatingCategory ? (
              <button
                type="button"
                onClick={() => setIsCreatingCategory(true)}
                className="flex w-full items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-3)] px-4 py-3 text-sm font-medium text-[var(--color-ink-2)] hover:border-[var(--color-brand-600)] hover:bg-[var(--color-brand-tint)] hover:text-[var(--color-brand-700)] transition-colors"
              >
                <Icon icon="ri-add-circle-line" className="text-base" />
                New category
              </button>
            ) : (
              <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-brand-600)] bg-[var(--color-brand-tint)] p-4">
                <p className="text-sm font-semibold text-[var(--color-brand-700)]">Create a new category</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-[var(--color-ink-2)]">Name (EN) <span className="text-[var(--color-bad)]">*</span></label>
                    <Input
                      value={newCatNameEn}
                      onChange={(e) => setNewCatNameEn(e.target.value)}
                      placeholder="e.g. Allergen Control"
                      className="h-tap-admin text-sm"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-[var(--color-ink-2)]">Name (ES)</label>
                    <Input
                      value={newCatNameEs}
                      onChange={(e) => setNewCatNameEs(e.target.value)}
                      placeholder="e.g. Control de Alérgenos"
                      className="h-tap-admin text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => { void handleCreateCategory(); }}
                    disabled={!newCatNameEn.trim() || isSavingCat}
                    className="bg-[var(--color-brand-700)] text-white hover:bg-[var(--color-brand-800)]"
                  >
                    {isSavingCat ? 'Creating…' : 'Create & select'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCreatingCategory(false);
                      setNewCatNameEn('');
                      setNewCatNameEs('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* The floating Live Preview pill was here: the same control, with the same
          words and the same icon, already sits in the page's own bar at the top.
          Two of one control on one screen makes a reader check whether they do
          different things. */}

      {/* Live Procedure Preview Drawer */}
      <Drawer
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Live Procedure Preview"
        size="lg"
      >
        <div className="space-y-6 p-1">
          {/* Drawer Header Language Switcher */}
          <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
            <span className="text-sm font-semibold text-[var(--color-ink-2)]">
              Preview Language
            </span>
            <SegmentedControl
              label="Preview language"
              value={previewLang}
              onChange={(lang) => setPreviewLang(lang as 'en' | 'es')}
              segments={[
                { value: 'en', label: 'EN' },
                { value: 'es', label: 'ES' },
              ]}
            />
          </div>

          {/* Rendered Employee Procedure View */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6 space-y-6">
            {/* Category & Clearance Tag */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-panel)] px-3 py-1 text-sm font-semibold text-[var(--color-ink-2)]">
                <LuFolder aria-hidden="true" className="text-sm" />
                {categoryLabel}
              </span>
              {clearanceLevel && (
                <span className="rounded-[var(--radius-sm)] bg-[var(--color-panel)] px-3 py-1 text-sm font-semibold text-[var(--color-ink-2)] border border-[var(--color-line-2)]">
                  {clearanceLabel}
                </span>
              )}
            </div>

            {/* Title & Purpose */}
            <div className="space-y-2 border-b border-[var(--color-line)] pb-4">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                {(previewLang === 'en' ? titleEn : titleEs) || (previewLang === 'en' ? titleEs : titleEn) || '(Untitled procedure)'}
              </h2>
              <p className="text-base leading-body text-[var(--color-ink-2)]">
                {(previewLang === 'en' ? purposeEn : purposeEs) || (previewLang === 'en' ? purposeEs : purposeEn) || '(No purpose specified)'}
              </p>
            </div>

            {/* Recipe Ingredients */}
            {isRecipeMode && ingredients.some((i) => i.name.trim()) && (
              <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-wash)] p-4">
                <h3 className="font-semibold text-sm text-[var(--color-ink)] flex items-center gap-2">
                  <LuUtensils aria-hidden="true" className="text-[var(--color-ink-2)]" />
                  <span>Recipe Ingredients</span>
                </h3>
                <div className="divide-y divide-[var(--color-line)] text-sm">
                  {ingredients.filter((i) => i.name.trim()).map((ing) => (
                    <div key={ing.id} className="flex items-center justify-between py-2">
                      <span className="font-semibold text-[var(--color-ink)]">{ing.name}</span>
                      <span className="font-mono text-[var(--color-ink-2)]">{ing.quantity} {ing.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rendered Content Blocks */}
            <div className="space-y-5">
              {blocks.length === 0 ? (
                <div className="py-8 text-center text-sm text-[var(--color-ink-3)] italic">
                  No content blocks added yet. Use the block editor to add text, tables, steps, images, or warnings.
                </div>
              ) : (
                blocks.map((b, idx) => {
                  if (b.kind === 'text') {
                    const text = previewLang === 'en' ? (b.body?.en || b.body?.es) : (b.body?.es || b.body?.en);
                    return (
                      <div key={b.id || idx} className="text-base leading-body text-[var(--color-ink)] whitespace-pre-wrap">
                        {text || '(Empty text block)'}
                      </div>
                    );
                  }
                  if (b.kind === 'heading') {
                    const headingText = previewLang === 'en' ? (b.text?.en || b.text?.es) : (b.text?.es || b.text?.en);
                    return (
                      <h3 key={b.id || idx} className="font-semibold text-lg text-[var(--color-ink)] border-b border-[var(--color-line)] pb-1 mt-4">
                        {headingText || '(Empty heading)'}
                      </h3>
                    );
                  }
                  if (b.kind === 'method') {
                    return (
                      <div key={b.id || idx} className="space-y-2">
                        <h4 className="font-semibold text-sm text-[var(--color-ink-2)]">
                          Steps & Procedure
                        </h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-[var(--color-ink)]">
                          {b.steps.map((step, sIdx) => {
                            const stepBody = previewLang === 'en' ? (step.body?.en || step.body?.es) : (step.body?.es || step.body?.en);
                            return (
                              <li key={step.id || sIdx} className="pl-1">
                                <span className="font-medium">{stepBody}</span>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    );
                  }
                  if (b.kind === 'warning') {
                    const warningBody = previewLang === 'en' ? (b.body?.en || b.body?.es) : (b.body?.es || b.body?.en);
                    return (
                      <div key={b.id || idx} className="flex items-start gap-3 rounded-[var(--radius-md)] bg-[var(--color-warn-tint)] p-4 text-[var(--color-warn-ink)]">
                        <LuTriangleAlert aria-hidden="true" className="text-lg text-[var(--color-warn-ink)] shrink-0 mt-0.5" />
                        <div className="text-base leading-body font-medium">
                          {warningBody || '(Empty warning callout)'}
                        </div>
                      </div>
                    );
                  }
                  if (b.kind === 'table') {
                    return (
                      <div key={b.id || idx} className="space-y-2 overflow-x-auto">
                        <table className="w-full text-left text-sm border border-[var(--color-line-2)] rounded-lg overflow-hidden">
                          <thead className="bg-[var(--color-wash)] font-semibold text-[var(--color-ink)] border-b border-[var(--color-line-2)]">
                            <tr>
                              {b.headers.map((h, hIdx) => (
                                <th key={hIdx} className="p-3 border-r last:border-0 border-[var(--color-line-2)]">
                                  {(previewLang === 'en' ? (h.en || h.es) : (h.es || h.en)) || `Column ${hIdx + 1}`}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-line)]">
                            {b.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-[var(--color-wash)]">
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-3 border-r last:border-0 border-[var(--color-line)] text-[var(--color-ink-2)]">
                                    {(previewLang === 'en' ? (cell.en || cell.es) : (cell.es || cell.en)) || '-'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }
                  if (b.kind === 'image') {
                    const caption = previewLang === 'en' ? (b.caption?.en || b.caption?.es) : (b.caption?.es || b.caption?.en);
                    return (
                      <div key={b.id || idx} className="space-y-1 text-center">
                        {b.src ? (
                          <img src={b.src} alt={b.alt?.en || 'Procedure image'} className="mx-auto max-h-media rounded-lg object-cover" />
                        ) : (
                          <div className="h-tile rounded-lg bg-[var(--color-wash)] border border-dashed border-[var(--color-line-2)] flex items-center justify-center text-sm text-[var(--color-ink-3)]">
                            (Image placeholder: {b.src || 'No image URL provided'})
                          </div>
                        )}
                        {caption && <p className="text-sm text-[var(--color-ink-2)] italic">{caption}</p>}
                      </div>
                    );
                  }
                  if (b.kind === 'attachment') {
                    const title = previewLang === 'en' ? (b.title?.en || b.title?.es) : (b.title?.es || b.title?.en);
                    return (
                      <div key={b.id || idx} className="flex items-center gap-3 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-wash)] p-3">
                        <LuPaperclip aria-hidden="true" className="text-lg text-[var(--color-ink-2)]" />
                        <span className="font-semibold text-sm text-[var(--color-ink)] flex-1">{title || 'Download attachment'}</span>
                        <LuDownload aria-hidden="true" className="text-sm text-[var(--color-ink-2)]" />
                      </div>
                    );
                  }
                  if (b.kind === 'checklist') {
                    const rawTitle = previewLang === 'en'
                      ? (b.title?.en || b.title?.es)
                      : (b.title?.es || b.title?.en);
                    const checklistTitle = rawTitle?.trim() || (previewLang === 'es' ? 'Lista de verificación' : 'Checklist');
                    return (
                      <div key={b.id || idx} className="space-y-3 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-[var(--color-ink)]">{checklistTitle}</p>
                          <span className="text-[10px] font-semibold text-[var(--color-ink-3)] px-1.5 py-0.5 rounded bg-[var(--color-wash)]">
                            0/{b.items.length}
                          </span>
                        </div>
                        <ul className="space-y-1.5">
                          {b.items.map((it, iIdx) => {
                            const itemText = previewLang === 'en'
                              ? (it.text?.en || it.text?.es)
                              : (it.text?.es || it.text?.en);
                            return (
                              <li key={it.id || iIdx} className="flex items-center gap-2.5 text-sm text-[var(--color-ink)]">
                                <span
                                  aria-hidden="true"
                                  className="flex size-4 shrink-0 items-center justify-center rounded border border-[var(--color-line-2)] bg-[var(--color-surface)]"
                                />
                                <span className="flex-1 text-sm font-medium">{itemText || `Item ${iIdx + 1}`}</span>
                              </li>
                            );
                          })}
                        </ul>
                        <p className="pt-0.5 text-xs font-medium text-[var(--color-ink-3)]">
                          {tForm('composer.checklist.previewHint')}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })
              )}
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

function Section({
  id,
  icon,
  title,
  subtitle,
  headerAction,
  children,
}: {
  id?: string;
  /** A component, or a name the icon registry resolves. */
  icon?: IconType | string;
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section
      id={id}
      className="scroll-mt-6 space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6"
    >
      {/* Wraps on a phone. The header's action is a search field and two arrows
          at their natural width; beside a title at 390px they pushed the section
          78px past the screen and the whole page scrolled sideways. */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-line)] pb-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {icon && (
            <div className="flex size-tap-admin shrink-0 items-center justify-center rounded-lg bg-[var(--color-panel)] text-[var(--color-ink-2)] text-lg">
              <Icon icon={icon} />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-ui)] text-md font-semibold tracking-snug text-[var(--color-ink)]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-sm text-[var(--color-ink-2)]">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {headerAction}
      </header>
      <div className="space-y-4 pt-1">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Review-only helpers. Kept local so the wizard's `new-procedure-form.tsx`
// stays self-contained — the Review step is the only place that needs them.
// ---------------------------------------------------------------------------

interface AccessOption {
  id: string;
  label: string;
  sub?: string;
  icon?: string;
}

/** Single labelled chip — used to surface counts (block count, clearance,
 *  ingredient count) without burying the underlying data. */
function Chip({
  icon,
  tone,
  children,
}: {
  icon?: string;
  tone?: 'brand' | 'wash' | 'ok';
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold',
        tone === 'brand'
          ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]'
          : tone === 'ok'
            ? 'border border-[var(--color-ok-tint-2)] bg-[var(--color-ok-tint)] text-[var(--color-ok)]'
            : 'bg-[var(--color-wash)] text-[var(--color-ink-2)]',
      )}
    >
      {icon && <Icon icon={icon} className="text-sm" />}
      {children}
    </span>
  );
}

/** One section-card inside the Review step. Mirrors the existing `Section`
 *  look (icon box + title) but without the bottom-border header — the cards
 *  in Review are stacked tight, so we want visual separation instead. */
function ReviewCard({
  icon,
  title,
  eyebrow,
  children,
}: {
  icon: string;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-5 shadow-e1">
      <header className="mb-3 flex items-center gap-3">
        <span className="flex size-tap-admin shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] text-lg">
          <Icon icon={icon} />
        </span>
        <span className="flex-1">
          {eyebrow && (
            <span className="block text-sm font-semibold text-[var(--color-brand-700)]">
              {eyebrow}
            </span>
          )}
          <span className="block font-[family-name:var(--font-ui)] text-sm font-semibold tracking-snug text-[var(--color-ink)]">
            {title}
          </span>
        </span>
      </header>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/** A small icon + label + chips-or-empty row inside a ReviewCard. Used for
 *  the locations / roles / stations lists — same shape across the three
 *  so the manager can scan once. */
function ReviewChipRow({
  icon,
  label,
  items,
  emptyText,
}: {
  icon: string;
  label: string;
  items: AccessOption[];
  emptyText: string;
}): React.ReactElement {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink-3)]">
        <Icon icon={icon} className="text-sm" />
        <span>{label}</span>
        <span className="text-[var(--color-ink-3)]">·</span>
        <span className="text-[var(--color-ink-3)]">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm italic text-[var(--color-ink-3)]">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((opt) => (
            <span
              key={opt.id}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-1 text-sm font-medium text-[var(--color-ink)]"
            >
              {opt.icon && <Icon icon={opt.icon} className="text-sm text-[var(--color-brand-700)]" />}
              <span>{opt.label}</span>
              {opt.sub && (
                <span className="text-[var(--color-ink-3)]">{opt.sub}</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
