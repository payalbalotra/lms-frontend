'use client';

import * as React from 'react';
import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomSelect } from '@/components/ui/custom-select';
import { Modal } from '@/components/ui/modal';
import { Drawer } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { createProcedure, ApiException } from '@/lib/api';
import { getCategoryIcon } from '@/lib/category-icons';
import type {
  Category,
  ExtractedProcedure,
  ProcedureBlock,
  ProcedureBody,
  ProcedureIngredient,
  ProcedureMethodStep,
  ProcedureYieldItem,
  Localised,
  LocalisedOptional,
} from '@/lib/types';
import { ProcedureBlockList } from '@/components/admin/procedure-block-list';
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
import { LuArrowLeft, LuArrowRight, LuBrush, LuCheck, LuChevronLeft, LuChevronRight, LuCircleAlert, LuCircleCheck, LuDownload, LuEllipsis, LuEye, LuFileText, LuFolder, LuLayoutGrid, LuPaperclip, LuSearch, LuShieldAlert, LuSparkles, LuStore, LuTriangleAlert, LuTruck, LuUserCog, LuUtensils, LuWrench, LuX } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import type { IconType } from 'react-icons';

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

  const sourceCategories = React.useMemo(() => {
    return categories && categories.length >= 4 ? categories : DEFAULT_CATEGORIES;
  }, [categories]);

  const initialCat = sourceCategories[0];
  const initialType = React.useMemo(() => deriveTypeFromCategory(initialCat), [initialCat]);

  const [creationMode, setCreationMode] = useState<'manual' | 'import'>('manual');
  const [wizardStep, setWizardStep] = useState<WizardStepId>('details');
  const [categoryId, setCategoryId] = useState<string>(() => initialCat?.id ?? DEFAULT_CATEGORIES[0].id);
  const [procedureType, setProcedureType] = useState<ProcedureTypeId>(() => initialType);
  const isRecipeMode = procedureType === 'recipe';
  const [categorySearch, setCategorySearch] = useState('');
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [titleEn, setTitleEn] = useState('');
  const [titleEs, setTitleEs] = useState('');
  const [titleLang, setTitleLang] = useState<'en' | 'es'>('en');
  const [purposeEn, setPurposeEn] = useState('');
  const [purposeEs, setPurposeEs] = useState('');
  const [purposeLang, setPurposeLang] = useState<'en' | 'es'>('en');
  const [clearanceLevel, setClearanceLevel] = useState<ClearanceTier | null>(null);
  const [blocks, setBlocksRaw] = useState<ProcedureBlock[]>([]);

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

  const handleSelectStep = React.useCallback(
    (targetStep: WizardStepId): void => {
      if (targetStep !== 'details') {
        if (!isRecipeMode && (targetStep === 'ingredients' || targetStep === 'method')) {
          return; // recipe-only step on a non-recipe procedure
        }
        if (!hasTitle) {
          setError(tErr('missingTitle'));
          return;
        }
        if (!hasPurpose) {
          setError(tErr('missingPurpose'));
          return;
        }
      }
      setError(null);
      setWizardStep(targetStep);
    },
    [hasTitle, hasPurpose, isRecipeMode, tErr],
  );

  const handleNextStep = React.useCallback((): void => {
    setError(null);

    if (wizardStep === 'details') {
      if (!hasTitle) {
        setError(tErr('missingTitle'));
        return;
      }
      if (!hasPurpose) {
        setError(tErr('missingPurpose'));
        return;
      }
      setWizardStep(isRecipeMode ? 'ingredients' : 'content');
      return;
    }

    if (wizardStep === 'ingredients') {
      const hasNamedIngredient = ingredients.some((i) => i.name.trim().length > 0);
      if (!hasNamedIngredient) {
        setError(tErr('missingIngredient'));
        return;
      }
      setWizardStep('method');
      return;
    }

    if (wizardStep === 'method' || wizardStep === 'content') {
      setWizardStep('access');
      return;
    }

    if (wizardStep === 'access') {
      if (clearanceLevel === null) {
        setError(tErr('missingAccess'));
        return;
      }
      setWizardStep('review');
      return;
    }
  }, [wizardStep, hasTitle, hasPurpose, isRecipeMode, ingredients, clearanceLevel, tErr]);

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

  const displayCategories = React.useMemo(() => {
    const query = categorySearch.toLowerCase().trim();
    if (!query) return primaryCategories;
    return sourceCategories.filter((c) => {
      const name = (locale === 'es' ? c.nameEs : c.nameEn).toLowerCase();
      return name.includes(query) || c.slug.toLowerCase().includes(query);
    });
  }, [sourceCategories, primaryCategories, categorySearch, locale]);

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

    const isDraft = status === 'draft';
    const titleEnOk = titleEn.trim().length > 0;
    const titleEsOk = titleEs.trim().length > 0;
    const purposeEnOk = purposeEn.trim().length > 0;
    const purposeEsOk = purposeEs.trim().length > 0;

    if (!titleEnOk && !titleEsOk) {
      setError(tErr(isDraft ? 'missingTitleDraft' : 'missingTitle'));
      return;
    }
    if (isDraft ? (!titleEnOk && !titleEsOk) : (!titleEnOk || !titleEsOk)) {
      // For published: must have both. Already handled above for empty-both.
    }
    if (!purposeEnOk && !purposeEsOk) {
      setError(tErr(isDraft ? 'missingPurposeDraft' : 'missingPurpose'));
      return;
    }
    if (!isDraft && (!purposeEnOk || !purposeEsOk)) {
      setError(tErr('missingPurpose'));
      return;
    }

    if (isRecipeMode) {
      const hasNamedIngredient = ingredients.some((i) => i.name.trim().length > 0);
      if (!hasNamedIngredient) {
        setError(tErr('missingIngredient'));
        return;
      }
    }

    if (!isDraft && clearanceLevel === null) {
      setError(tErr('missingAccess'));
      return;
    }

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
        await createProcedure({
          titleEn: titleEn.trim() || titleEs.trim(),
          titleEs: titleEs.trim() || titleEn.trim(),
          categoryId: categoryId.length > 0 ? categoryId : null,
          purposeEn: purposeEn.trim() || purposeEs.trim(),
          purposeEs: purposeEs.trim() || purposeEn.trim(),
          status,
          bodyEn: body,
          bodyEs: body,
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
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top action header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${locale}/admin/library`}
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-ink-2)] hover:text-[var(--color-brand-700)]"
        >
          <LuArrowLeft aria-hidden="true" className="text-base" />
          {tNav('crumbBack')}
        </Link>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="neutral"
            size="sm"
            onClick={() => setIsPreviewOpen(true)}
            className="gap-2 font-semibold"
          >
            <LuEye aria-hidden="true" />
            <span>Live Preview</span>
          </Button>
          <Link href={`/${locale}/admin/library`}>
            <Button type="button" variant="ghost" size="sm">
              {tNav('cancel')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Page Title Header */}
      <header className="space-y-1">
        <p className="text-xs font-semibold text-[var(--color-ink-2)]">
          {tNav('pageEyebrow')}
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--color-ink)]">
          {tTitles(procedureType as never)}
        </h1>
        <p className="max-w-3xl text-sm text-[var(--color-ink-2)]">
          {tTitles(`${procedureType}Subtitle` as never)}
        </p>
      </header>

      {/* Start Creation Choice Header */}
      <div className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <span className="text-sm font-semibold text-[var(--color-ink)]">
          How would you like to start?
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCreationMode('manual')}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all',
              creationMode === 'manual'
                ? 'bg-[var(--color-panel)] text-[var(--color-ink)] border border-[var(--color-ink)]'
                : 'border border-[var(--color-line-3)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:bg-[var(--color-wash)]',
            )}
          >
            <span>✎</span> Create manually
          </button>
          <button
            type="button"
            onClick={() => setCreationMode('import')}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all',
              creationMode === 'import'
                ? 'bg-[var(--color-panel)] text-[var(--color-ink)] border border-[var(--color-ink)]'
                : 'border border-[var(--color-line-3)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:bg-[var(--color-wash)]',
            )}
          >
            <LuSparkles aria-hidden="true" />
            Import a document (PDF, DOCX, Photo)
          </button>
        </div>
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
      <form className="max-w-4xl mx-auto space-y-8 pb-20" onSubmit={(e) => e.preventDefault()}>
        {error && (
          <div
            role="alert"
            className="rounded-[var(--radius-lg)] border border-[var(--color-bad-tint)] bg-[var(--color-bad-tint)] px-4 py-3 text-sm text-[var(--color-bad)]"
          >
            <p className="font-semibold">{error}</p>
            {errorDetails.length > 0 && (
              <ul className="mt-2 list-inside list-disc space-y-0.5 font-mono text-xs">
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
              headerAction={
                <div className="flex items-center gap-2">
                  {/* Category Search Input */}
                  <div className="relative w-field-md sm:w-field-lg">
                    <LuSearch aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-3)]" />
                    <Input
                      type="text"
                      placeholder="Search categories..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="pl-10 pr-8 text-xs h-tap-admin bg-[var(--color-surface)] border-[var(--color-line-2)] focus:border-[var(--color-brand-600)]"
                    />
                    {categorySearch && (
                      <button
                        type="button"
                        onClick={() => setCategorySearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
                      >
                        <LuX aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {/* Scroll Carousel Controls (Prev < and Next >) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (categoryScrollRef.current) {
                          categoryScrollRef.current.scrollBy({ left: -280, behavior: 'smooth' });
                        }
                      }}
                      className="flex size-tap-admin items-center justify-center rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] transition-colors active:scale-95"
                      title="Previous categories"
                    >
                      <LuChevronLeft aria-hidden="true" className="text-lg font-semibold" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (categoryScrollRef.current) {
                          categoryScrollRef.current.scrollBy({ left: 280, behavior: 'smooth' });
                        }
                      }}
                      className="flex size-tap-admin items-center justify-center rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] transition-colors active:scale-95"
                      title="Next categories"
                    >
                      <LuChevronRight aria-hidden="true" className="text-lg font-semibold" />
                    </button>
                  </div>
                </div>
              }
            >
              <div
                ref={categoryScrollRef}
                className="overflow-x-auto pb-2 pt-1 scrollbar-none scroll-smooth"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
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
                            ? 'border-[var(--color-ink)] bg-[var(--color-surface)] ring-1 ring-[var(--color-ink)]'
                            : 'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)]',
                        )}
                      >
                        {/* Selected Checkmark Badge */}
                        {isSelected && (
                          <div className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-[var(--color-ink)] text-white text-xs shadow-e1">
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
                            className="font-[family-name:var(--font-ui)] text-sm font-semibold tracking-snug text-[var(--color-ink)] line-clamp-2 leading-tight"
                            title={name}
                          >
                            {name}
                          </h4>
                          <p className="mt-1 text-xs text-[var(--color-ink-2)]">
                            {c.slug === 'recipes' ? '12 procedures' : c.slug === 'station' ? '18 procedures' : c.slug === 'cleaning' ? '8 procedures' : c.slug === 'admin' ? '10 procedures' : c.slug === 'delivery' ? '6 procedures' : 'Active category'}
                          </p>
                        </div>
                      </button>
                    );
                  })}

                  {/* 8th Card: Other (triggers modal to view/select from all exceeding categories) */}
                  {!categorySearch && (() => {
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
                            ? 'border-[var(--color-ink)] bg-[var(--color-surface)] ring-1 ring-[var(--color-ink)]'
                            : 'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)]',
                        )}
                      >
                        {/* Selected Checkmark Badge */}
                        {isOtherSelected && (
                          <div className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-[var(--color-ink)] text-white text-xs shadow-e1">
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
                            className="font-[family-name:var(--font-ui)] text-sm font-semibold tracking-snug text-[var(--color-ink)] line-clamp-2 leading-tight"
                            title={selectedName || 'Other'}
                          >
                            {selectedName ? selectedName : (locale === 'es' ? 'Otros' : 'Other')}
                          </h4>
                          <p className="mt-1 text-xs text-[var(--color-ink-2)] flex items-center gap-1">
                            <span>
                              {selectedName
                                ? (locale === 'es' ? 'Seleccionada' : 'Selected')
                                : (locale === 'es' ? 'Ver todas' : 'View all')}
                            </span>
                            <LuChevronRight aria-hidden="true" className="text-xs" />
                          </p>
                        </div>
                      </button>
                    );
                  })()}
                </div>
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
                      <div className="inline-flex rounded-md border border-[var(--color-line-2)] bg-[var(--color-wash)] p-0.5 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setTitleLang('en')}
                          className={cn(
                            'rounded-[var(--radius-sm)] px-3 py-0.5 transition-colors',
                            titleLang === 'en'
                              ? 'bg-[var(--color-ink)] text-white font-semibold'
                              : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]',
                          )}
                        >
                          EN
                        </button>
                        <button
                          type="button"
                          onClick={() => setTitleLang('es')}
                          className={cn(
                            'rounded-[var(--radius-sm)] px-3 py-0.5 transition-colors',
                            titleLang === 'es'
                              ? 'bg-[var(--color-ink)] text-white font-semibold'
                              : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]',
                          )}
                        >
                          ES
                        </button>
                      </div>
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
                      <span className="pointer-events-none select-none absolute right-3 text-xs font-medium text-[var(--color-ink-3)]">
                        {titleLang === 'en' ? titleEn.length : titleEs.length} / 100
                      </span>
                    </div>
                    {isTitleMissing && (
                      <p className="text-xs font-semibold text-[var(--color-bad)] mt-1 flex items-center gap-1">
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
                      <div className="inline-flex rounded-md border border-[var(--color-line-2)] bg-[var(--color-wash)] p-0.5 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setPurposeLang('en')}
                          className={cn(
                            'rounded-[var(--radius-sm)] px-3 py-0.5 transition-colors',
                            purposeLang === 'en'
                              ? 'bg-[var(--color-ink)] text-white font-semibold'
                              : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]',
                          )}
                        >
                          EN
                        </button>
                        <button
                          type="button"
                          onClick={() => setPurposeLang('es')}
                          className={cn(
                            'rounded-[var(--radius-sm)] px-3 py-0.5 transition-colors',
                            purposeLang === 'es'
                              ? 'bg-[var(--color-ink)] text-white font-semibold'
                              : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]',
                          )}
                        >
                          ES
                        </button>
                      </div>
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
                      <span className="pointer-events-none select-none absolute right-3 bottom-2 text-xs font-medium text-[var(--color-ink-3)]">
                        {purposeLang === 'en' ? purposeEn.length : purposeEs.length} / 500
                      </span>
                    </div>
                    {isPurposeMissing && (
                      <p className="text-xs font-semibold text-[var(--color-bad)] mt-1 flex items-center gap-1">
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
            <ProcedureBlockList blocks={blocks} onChange={setBlocks} />
          </Section>
        )}

        {/* Step: Access & Clearance Level Section */}
        {wizardStep === 'access' && (
          <Section
            id="proc-access"
            icon={LuUserCog}
            title={tAccess('title')}
            subtitle={tAccess('subtitle')}
          >
            <div className="space-y-4">
              <Label className="text-sm font-semibold text-[var(--color-ink)]">
                {tAccess('label')}
                <span aria-hidden="true" className="ml-1 text-[var(--color-bad)]">*</span>
              </Label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { id: 'general', key: 'general' },
                  { id: 'station', key: 'station' },
                  { id: 'confidential', key: 'confidential' },
                  { id: 'master', key: 'master' },
                ].map((tier) => {
                  const isSelected = clearanceLevel === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => {
                        setClearanceLevel(tier.id as ClearanceTier);
                        setIsDirty(true);
                      }}
                      className={cn(
                        'flex flex-col items-start rounded-[var(--radius-lg)] border p-4 text-left transition-all',
                        isSelected
                          ? 'border-[var(--color-ink)] bg-[var(--color-surface)] ring-1 ring-[var(--color-ink)]'
                          : 'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)]',
                      )}
                    >
                      <div className="flex items-center gap-2 font-semibold text-sm text-[var(--color-ink)]">
                        <input
                          type="radio"
                          name="clearanceLevel"
                          checked={isSelected}
                          onChange={() => {
                            setClearanceLevel(tier.id as ClearanceTier);
                            setIsDirty(true);
                          }}
                          className="size-4 accent-[var(--color-brand-600)]"
                        />
                        <span>{tAccess(tier.key as never)}</span>
                      </div>
                      <p className="mt-1 pl-6 text-xs text-[var(--color-ink-2)]">
                        {tAccess(`${tier.key}Desc` as never)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </Section>
        )}

        {/* Step: Review & Finish Section */}
        {wizardStep === 'review' && (
          <Section
            id="proc-review"
            icon={LuCircleCheck}
            title="Review & Finish"
            subtitle="Verify all procedure details before saving or publishing."
          >
            <div className="space-y-6">
              {/* Overview Summary */}
              <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-wash)] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-2">
                  <span className="text-xs font-semibold text-[var(--color-ink-2)]">
                    {categoryLabel} · {isRecipeMode ? 'Recipe' : 'Procedure'}
                  </span>
                  <span className="rounded-[var(--radius-sm)] bg-[var(--color-panel)] px-3 py-0.5 text-xs font-semibold text-[var(--color-ink-2)]">
                    {clearanceLabel}
                  </span>
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-ui)] text-lg font-semibold text-[var(--color-ink)]">
                    {activeTitle || '(Untitled procedure)'}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--color-ink-2)]">
                    {activePurpose || '(No purpose provided)'}
                  </p>
                </div>
              </div>

              {/* Recipe Ingredients Summary */}
              {isRecipeMode && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-[var(--color-ink)]">
                    Ingredients ({ingredients.filter((i) => i.name.trim()).length})
                  </h4>
                  <div className="rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] p-3 text-sm space-y-1">
                    {ingredients.filter((i) => i.name.trim()).length > 0 ? (
                      ingredients
                        .filter((i) => i.name.trim())
                        .map((ing, idx) => (
                          <div key={ing.id || idx} className="flex items-center justify-between py-1 border-b border-[var(--color-line)] last:border-0">
                            <span className="font-medium text-[var(--color-ink)]">{ing.name}</span>
                            <span className="text-[var(--color-ink-2)] font-mono text-xs">{ing.quantity} {ing.unit}</span>
                          </div>
                        ))
                    ) : (
                      <p className="text-xs text-[var(--color-ink-3)] italic">No ingredients added yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Content / Blocks Breakdown Summary */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-[var(--color-ink)]">
                  Content Blocks ({blocks.length})
                </h4>
                <div className="rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] p-3 text-sm">
                  {blocks.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-[var(--color-ink-2)] text-xs">
                      {blocks.map((b, i) => (
                        <li key={b.id || i}>
                          <span className="font-semibold capitalize text-[var(--color-ink)]">{b.kind}</span>
                          {b.kind === 'heading' && b.text?.en && `: "${b.text.en}"`}
                          {b.kind === 'text' && b.body?.en && `: "${b.body.en.slice(0, 40)}..."`}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[var(--color-ink-3)] italic">No blocks added yet.</p>
                  )}
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* Sticky Bottom Toolbar */}
        <div className="sticky-bar fixed bottom-0 left-0 right-0 z-sticky flex items-center justify-between border-t border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-surface)] shadow-e2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-ink-2)]">
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
          <div className="flex items-center gap-3">
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
                  else if (wizardStep === 'access') setWizardStep(isRecipeMode ? 'method' : 'content');
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
              <p className="text-xs text-[var(--color-ink-2)] mt-0.5">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
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
                        ? 'border-[var(--color-ink)] bg-[var(--color-surface)] ring-1 ring-[var(--color-ink)]'
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
                      <h4 className="font-semibold text-sm text-[var(--color-ink)] line-clamp-2 leading-tight" title={name}>
                        {name}
                      </h4>
                      <p className="mt-0.5 text-xs text-[var(--color-ink-2)] truncate">
                        {c.slug === 'recipes'
                          ? '12 procedures'
                          : c.slug === 'station'
                            ? '18 procedures'
                            : c.slug === 'cleaning'
                              ? '8 procedures'
                              : c.slug === 'admin'
                                ? '10 procedures'
                                : c.slug === 'delivery'
                                  ? '6 procedures'
                                  : 'Active category'}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-ink)] text-white text-xs">
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
        </div>
      </Modal>

      {/* Floating Live Preview Pill Button */}
      <button
        type="button"
        onClick={() => setIsPreviewOpen(true)}
        className="fixed bottom-20 right-6 z-sticky flex items-center gap-2 rounded-full bg-[var(--color-surface)] text-[var(--color-ink)] px-4 py-3 shadow-e3 hover:bg-[var(--color-panel)] transition-colors duration-[var(--dur)] ease-[var(--ease)] font-semibold text-xs"
      >
        <LuEye aria-hidden="true" className="text-base" />
        <span>Live Preview</span>
      </button>

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
            <span className="text-xs font-semibold text-[var(--color-ink-2)]">
              Preview Language
            </span>
            <div className="inline-flex rounded-lg border border-[var(--color-line-2)] bg-[var(--color-wash)] p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPreviewLang('en')}
                className={cn(
                  'rounded-md px-3 py-1 transition-all',
                  previewLang === 'en'
                    ? 'bg-[var(--color-ink)] text-white'
                    : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]',
                )}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setPreviewLang('es')}
                className={cn(
                  'rounded-md px-3 py-1 transition-all',
                  previewLang === 'es'
                    ? 'bg-[var(--color-ink)] text-white'
                    : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]',
                )}
              >
                Español
              </button>
            </div>
          </div>

          {/* Rendered Employee Procedure View */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6 space-y-6">
            {/* Category & Clearance Tag */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-panel)] px-3 py-1 text-xs font-semibold text-[var(--color-ink-2)]">
                <LuFolder aria-hidden="true" className="text-sm" />
                {categoryLabel}
              </span>
              {clearanceLevel && (
                <span className="rounded-[var(--radius-sm)] bg-[var(--color-panel)] px-3 py-1 text-xs font-semibold text-[var(--color-ink-2)] border border-[var(--color-line-2)]">
                  {clearanceLabel}
                </span>
              )}
            </div>

            {/* Title & Purpose */}
            <div className="space-y-2 border-b border-[var(--color-line)] pb-4">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--color-ink)]">
                {(previewLang === 'en' ? titleEn : titleEs) || (previewLang === 'en' ? titleEs : titleEn) || '(Untitled procedure)'}
              </h2>
              <p className="text-sm text-[var(--color-ink-2)] leading-relaxed">
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
                <div className="divide-y divide-[var(--color-line)] text-xs">
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
                <div className="py-8 text-center text-xs text-[var(--color-ink-3)] italic">
                  No content blocks added yet. Use the block editor to add text, tables, steps, images, or warnings.
                </div>
              ) : (
                blocks.map((b, idx) => {
                  if (b.kind === 'text') {
                    const text = previewLang === 'en' ? (b.body?.en || b.body?.es) : (b.body?.es || b.body?.en);
                    return (
                      <div key={b.id || idx} className="text-sm text-[var(--color-ink)] leading-relaxed whitespace-pre-wrap">
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
                        <h4 className="font-semibold text-xs text-[var(--color-ink-2)]">
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
                        <div className="text-xs leading-relaxed font-medium">
                          {warningBody || '(Empty warning callout)'}
                        </div>
                      </div>
                    );
                  }
                  if (b.kind === 'table') {
                    return (
                      <div key={b.id || idx} className="space-y-2 overflow-x-auto">
                        <table className="w-full text-left text-xs border border-[var(--color-line-2)] rounded-lg overflow-hidden">
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
                          <div className="h-tile rounded-lg bg-[var(--color-wash)] border border-dashed border-[var(--color-line-2)] flex items-center justify-center text-xs text-[var(--color-ink-3)]">
                            (Image placeholder: {b.src || 'No image URL provided'})
                          </div>
                        )}
                        {caption && <p className="text-xs text-[var(--color-ink-2)] italic">{caption}</p>}
                      </div>
                    );
                  }
                  if (b.kind === 'attachment') {
                    const title = previewLang === 'en' ? (b.title?.en || b.title?.es) : (b.title?.es || b.title?.en);
                    return (
                      <div key={b.id || idx} className="flex items-center gap-3 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-wash)] p-3">
                        <LuPaperclip aria-hidden="true" className="text-lg text-[var(--color-ink-2)]" />
                        <span className="font-semibold text-xs text-[var(--color-ink)] flex-1">{title || 'Download attachment'}</span>
                        <LuDownload aria-hidden="true" className="text-xs text-[var(--color-ink-2)]" />
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
  icon?: IconType;
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
      <header className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] pb-3">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="flex size-tap-admin shrink-0 items-center justify-center rounded-lg bg-[var(--color-panel)] text-[var(--color-ink-2)] text-lg">
              <Icon icon={icon} />
            </div>
          )}
          <div>
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
