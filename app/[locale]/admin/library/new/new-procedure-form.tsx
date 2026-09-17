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
  Localised,
  LocalisedOptional,
} from '@/lib/types';
import { ProcedureBlockList } from '@/components/admin/procedure-block-list';
import {
  ProcedureTypeSelector,
  type ProcedureTypeId,
} from '@/components/admin/procedure-type-selector';
import { ProcedureProgressSidebar } from '@/components/admin/procedure-progress-sidebar';
import {
  ProcedureWizardStepper,
  type WizardStepId,
} from '@/components/admin/procedure-wizard-stepper';
import {
  RecipeIngredientsEditor,
  type RecipeIngredientItem,
} from '@/components/admin/recipe-ingredients-editor';
import { RecipeLivePreview } from '@/components/admin/recipe-live-preview';
import { DocumentImportPanel } from '@/components/admin/document-import-panel';

interface NewProcedureFormProps {
  locale: string;
  categories: Category[];
}

export type ClearanceTier = 'general' | 'station' | 'confidential' | 'master';

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
}): ProcedureBody {
  const { titleEn, titleEs, ingredients, factors } = args;
  const backendIngredients = ingredients
    .map(toBackendIngredient)
    .filter((i): i is ProcedureIngredient => i !== null);
  const placeholderBody: Localised = {
    en: titleEn.trim() || titleEs.trim() || 'Recipe steps',
    es: titleEs.trim() || titleEn.trim() || 'Pasos de la receta',
  };
  const block: ProcedureBlock = {
    id: `r-${Date.now().toString(36)}`,
    kind: 'recipe',
    audience: '',
    factors,
    ingredients: backendIngredients,
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

  const [creationMode, setCreationMode] = useState<'manual' | 'import'>('manual');
  const [wizardStep, setWizardStep] = useState<WizardStepId>('details');
  const [procedureType, setProcedureType] = useState<ProcedureTypeId>('recipe');
  // Default to the first category (likely 'recipes' once the seed migration
  // has run). Fall back to empty string so the form can still render while
  // the categories API is in flight.
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
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

  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const isRecipeMode = procedureType === 'recipe';

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
    categoryId: categories[0]?.id ?? '',
    purposeEn: '',
    purposeEs: '',
    procedureType: 'recipe',
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
    // type buckets. Custom slugs leave the procedureType as-is.
    const picked = categories.find((c) => c.id === nextId);
    if (!picked) return;
    if (picked.slug === 'recipes' && procedureType !== 'recipe') {
      setProcedureType('recipe');
    } else if (picked.slug === 'station' && procedureType !== 'station') {
      setProcedureType('station');
    } else if (picked.slug === 'cleaning' && procedureType !== 'cleaning') {
      setProcedureType('cleaning');
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
      ? buildRecipeBody({ titleEn, titleEs, ingredients, factors: [selectedFactor] })
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
    'flex w-full rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)]/50 shadow-2xs transition-all duration-150 hover:border-[var(--color-line-3)] focus:outline-none focus-visible:outline-none focus:border-[var(--color-brand-600)]/70 focus-visible:border-[var(--color-brand-600)]/70 focus:ring-2 focus:ring-[var(--color-brand-tint)]/60 focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint)]/60';

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top action header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${locale}/admin/library`}
          className="inline-flex items-center gap-1 text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)] hover:text-[var(--color-brand-700)]"
        >
          <i aria-hidden="true" className="ri-arrow-left-line text-base" />
          {tNav('crumbBack')}
        </Link>
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/admin/library`}>
            <Button type="button" variant="ghost" size="sm">
              {tNav('cancel')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Page Title Header */}
      <header className="space-y-1">
        <p className="text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-brand-700)]">
          {tNav('pageEyebrow')}
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-2xl)] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
          {tTitles(procedureType as never)}
        </h1>
        <p className="max-w-3xl text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          {tTitles(`${procedureType}Subtitle` as never)}
        </p>
      </header>

      {/* Start Creation Choice Header */}
      <div className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-xs">
        <span className="text-[length:var(--text-sm)] font-bold text-[var(--color-ink)]">
          How would you like to start?
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCreationMode('manual')}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-1.5 text-[length:var(--text-xs)] font-bold transition-all',
              creationMode === 'manual'
                ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] border border-[var(--color-brand-600)] shadow-xs'
                : 'border border-[var(--color-line-3)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:bg-[var(--color-wash)]',
            )}
          >
            <span>✎</span> Create manually
          </button>
          <button
            type="button"
            onClick={() => setCreationMode('import')}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-1.5 text-[length:var(--text-xs)] font-bold transition-all',
              creationMode === 'import'
                ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] border border-[var(--color-brand-600)] shadow-xs'
                : 'border border-[var(--color-line-3)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:bg-[var(--color-wash)]',
            )}
          >
            <i aria-hidden="true" className="ri-sparkling-2-line text-[var(--color-brand-700)]" />
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
        onSelectStep={setWizardStep}
      />

      {/* Main 2-Column Grid */}
      <form className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_20rem] items-start pb-24" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-8 min-w-0">
          {error && (
            <div
              role="alert"
              className="rounded-[var(--radius-lg)] border border-[var(--color-bad-tint)] bg-[var(--color-bad-tint)] px-4 py-3 text-[length:var(--text-sm)] text-[var(--color-bad)]"
            >
              <p className="font-semibold">{error}</p>
              {errorDetails.length > 0 && (
                <ul className="mt-2 list-inside list-disc space-y-0.5 font-mono text-[length:var(--text-xs)]">
                  {errorDetails.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Section 1: Basic information / Details */}
          <Section
            id="proc-details"
            icon="ri-file-text-line"
            title={isRecipeMode ? 'Basic information' : tForm('detailsSectionTitle')}
            subtitle={isRecipeMode ? undefined : tForm('detailsSectionSubtitle')}
          >
            <div className="space-y-4">
              {/* Type Selection */}
              <ProcedureTypeSelector selected={procedureType} onChange={handleTypeChange} />

              {/* Category Selection */}
              <div className="space-y-1">
                <Label className="text-[length:var(--text-sm)] font-semibold text-[var(--color-ink)]">
                  {tForm('category')}
                  <span aria-hidden="true" className="ml-1 text-[var(--color-bad)]">*</span>
                </Label>
                <CustomSelect
                  value={categoryId}
                  onChange={handleCategoryChange}
                  options={categories.map((c) => ({
                    value: c.id,
                    label: locale === 'es' ? c.nameEs : c.nameEn,
                    icon: getCategoryIcon(c),
                  }))}
                />
              </div>

              {/* Title with Clean Language Tabs & Fixed Dynamic Character Counter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[length:var(--text-sm)] font-semibold text-[var(--color-ink)]">
                    {tForm('titleLabel')}
                    <span aria-hidden="true" className="ml-1 text-[var(--color-bad)]">*</span>
                  </Label>
                  <div className="inline-flex rounded-md border border-[var(--color-line-2)] bg-[var(--color-wash)]/60 p-0.5 text-[length:var(--text-xs)] font-semibold">
                    <button
                      type="button"
                      onClick={() => setTitleLang('en')}
                      className={cn(
                        'rounded-[5px] px-3 py-1 transition-colors',
                        titleLang === 'en'
                          ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] font-bold shadow-xs'
                          : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]',
                      )}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setTitleLang('es')}
                      className={cn(
                        'rounded-[5px] px-3 py-1 transition-colors',
                        titleLang === 'es'
                          ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] font-bold shadow-xs'
                          : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]',
                      )}
                    >
                      Español
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
                      }}
                      maxLength={100}
                      placeholder={isRecipeMode ? 'Grilled Chicken Breast' : tForm('titlePlaceholder')}
                      className="pr-16"
                      required
                    />
                  ) : (
                    <Input
                      value={titleEs}
                      onChange={(e) => {
                        setTitleEs(e.target.value);
                        setIsDirty(true);
                      }}
                      maxLength={100}
                      placeholder={tForm('titlePlaceholder')}
                      className="pr-16"
                      required
                    />
                  )}
                  <span className="pointer-events-none select-none absolute right-3 text-[length:var(--text-xs)] font-medium text-[var(--color-ink-3)]/70">
                    {titleLang === 'en' ? titleEn.length : titleEs.length} / 100
                  </span>
                </div>
              </div>

              {/* Purpose Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[length:var(--text-sm)] font-semibold text-[var(--color-ink)]">
                    {tForm('purposeLabel')}
                    <span aria-hidden="true" className="ml-1 text-[var(--color-bad)]">*</span>
                  </Label>
                  <div className="inline-flex rounded-md border border-[var(--color-line-2)] bg-[var(--color-wash)]/60 p-0.5 text-[length:var(--text-xs)] font-semibold">
                    <button
                      type="button"
                      onClick={() => setPurposeLang('en')}
                      className={cn(
                        'rounded-[5px] px-3 py-1 transition-colors',
                        purposeLang === 'en'
                          ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] font-bold shadow-xs'
                          : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]',
                      )}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setPurposeLang('es')}
                      className={cn(
                        'rounded-[5px] px-3 py-1 transition-colors',
                        purposeLang === 'es'
                          ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] font-bold shadow-xs'
                          : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]',
                      )}
                    >
                      Español
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
                      }}
                      maxLength={500}
                      rows={3}
                      placeholder={
                        isRecipeMode
                          ? 'This recipe teaches the correct preparation and cooking method for grilled chicken breast.'
                          : tForm('purposePlaceholder')
                      }
                      className={cn(textareaCls, 'pb-7')}
                    />
                  ) : (
                    <textarea
                      value={purposeEs}
                      onChange={(e) => {
                        setPurposeEs(e.target.value);
                        setIsDirty(true);
                      }}
                      maxLength={500}
                      rows={3}
                      placeholder={tForm('purposePlaceholder')}
                      className={cn(textareaCls, 'pb-7')}
                    />
                  )}
                  <span className="pointer-events-none select-none absolute right-3 bottom-2.5 text-[length:var(--text-xs)] font-medium text-[var(--color-ink-3)]/70">
                    {purposeLang === 'en' ? purposeEn.length : purposeEs.length} / 500
                  </span>
                </div>
              </div>
            </div>
          </Section>

          {/* Section 2: Ingredients (Recipe mode only) */}
          {isRecipeMode && (
            <RecipeIngredientsEditor
              ingredients={ingredients}
              onChange={(next) => {
                setIngredients(next);
                setIsDirty(true);
              }}
              selectedFactor={selectedFactor}
              onSelectFactor={setSelectedFactor}
            />
          )}

          {/* Section 3: Method / Content */}
          <Section
            id="proc-content"
            icon="ri-list-check-2"
            title={isRecipeMode ? tRecipe('methodTitle') : tForm('contentSectionTitle')}
            subtitle={isRecipeMode ? tRecipe('methodSubtitle') : tForm('contentSectionSubtitle')}
          >
            <ProcedureBlockList blocks={blocks} onChange={setBlocks} />
          </Section>

          {/* Section 4: Access & Clearance Level Section */}
          <Section
            id="proc-access"
            icon="ri-shield-user-line"
            title={tAccess('title')}
            subtitle={tAccess('subtitle')}
          >
            <div className="space-y-3">
              <Label className="text-[length:var(--text-sm)] font-semibold text-[var(--color-ink)]">
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
                          ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-tint)]/40 shadow-xs ring-2 ring-[var(--color-brand-600)]/30'
                          : 'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)]',
                      )}
                    >
                      <div className="flex items-center gap-2 font-bold text-[length:var(--text-sm)] text-[var(--color-ink)]">
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
                      <p className="mt-1 pl-6 text-[length:var(--text-xs)] text-[var(--color-ink-2)]">
                        {tAccess(`${tier.key}Desc` as never)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </Section>
        </div>

        {/* Right Sidebar Column */}
        <div className="hidden lg:block">
          <div className="sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto space-y-6 pr-1.5 scrollbar-thin">
            <ProcedureProgressSidebar
              completedCount={completedCount}
              totalCount={sections.length}
              selectedType={procedureType}
              categoryLabel={categoryLabel}
              hasEn={Boolean(titleEn.trim())}
              hasEs={Boolean(titleEs.trim())}
              clearanceLabel={clearanceLabel}
              sections={sections}
            />

            {/* Live Recipe Preview Card in right sidebar */}
            {isRecipeMode && (
              <RecipeLivePreview
                title={activeTitle}
                purpose={activePurpose}
                categoryLabel={categoryLabel}
                ingredients={ingredients}
                selectedFactor={selectedFactor}
                blocks={blocks}
              />
            )}
          </div>
        </div>

        {/* Sticky Bottom Toolbar */}
        <div className="sticky-bar fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t border-[var(--color-line)] bg-[var(--color-surface)]/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-surface)]/80">
          <div className="flex items-center gap-2 text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-ink-2)]">
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
                <span className="text-[var(--color-brand-700)]">{tForm('unsavedLabel')}</span>
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
                className="text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)] underline-offset-4 hover:underline"
              >
                {tForm('discard')}
              </button>
            )}
            <Button type="button" variant="neutral" size="sm" className="gap-1.5" title={tForm('previewSoon')}>
              <i aria-hidden="true" className="ri-eye-line text-sm" />
              {tForm('preview')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isPending}
              onClick={() => void submit('draft')}
            >
              {tForm('saveDraft')}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isPending}
              onClick={() => void submit('published')}
            >
              {isPending ? tForm('publishing') : tForm('publish')}
            </Button>
          </div>
        </div>
      </form>
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
  icon?: string;
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section
      id={id}
      className="scroll-mt-6 space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-sm"
    >
      <header className="flex items-start justify-between gap-4 border-b border-[var(--color-line)]/60 pb-3">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] text-lg">
              <i aria-hidden="true" className={icon} />
            </div>
          )}
          <div>
            <h2 className="font-[family-name:var(--font-ui)] text-[length:var(--text-md)] font-bold tracking-[-0.01em] text-[var(--color-ink)]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
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
