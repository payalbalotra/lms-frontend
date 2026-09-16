'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomSelect } from '@/components/ui/custom-select';
import { RowActions } from '@/components/ui/row-actions';
import type {
  CriticalLimit,
  Localised,
  LocalisedOptional,
  ProcedureBlock,
  ProcedureBlockKind,
  ProcedureImageHint,
  ProcedureIngredient,
  ProcedureMethodStep,
  ProcedureNoteKind,
  ProcedureYieldItem,
} from '@/lib/types';
import { syncAmountsWithFactors } from '@/lib/procedure-blocks';
import { ALLERGEN_KEYS, type AllergenKey } from '@/lib/allergens';
import { requestImageUpload, requestVideoUpload, uploadToR2, deleteUpload } from '@/lib/api';
import { classifyVideoUrl } from '@/lib/procedure-media';

// Must stay in sync with the backend whitelist at lms-backend/src/services/uploads.ts.
// SVG is intentionally omitted — it can carry inline JS.
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

interface EditorProps<T extends ProcedureBlock> {
  block: T;
  onChange: (next: T) => void;
}

function asLocalised(v: Localised | undefined, lang: 'en' | 'es'): string {
  return v?.[lang] ?? '';
}
function setLocalised(v: Localised | undefined, lang: 'en' | 'es', value: string): Localised {
  return { en: v?.en ?? '', es: v?.es ?? '', [lang]: value };
}
function asOpt(v: LocalisedOptional | undefined, lang: 'en' | 'es'): string {
  return v?.[lang] ?? '';
}
function setOpt(v: LocalisedOptional | undefined, lang: 'en' | 'es', value: string): LocalisedOptional {
  return { en: v?.en, es: v?.es, [lang]: value };
}

function BilingualTabs({
  active,
  onChange,
  enLabel,
  esLabel,
}: {
  active: 'en' | 'es';
  onChange: (next: 'en' | 'es') => void;
  enLabel: string;
  esLabel: string;
}): React.ReactElement {
  return (
    <div className="inline-flex rounded-md border border-[var(--color-line-3)] bg-[var(--color-surface)] p-0.5 text-[length:var(--text-xs)] font-semibold">
      <button
        type="button"
        aria-checked={active === 'en'}
        role="tab"
        onClick={() => onChange('en')}
        className={cn(
          'rounded-[5px] px-3 py-1 transition-colors',
          active === 'en'
            ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] font-bold shadow-xs'
            : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]',
        )}
      >
        {enLabel}
      </button>
      <button
        type="button"
        aria-checked={active === 'es'}
        role="tab"
        onClick={() => onChange('es')}
        className={cn(
          'rounded-[5px] px-3 py-1 transition-colors',
          active === 'es'
            ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] font-bold shadow-xs'
            : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]',
        )}
      >
        {esLabel}
      </button>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="space-y-1">
      <Label className="text-[length:var(--text-sm)]">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-[var(--color-bad)]">
            *
          </span>
        )}
      </Label>
      {children}
      {hint && <p className="text-[length:var(--text-xs)] text-[var(--color-ink-2)]">{hint}</p>}
    </div>
  );
}

const textareaCls =
  'flex w-full rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)]/60 shadow-2xs transition-all duration-180 hover:border-[var(--color-line-3)] focus-visible:border-[var(--color-brand-600)] focus-visible:ring-3 focus-visible:ring-[var(--color-brand-tint-2)]/80 focus-visible:outline-none';

// ---------------------------------------------------------------------------
// Per-kind editors
// ---------------------------------------------------------------------------

function TextEditor({ block, onChange }: EditorProps<Extract<ProcedureBlock, { kind: 'text' }>>): React.ReactElement {
  const t = useTranslations('admin.library.new.form.composer');
  const [lang, setLang] = React.useState<'en' | 'es'>('en');
  return (
    <div className="space-y-3">
      <BilingualTabs active={lang} onChange={setLang} enLabel={t('tabs.en')} esLabel={t('tabs.es')} />
      <textarea
        value={asLocalised(block.body, lang)}
        onChange={(e) => onChange({ ...block, body: setLocalised(block.body, lang, e.target.value) })}
        rows={4}
        className={textareaCls}
      />
    </div>
  );
}

function HeadingEditor({
  block,
  onChange,
}: EditorProps<Extract<ProcedureBlock, { kind: 'heading' }>>): React.ReactElement {
  const t = useTranslations('admin.library.new.form.composer');
  const [lang, setLang] = React.useState<'en' | 'es'>('en');
  return (
    <div className="space-y-3">
      <Field label={t('headingLevel.label')}>
        <CustomSelect
          value={String(block.level)}
          onChange={(val) =>
            onChange({ ...block, level: Number(val) as 1 | 2 | 3 })
          }
          options={[
            { value: '1', label: t('headingLevel.1'), icon: 'ri-h-1' },
            { value: '2', label: t('headingLevel.2'), icon: 'ri-h-2' },
            { value: '3', label: t('headingLevel.3'), icon: 'ri-h-3' },
          ]}
        />
      </Field>
      <BilingualTabs active={lang} onChange={setLang} enLabel={t('tabs.en')} esLabel={t('tabs.es')} />
      <Input
        value={asLocalised(block.text, lang)}
        onChange={(e) => onChange({ ...block, text: setLocalised(block.text, lang, e.target.value) })}
      />
    </div>
  );
}

function emptyCriticalLimit(): CriticalLimit {
  return { value: '', howToCheck: '', breachLabel: '', breachResponse: '' };
}

const newMethodStep = (): ProcedureMethodStep => ({
  id: `s-${Math.random().toString(36).slice(2, 8)}`,
  body: { en: '', es: '' },
  critical: false,
});

// ---------------------------------------------------------------------------
// Sortable step row — used inside MethodEditor + RecipeEditor steps section.
// Wired into @dnd-kit's nested context (block-level drag lives further up).
// ---------------------------------------------------------------------------

function SortableStepRow({
  step,
  index,
  total,
  onChange,
  onRemove,
  onMove,
  onDuplicate,
}: {
  step: ProcedureMethodStep;
  index: number;
  total: number;
  onChange: (next: ProcedureMethodStep) => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onDuplicate: () => void;
}): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id ?? `step-${index}`,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && 'opacity-60')}
    >
      <StepRow
        step={step}
        index={index}
        total={total}
        onChange={onChange}
        onRemove={onRemove}
        onMove={onMove}
        onDuplicate={onDuplicate}
        dragHandle={
          <button
            type="button"
            aria-label="Drag to reorder step"
            className="inline-flex size-9 cursor-grab items-center justify-center rounded-md text-[var(--color-ink-3)] hover:bg-[var(--color-panel)] active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <i aria-hidden="true" className="ri-draggable" />
          </button>
        }
      />
    </div>
  );
}

function StepRow({
  step,
  index,
  total,
  onChange,
  onRemove,
  onMove,
  onDuplicate,
  dragHandle,
}: {
  step: ProcedureMethodStep;
  index: number;
  total: number;
  onChange: (next: ProcedureMethodStep) => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onDuplicate: () => void;
  dragHandle: React.ReactNode;
}): React.ReactElement {
  const t = useTranslations('admin.library.new.form');
  const tComp = useTranslations('admin.library.new.form.composer');
  const [lang, setLang] = React.useState<'en' | 'es'>('en');
  const [critOpen, setCritOpen] = React.useState(false);
  const [videoOpen, setVideoOpen] = React.useState(!!step.videoSegment);
  const limit = step.criticalLimit;
  const seg = step.videoSegment;

  function patchLimit(patch: Partial<CriticalLimit>): void {
    onChange({ ...step, criticalLimit: { ...(limit ?? emptyCriticalLimit()), ...patch } });
  }
  function patchSegment(patch: Partial<NonNullable<ProcedureMethodStep['videoSegment']>>): void {
    const base = seg ?? { src: '', startSec: 0, endSec: 0 };
    onChange({ ...step, videoSegment: { ...base, ...patch } });
  }

  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      {/* Header: drag handle · step number · kebab menu */}
      <div className="flex items-center gap-2">
        {dragHandle}
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-tint)] font-mono text-[length:var(--text-xs)] font-semibold text-[var(--color-brand-700)]">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-ink-3)]">
          Step
        </span>
        <div className="ml-auto">
          <RowActions
            triggerLabel="Step actions"
            items={[
              {
                label: t('stepActions.moveUp'),
                icon: 'ri-arrow-up-line',
                onSelect: () => onMove('up'),
              },
              {
                label: t('stepActions.moveDown'),
                icon: 'ri-arrow-down-line',
                onSelect: () => onMove('down'),
              },
              {
                label: t('stepActions.duplicate'),
                icon: 'ri-file-copy-line',
                onSelect: onDuplicate,
              },
              {
                label: t('stepActions.delete'),
                icon: 'ri-close-line',
                destructive: true,
                onSelect: onRemove,
              },
            ]}
          />
        </div>
      </div>

      {/* Instructions — bilingual */}
      <div className="space-y-2">
        <BilingualTabs active={lang} onChange={setLang} enLabel={tComp('tabs.en')} esLabel={tComp('tabs.es')} />
        <Field label={t('instructions')} required>
          <textarea
            value={asLocalised(step.body, lang)}
            onChange={(e) => onChange({ ...step, body: setLocalised(step.body, lang, e.target.value) })}
            rows={3}
            placeholder={t('instructionsPlaceholder')}
            className={textareaCls}
          />
        </Field>
      </div>

      {/* Critical control — value row inline, chevron to expand the rest */}
      <div>
        <label className="flex items-center gap-2 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          <input
            type="checkbox"
            checked={!!step.critical}
            onChange={(e) =>
              onChange({
                ...step,
                critical: e.target.checked,
                criticalLimit: e.target.checked ? limit ?? emptyCriticalLimit() : undefined,
              })
            }
          />
          {t('criticalControl')}
        </label>
        {step.critical && (
          <div className="mt-2 space-y-2 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-warn-tint)] p-3">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 text-left"
              onClick={() => setCritOpen((v) => !v)}
              aria-expanded={critOpen}
              aria-controls={`crit-${step.id ?? index}`}
            >
              <span className="text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-ink-2)]">
                <i aria-hidden="true" className="ri-focus-3-line mr-1" />
                {t('criticalLimit')}
              </span>
              <span className="font-mono text-[length:var(--text-md)] font-semibold text-[var(--color-ink)]">
                {limit?.value || (
                  <em className="not-italic text-[length:var(--text-sm)] font-normal text-[var(--color-ink-3)]">
                    {t('notSet')}
                  </em>
                )}
              </span>
              <i
                aria-hidden="true"
                className={`ri-arrow-${critOpen ? 'up' : 'down'}-s-line text-[length:var(--text-md)] text-[var(--color-ink-2)]`}
              />
            </button>
            {critOpen && (
              <div id={`crit-${step.id ?? index}`} className="space-y-2 pt-1">
                <Field label={t('limitValue')} required>
                  <Input
                    value={limit?.value ?? ''}
                    onChange={(e) => patchLimit({ value: e.target.value })}
                    placeholder="≥ 165°F"
                  />
                </Field>
                <Field label={t('limitDescription')} hint={t('limitDescriptionHint')}>
                  <Input
                    value={limit?.subtitle ?? ''}
                    onChange={(e) => patchLimit({ subtitle: e.target.value })}
                    placeholder={t('limitDescriptionPlaceholder')}
                  />
                </Field>
                <Field label={t('limitHowToCheck')} required>
                  <Input
                    value={limit?.howToCheck ?? ''}
                    onChange={(e) => patchLimit({ howToCheck: e.target.value })}
                    placeholder={t('limitHowToCheckPlaceholder')}
                  />
                </Field>
                <Field label={t('correctiveAction')} required>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      value={limit?.breachLabel ?? ''}
                      onChange={(e) => patchLimit({ breachLabel: e.target.value })}
                      placeholder={t('correctiveActionConditionPlaceholder')}
                    />
                    <Input
                      value={limit?.breachResponse ?? ''}
                      onChange={(e) => patchLimit({ breachResponse: e.target.value })}
                      placeholder={t('correctiveActionResponsePlaceholder')}
                    />
                  </div>
                </Field>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video segment — inline editor */}
      <div>
        {!videoOpen && !seg && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setVideoOpen(true)}
          >
            <i aria-hidden="true" className="ri-video-add-line mr-1" />
            {t('addVideo')}
          </Button>
        )}
        {(videoOpen || seg) && (
          <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-line-2)] p-3">
            <div className="flex items-center justify-between">
              <Label className="text-[length:var(--text-sm)]">{t('videoSegment')}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setVideoOpen(false);
                  onChange({ ...step, videoSegment: undefined });
                }}
              >
                <i aria-hidden="true" className="ri-close-line mr-1" />
                {t('removeVideo')}
              </Button>
            </div>
            <Field label={t('videoSrc')}>
              <Input
                type="url"
                value={seg?.src ?? ''}
                onChange={(e) => patchSegment({ src: e.target.value })}
                placeholder="https://…"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t('videoStart')}>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={seg?.startSec ?? 0}
                  onChange={(e) =>
                    patchSegment({ startSec: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                  }
                />
              </Field>
              <Field label={t('videoEnd')}>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={seg?.endSec ?? 0}
                  onChange={(e) =>
                    patchSegment({ endSec: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                  }
                />
              </Field>
            </div>
            {seg?.src && (
              <a
                href={seg.src}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[length:var(--text-sm)] font-medium text-[var(--color-brand-700)] underline-offset-4 hover:underline"
              >
                <i aria-hidden="true" className="ri-play-circle-line" />
                {t('previewClip')}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Steps list with nested @dnd-kit drag context.
// ---------------------------------------------------------------------------

function StepsList({
  steps,
  onChange,
}: {
  steps: ProcedureMethodStep[];
  onChange: (next: ProcedureMethodStep[]) => void;
}): React.ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent): void {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = steps.findIndex((s) => (s.id ?? `step-${steps.indexOf(s)}`) === active.id);
    const to = steps.findIndex((s) => (s.id ?? `step-${steps.indexOf(s)}`) === over.id);
    if (from === -1 || to === -1 || from === to) return;
    onChange(arrayMove(steps, from, to));
  }

  function moveStep(i: number, dir: 'up' | 'down'): void {
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= steps.length) return;
    onChange(arrayMove(steps, i, j));
  }
  function dupStep(i: number): void {
    const src = steps[i];
    if (!src) return;
    const clone: ProcedureMethodStep = {
      ...src,
      id: `s-${Math.random().toString(36).slice(2, 8)}`,
      body: { en: src.body.en, es: src.body.es },
      criticalLimit: src.criticalLimit ? { ...src.criticalLimit } : undefined,
      videoSegment: src.videoSegment ? { ...src.videoSegment } : undefined,
    };
    onChange([...steps.slice(0, i + 1), clone, ...steps.slice(i + 1)]);
  }
  function removeStep(i: number): void {
    if (steps.length <= 1) return;
    onChange(steps.filter((_, j) => j !== i));
  }
  function patchStep(i: number, next: ProcedureMethodStep): void {
    onChange(steps.map((s, j) => (j === i ? next : s)));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={steps.map((s, i) => s.id ?? `step-${i}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {steps.map((s, i) => (
            <SortableStepRow
              key={s.id ?? `step-${i}`}
              step={s}
              index={i}
              total={steps.length}
              onChange={(next) => patchStep(i, next)}
              onRemove={() => removeStep(i)}
              onMove={(dir) => moveStep(i, dir)}
              onDuplicate={() => dupStep(i)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// ---------------------------------------------------------------------------
// Method + Recipe editors
// ---------------------------------------------------------------------------

function MethodEditor({
  block,
  onChange,
}: EditorProps<Extract<ProcedureBlock, { kind: 'method' }>>): React.ReactElement {
  const t = useTranslations('admin.library.new.form');
  return (
    <div className="space-y-3">
      <StepsList steps={block.steps} onChange={(steps) => onChange({ ...block, steps })} />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange({ ...block, steps: [...block.steps, newMethodStep()] })}
      >
        + {t('addStep')}
      </Button>
    </div>
  );
}

const UNITS = ['g', 'kg', 'ml', 'l', 'oz', 'lb', 'cup', 'tbsp', 'tsp', 'pcs', 'each'] as const;

function emptyIngredient(factorCount: number): ProcedureIngredient {
  return {
    name: '',
    form: '',
    allergen: false,
    amounts: Array.from({ length: factorCount }, () => ''),
  };
}

function RecipeEditor({
  block,
  onChange,
}: EditorProps<Extract<ProcedureBlock, { kind: 'recipe' }>>): React.ReactElement {
  const tForm = useTranslations('admin.library.new.form');
  const tComp = useTranslations('admin.library.new.form.composer');
  const [lang, setLang] = React.useState<'en' | 'es'>('en');
  const factors = block.factors ?? [];
  const yields = block.yieldItems ?? [];
  const ingredients = block.ingredients ?? [];

  return (
    <div className="space-y-5">
      <Field label={tForm('audience')}>
        <textarea
          value={block.audience ?? ''}
          onChange={(e) => onChange({ ...block, audience: e.target.value })}
          rows={2}
          placeholder={tForm('audiencePlaceholder')}
          className={textareaCls}
        />
      </Field>

      <div className="space-y-3">
        <Label className="text-[length:var(--text-sm)]">{tForm('allergenTitle')}</Label>

        <fieldset className="space-y-2">
          <legend className="text-[length:var(--text-xs)] uppercase tracking-wide text-[var(--color-ink-3)]">
            {tForm('allergenPickerLabel')}
          </legend>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {ALLERGEN_KEYS.map((key) => {
              const checked = block.allergen?.selectedAllergens?.includes(key) ?? false;
              const ensureAllergen = (mutate: (a: { summary: string; detail: string; selectedAllergens?: string[] }) => void) => {
                const current = block.allergen ?? { summary: '', detail: '' };
                const draft = {
                  summary: current.summary,
                  detail: current.detail,
                  selectedAllergens: current.selectedAllergens ? [...current.selectedAllergens] : [],
                };
                mutate(draft);
                onChange({ ...block, allergen: draft });
              };
              return (
                <label
                  key={key}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-[length:var(--text-sm)] transition-colors',
                    checked
                      ? 'border-[var(--color-warn)] bg-[var(--color-warn-tint)] text-[var(--color-ink)]'
                      : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:bg-[var(--color-tint)]',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      ensureAllergen((a) => {
                        const set = new Set(a.selectedAllergens ?? []);
                        if (e.target.checked) set.add(key);
                        else set.delete(key);
                        a.selectedAllergens = set.size > 0 ? Array.from(set) : undefined;
                      })
                    }
                  />
                  {tForm(`allergens.${key}` as `allergens.${AllergenKey}`)}
                </label>
              );
            })}
          </div>
        </fieldset>

        <Field label={tForm('allergenSummary')}>
          <Input
            value={block.allergen?.summary ?? ''}
            onChange={(e) =>
              onChange({
                ...block,
                allergen: {
                  summary: e.target.value,
                  detail: block.allergen?.detail ?? '',
                  selectedAllergens: block.allergen?.selectedAllergens,
                },
              })
            }
            placeholder={tForm('allergenSummaryPlaceholder')}
          />
        </Field>
        <Field label={tForm('allergenDetail')}>
          <textarea
            value={block.allergen?.detail ?? ''}
            onChange={(e) =>
              onChange({
                ...block,
                allergen: {
                  summary: block.allergen?.summary ?? '',
                  detail: e.target.value,
                  selectedAllergens: block.allergen?.selectedAllergens,
                },
              })
            }
            rows={2}
            placeholder={tForm('allergenDetailPlaceholder')}
            className={textareaCls}
          />
        </Field>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-[length:var(--text-sm)]">{tForm('yieldTitle')}</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                ...block,
                yieldItems: [...yields, { label: '', value: '', unit: '' }],
              })
            }
          >
            + {tForm('add')}
          </Button>
        </div>
        <BilingualTabs active={lang} onChange={setLang} enLabel={tComp('tabs.en')} esLabel={tComp('tabs.es')} />
        {yields.map((y, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1.5fr_1fr_0.75fr_auto]">
            <Input
              value={y.label}
              onChange={(e) =>
                onChange({
                  ...block,
                  yieldItems: yields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                })
              }
              placeholder={tForm('yieldLabel')}
            />
            <Input
              value={y.value}
              onChange={(e) =>
                onChange({
                  ...block,
                  yieldItems: yields.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)),
                })
              }
              placeholder={tForm('yieldValue')}
            />
            <Input
              value={y.unit ?? ''}
              onChange={(e) =>
                onChange({
                  ...block,
                  yieldItems: yields.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)),
                })
              }
              placeholder={tForm('yieldUnit')}
            />
            {yields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={tForm('remove')}
                onClick={() =>
                  onChange({ ...block, yieldItems: yields.filter((_, j) => j !== i) })
                }
              >
                <i aria-hidden="true" className="ri-close-line" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label className="text-[length:var(--text-sm)]">{tForm('scalerTitle')}</Label>
        <div className="flex flex-wrap gap-2">
          {factors.map((f, i) => (
            <div key={i} className="flex items-center gap-1">
              <Input
                type="number"
                min={1}
                step={1}
                value={f}
                onChange={(e) => {
                  const next = Math.max(1, Math.floor(Number(e.target.value) || 1));
                  onChange({
                    ...block,
                    factors: factors.map((x, j) => (j === i ? next : x)),
                    ingredients: syncAmountsWithFactors(ingredients, factors.map((x, j) => (j === i ? next : x))),
                  });
                }}
                className="w-20"
              />
              <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">×</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={tForm('remove')}
                onClick={() => {
                  const nextFactors = factors.filter((_, j) => j !== i);
                  onChange({
                    ...block,
                    factors: nextFactors,
                    ingredients: syncAmountsWithFactors(ingredients, nextFactors),
                  });
                }}
              >
                <i aria-hidden="true" className="ri-close-line" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const nextVal = factors.length > 0 ? Math.max(factors[factors.length - 1] * 2, 1) : 1;
              const nextFactors = [...factors, nextVal];
              onChange({
                ...block,
                factors: nextFactors,
                ingredients: syncAmountsWithFactors(ingredients, nextFactors),
              });
            }}
          >
            + {tForm('addFactor')}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-[length:var(--text-sm)]">{tForm('ingredientsTitle')}</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                ...block,
                ingredients: [...ingredients, emptyIngredient(factors.length)],
              })
            }
          >
            + {tForm('addIngredient')}
          </Button>
        </div>
        {ingredients.length === 0 && (
          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">{tForm('none')}</p>
        )}
        {ingredients.map((row, i) => (
          <div key={i} className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <Field label={tForm('ingredientName')} required>
                <Input
                  value={row.name}
                  onChange={(e) =>
                    onChange({
                      ...block,
                      ingredients: ingredients.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                    })
                  }
                  placeholder={tForm('ingredientNamePlaceholder')}
                />
              </Field>
              <Field label={tForm('ingredientForm')}>
                <Input
                  value={row.form ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...block,
                      ingredients: ingredients.map((x, j) => (j === i ? { ...x, form: e.target.value } : x)),
                    })
                  }
                  placeholder={tForm('ingredientFormPlaceholder')}
                />
              </Field>
              <Field label={tForm('ingredientUnit')}>
                <CustomSelect
                  size="sm"
                  value={row.unit ?? ''}
                  onChange={(val) =>
                    onChange({
                      ...block,
                      ingredients: ingredients.map((x, j) => (j === i ? { ...x, unit: val } : x)),
                    })
                  }
                  options={UNITS.map((u) => ({ value: u, label: u }))}
                />
              </Field>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={tForm('remove')}
                  onClick={() =>
                    onChange({
                      ...block,
                      ingredients: ingredients.filter((_, j) => j !== i),
                    })
                  }
                >
                  <i aria-hidden="true" className="ri-close-line" />
                </Button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
              <input
                type="checkbox"
                checked={!!row.allergen}
                onChange={(e) =>
                  onChange({
                    ...block,
                    ingredients: ingredients.map((x, j) =>
                      j === i ? { ...x, allergen: e.target.checked || undefined } : x,
                    ),
                  })
                }
              />
              {tForm('ingredientAllergen')}
            </label>
            <div className="space-y-1">
              <Label className="text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-ink-3)]">
                {tForm('ingredientQuantity')}
              </Label>
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${factors.length || 1}, minmax(0,1fr))` }}
              >
                {factors.map((f, j) => (
                  <div key={j} className="space-y-1">
                    <Label className="font-mono text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                      {f}×
                    </Label>
                    <Input
                      type="text"
                      value={row.amounts[j] ?? ''}
                      onChange={(e) =>
                        onChange({
                          ...block,
                          ingredients: ingredients.map((x, k) =>
                            k === i
                              ? {
                                  ...x,
                                  amounts: x.amounts.map((a, l) => (l === j ? e.target.value : a)),
                                }
                              : x,
                          ),
                        })
                      }
                      placeholder={tForm('ingredientAmountPlaceholder')}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-[length:var(--text-sm)]">{tForm('stepsTitle')}</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({ ...block, steps: [...block.steps, newMethodStep()] })
            }
          >
            + {tForm('addStep')}
          </Button>
        </div>
        <StepsList steps={block.steps} onChange={(steps) => onChange({ ...block, steps })} />
      </div>
    </div>
  );
}

function ImageEditor({
  block,
  onChange,
}: EditorProps<Extract<ProcedureBlock, { kind: 'image' }>>): React.ReactElement {
  const t = useTranslations('admin.library.new.form.composer');
  const [lang, setLang] = React.useState<'en' | 'es'>('en');
  const [sourceMode, setSourceMode] = React.useState<'upload' | 'url'>('upload');
  const [upload, setUpload] = React.useState<{
    state: 'idle' | 'uploading' | 'failed';
    fileName?: string;
    error?: string;
  }>({ state: 'idle' });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const startUpload = async (file: File): Promise<void> => {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setUpload({ state: 'failed', fileName: file.name, error: t('image.uploadUnsupported') });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUpload({ state: 'failed', fileName: file.name, error: t('image.uploadTooBig') });
      return;
    }

    setUpload({ state: 'uploading', fileName: file.name });
    try {
      const presigned = await requestImageUpload({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });
      await uploadToR2(presigned.uploadUrl, file, file.type);
      // Backfill alt from the filename so the block survives buildGenericBody's
      // isBlockEmpty filter (image blocks with empty alt + caption are dropped
      // before save). Only fills the empty side — anything the user already
      // typed stays.
      const filenameNoExt = file.name.replace(/\.[^.]+$/, '');
      const currentEn = block.alt?.en?.trim() ?? '';
      const currentEs = block.alt?.es?.trim() ?? '';
      onChange({
        ...block,
        src: presigned.publicUrl,
        alt: {
          en: currentEn || filenameNoExt,
          es: currentEs || filenameNoExt,
        },
      });
      setUpload({ state: 'idle' });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('image.uploadFailed');
      setUpload({ state: 'failed', fileName: file.name, error: message });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    void startUpload(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    void startUpload(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-[length:var(--text-sm)] font-semibold text-[var(--color-ink)]">
          Procedure Image <span aria-hidden="true" className="text-[var(--color-bad)]">*</span>
        </Label>
        <div className="inline-flex rounded-md border border-[var(--color-line-3)] bg-[var(--color-surface)] p-0.5 text-[length:var(--text-xs)] font-semibold">
          <button
            type="button"
            onClick={() => setSourceMode('upload')}
            className={cn(
              'rounded-[5px] px-3 py-1 transition-colors flex items-center gap-1.5',
              sourceMode === 'upload'
                ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] font-bold shadow-xs'
                : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]',
            )}
          >
            <i aria-hidden="true" className="ri-upload-cloud-2-line" />
            {t('image.uploadMode')}
          </button>
          <button
            type="button"
            onClick={() => setSourceMode('url')}
            className={cn(
              'rounded-[5px] px-3 py-1 transition-colors flex items-center gap-1.5',
              sourceMode === 'url'
                ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] font-bold shadow-xs'
                : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]',
            )}
          >
            <i aria-hidden="true" className="ri-link" />
            {t('image.urlMode')}
          </button>
        </div>
      </div>

      {block.src ? (
        <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line-2)]/60 pb-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-tint)] px-3 py-1 text-[length:var(--text-xs)] font-bold uppercase tracking-wider text-[var(--color-brand-700)]">
              <i aria-hidden="true" className="ri-image-fill" />
              <span>{t('image.uploadDone')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5 text-xs font-semibold text-[var(--color-ink-2)]"
              >
                <i aria-hidden="true" className="ri-upload-2-line text-sm" />
                {t('image.uploadChange')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Best-effort: try to delete the underlying R2 object so the
                  // bucket doesn't accumulate orphans. Backend returns 404 for
                  // non-R2 URLs (e.g. a CDN link the user pasted) — swallowed.
                  // Lifecycle rules in the bucket catch anything this misses.
                  if (block.src) {
                    void deleteUpload({ url: block.src }).catch((err: unknown) => {
                      console.warn('[uploads] failed to delete orphaned R2 object', err);
                    });
                  }
                  onChange({ ...block, src: '' });
                }}
                className="gap-1.5 text-xs font-semibold text-[var(--color-bad)] hover:bg-[var(--color-bad-tint)]"
              >
                <i aria-hidden="true" className="ri-delete-bin-line text-sm" />
                {t('image.uploadRemove')}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)]/40 p-3 max-h-80">
            <img
              src={block.src}
              alt={t('image.previewAlt')}
              className="max-h-72 w-auto rounded object-contain shadow-xs"
            />
          </div>
        </div>
      ) : upload.state === 'uploading' ? (
        <div className="upload">
          <span className="pill-progress">
            <span className="spinner" aria-hidden="true" />
            {t('image.uploading')}
            {upload.fileName ? ` — ${upload.fileName}` : ''}
          </span>
        </div>
      ) : upload.state === 'failed' ? (
        <div className="upload">
          <span className="pill-progress" role="alert" style={{ color: 'var(--color-bad)' }}>
            <i aria-hidden="true" className="ri-error-warning-line" />
            {upload.error}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1 text-xs"
          >
            <i aria-hidden="true" className="ri-refresh-line" />
            {t('image.uploadChange')}
          </Button>
        </div>
      ) : sourceMode === 'upload' ? (
        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className="dropzone"
        >
          <i aria-hidden="true" className="ri-image-add-line" />
          <p>{t('image.uploadClick')}</p>
          <span>{t('image.uploadHint')}</span>
        </div>
      ) : (
        <Field label={t('imageSrc')}>
          <Input
            type="url"
            value={block.src}
            onChange={(e) => onChange({ ...block, src: e.target.value })}
            placeholder="https://images.unsplash.com/photo-..."
          />
        </Field>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      <Field label={t('imageHint.label')}>
        <CustomSelect
          value={block.hint || 'photo'}
          onChange={(v) => onChange({ ...block, hint: v as ProcedureImageHint })}
          options={[
            { value: 'photo', label: t('imageHint.photo'), icon: 'ri-camera-line' },
            { value: 'diagram', label: t('imageHint.diagram'), icon: 'ri-flow-chart' },
          ]}
        />
      </Field>

      <BilingualTabs active={lang} onChange={setLang} enLabel={t('tabs.en')} esLabel={t('tabs.es')} />
      <Field label={t('imageAlt')} required>
        <Input
          value={asLocalised(block.alt, lang)}
          onChange={(e) => onChange({ ...block, alt: setLocalised(block.alt, lang, e.target.value) })}
          placeholder="e.g. Freshly cooked grilled chicken breast on cutting board"
        />
      </Field>
      <Field label={t('imageCaption')}>
        <Input
          value={asOpt(block.caption, lang)}
          onChange={(e) =>
            onChange({
              ...block,
              caption: setOpt(block.caption, lang, e.target.value),
            })
          }
          placeholder="e.g. Ensure internal temperature reaches 165°F before serving"
        />
      </Field>
    </div>
  );
}

function VideoEditor({
  block,
  onChange,
}: EditorProps<Extract<ProcedureBlock, { kind: 'video' }>>): React.ReactElement {
  const t = useTranslations('admin.library.new.form.composer');
  const [lang, setLang] = React.useState<'en' | 'es'>('en');
  const [sourceMode, setSourceMode] = React.useState<'upload' | 'url'>('upload');
  // What produced the *current* block.src: a successful R2 upload, or a URL
  // the user pasted. Drives the pill copy and the player so a pasted YouTube
  // link never claims to have been "uploaded" and never tries to play via
  // <video src=…> (which can't render a watch page).
  const [source, setSource] = React.useState<'upload' | 'url'>('upload');
  const [upload, setUpload] = React.useState<{
    state: 'idle' | 'uploading' | 'failed';
    fileName?: string;
    error?: string;
  }>({ state: 'idle' });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const videoClass = React.useMemo(() => classifyVideoUrl(block.src), [block.src]);

  const startUpload = async (file: File): Promise<void> => {
    if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
      setUpload({ state: 'failed', fileName: file.name, error: t('video.uploadUnsupported') });
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setUpload({ state: 'failed', fileName: file.name, error: t('video.uploadTooBig') });
      return;
    }

    setUpload({ state: 'uploading', fileName: file.name });
    try {
      const presigned = await requestVideoUpload({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });
      await uploadToR2(presigned.uploadUrl, file, file.type);
      setSource('upload');
      onChange({ ...block, src: presigned.publicUrl });
      setUpload({ state: 'idle' });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('video.uploadFailed');
      setUpload({ state: 'failed', fileName: file.name, error: message });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    void startUpload(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    void startUpload(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-[length:var(--text-sm)] font-semibold text-[var(--color-ink)]">
          Procedure Video <span aria-hidden="true" className="text-[var(--color-bad)]">*</span>
        </Label>
        <div className="inline-flex rounded-md border border-[var(--color-line-3)] bg-[var(--color-surface)] p-0.5 text-[length:var(--text-xs)] font-semibold">
          <button
            type="button"
            onClick={() => setSourceMode('upload')}
            className={cn(
              'rounded-[5px] px-3 py-1 transition-colors flex items-center gap-1.5',
              sourceMode === 'upload'
                ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] font-bold shadow-xs'
                : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]',
            )}
          >
            <i aria-hidden="true" className="ri-upload-cloud-2-line" />
            {t('video.uploadMode')}
          </button>
          <button
            type="button"
            onClick={() => setSourceMode('url')}
            className={cn(
              'rounded-[5px] px-3 py-1 transition-colors flex items-center gap-1.5',
              sourceMode === 'url'
                ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] font-bold shadow-xs'
                : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]',
            )}
          >
            <i aria-hidden="true" className="ri-link" />
            {t('video.urlMode')}
          </button>
        </div>
      </div>

      {block.src ? (
        <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line-2)]/60 pb-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-tint)] px-3 py-1 text-[length:var(--text-xs)] font-bold uppercase tracking-wider text-[var(--color-brand-700)]">
              <i
                aria-hidden="true"
                className={source === 'upload' ? 'ri-video-fill' : 'ri-link'}
              />
              <span>{source === 'upload' ? t('video.uploadDone') : t('video.uploadLinked')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5 text-xs font-semibold text-[var(--color-ink-2)]"
              >
                <i aria-hidden="true" className="ri-upload-2-line text-sm" />
                {t('video.uploadChange')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Same shape as the image Remove handler: best-effort delete
                  // of the underlying R2 object. Source-state gating means a
                  // pasted YouTube/Vimeo link never triggers an API call —
                  // there's no R2 object to delete.
                  if (source === 'upload' && block.src) {
                    void deleteUpload({ url: block.src }).catch((err: unknown) => {
                      console.warn('[uploads] failed to delete orphaned R2 object', err);
                    });
                  }
                  onChange({ ...block, src: '' });
                }}
                className="gap-1.5 text-xs font-semibold text-[var(--color-bad)] hover:bg-[var(--color-bad-tint)]"
              >
                <i aria-hidden="true" className="ri-delete-bin-line text-sm" />
                {t('video.uploadRemove')}
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-black">
            {videoClass.provider === 'file' ? (
              <video
                controls
                src={block.src}
                className="max-h-80 w-full object-contain"
              />
            ) : videoClass.embedUrl ? (
              <iframe
                src={videoClass.embedUrl}
                title={source === 'upload' ? t('video.uploadDone') : t('video.uploadLinked')}
                className="aspect-video w-full"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="no-referrer"
              />
            ) : null}
          </div>
        </div>
      ) : upload.state === 'uploading' ? (
        <div className="upload">
          <span className="pill-progress">
            <span className="spinner" aria-hidden="true" />
            {t('video.uploading')}
            {upload.fileName ? ` — ${upload.fileName}` : ''}
          </span>
        </div>
      ) : upload.state === 'failed' ? (
        <div className="upload">
          <span className="pill-progress" role="alert" style={{ color: 'var(--color-bad)' }}>
            <i aria-hidden="true" className="ri-error-warning-line" />
            {upload.error}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1 text-xs"
          >
            <i aria-hidden="true" className="ri-refresh-line" />
            {t('video.uploadChange')}
          </Button>
        </div>
      ) : sourceMode === 'upload' ? (
        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className="dropzone"
        >
          <i aria-hidden="true" className="ri-video-add-line" />
          <p>{t('video.uploadClick')}</p>
          <span>{t('video.uploadHint')}</span>
        </div>
      ) : (
        <Field label={t('videoSrc')}>
          <Input
            type="url"
            value={block.src}
            onChange={(e) => {
              setSource('url');
              onChange({ ...block, src: e.target.value });
            }}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </Field>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={handleFileChange}
        className="hidden"
      />

      <BilingualTabs active={lang} onChange={setLang} enLabel={t('tabs.en')} esLabel={t('tabs.es')} />
      <Field label={t('videoCaption')}>
        <Input
          value={asOpt(block.caption, lang)}
          onChange={(e) =>
            onChange({
              ...block,
              caption: setOpt(block.caption, lang, e.target.value),
            })
          }
          placeholder="e.g. Demonstration of sanitizing prep table step-by-step"
        />
      </Field>
    </div>
  );
}

function WarningEditor({
  block,
  onChange,
}: EditorProps<Extract<ProcedureBlock, { kind: 'warning' }>>): React.ReactElement {
  const t = useTranslations('admin.library.new.form.composer');
  const [lang, setLang] = React.useState<'en' | 'es'>('en');
  return (
    <div className="space-y-3">
      <Field label={t('warningSeverity.label')}>
        <CustomSelect
          value={block.severity}
          onChange={(val) => onChange({ ...block, severity: val as ProcedureNoteKind })}
          options={[
            { value: 'warn', label: t('warningSeverity.warn'), icon: 'ri-error-warning-line' },
            { value: 'tip', label: t('warningSeverity.tip'), icon: 'ri-lightbulb-line' },
            { value: 'alt', label: t('warningSeverity.alt'), icon: 'ri-loop-left-line' },
            { value: 'equip', label: t('warningSeverity.equip'), icon: 'ri-tools-line' },
            { value: 'allergen', label: t('warningSeverity.allergen'), icon: 'ri-alert-line' },
          ]}
        />
      </Field>
      <BilingualTabs active={lang} onChange={setLang} enLabel={t('tabs.en')} esLabel={t('tabs.es')} />
      <textarea
        value={asLocalised(block.body, lang)}
        onChange={(e) => onChange({ ...block, body: setLocalised(block.body, lang, e.target.value) })}
        rows={3}
        className={textareaCls}
      />
    </div>
  );
}

function AttachmentEditor({
  block,
  onChange,
}: EditorProps<Extract<ProcedureBlock, { kind: 'attachment' }>>): React.ReactElement {
  const t = useTranslations('admin.library.new.form.composer');
  const [lang, setLang] = React.useState<'en' | 'es'>('en');
  return (
    <div className="space-y-3">
      <Field label={t('attachmentHref')} required>
        <Input
          value={block.href}
          onChange={(e) => onChange({ ...block, href: e.target.value })}
        />
      </Field>
      <BilingualTabs active={lang} onChange={setLang} enLabel={t('tabs.en')} esLabel={t('tabs.es')} />
      <Field label={t('attachmentTitle')} required>
        <Input
          value={asLocalised(block.title, lang)}
          onChange={(e) => onChange({ ...block, title: setLocalised(block.title, lang, e.target.value) })}
        />
      </Field>
      <Field label={t('attachmentMeta')}>
        <Input
          value={block.meta ?? ''}
          onChange={(e) => onChange({ ...block, meta: e.target.value })}
        />
      </Field>
    </div>
  );
}

function TableEditor({
  block,
  onChange,
}: EditorProps<Extract<ProcedureBlock, { kind: 'table' }>>): React.ReactElement {
  const t = useTranslations('admin.library.new.form.composer');
  const [lang, setLang] = React.useState<'en' | 'es'>('en');
  const headerCount = block.headers.length;
  const rowCount = block.rows.length;

  function setHeader(j: number, value: string): void {
    onChange({
      ...block,
      headers: block.headers.map((h, k) => (k === j ? setLocalised(h, lang, value) : h)),
    });
  }
  function setCell(i: number, j: number, value: string): void {
    onChange({
      ...block,
      rows: block.rows.map((row, k) =>
        k === i ? row.map((cell, l) => (l === j ? setLocalised(cell, lang, value) : cell)) : row,
      ),
    });
  }
  function addColumn(): void {
    const empty: Localised = { en: '', es: '' };
    onChange({
      ...block,
      headers: [...block.headers, empty],
      rows: block.rows.map((row) => [...row, empty]),
    });
  }
  function removeColumn(j: number): void {
    if (headerCount <= 1) return;
    onChange({
      ...block,
      headers: block.headers.filter((_, k) => k !== j),
      rows: block.rows.map((row) => row.filter((_, k) => k !== j)),
    });
  }
  function addRow(): void {
    const emptyRow: Localised[] = Array.from({ length: headerCount }, () => ({ en: '', es: '' }));
    onChange({ ...block, rows: [...block.rows, emptyRow] });
  }
  function removeRow(i: number): void {
    if (rowCount <= 1) return;
    onChange({ ...block, rows: block.rows.filter((_, k) => k !== i) });
  }

  return (
    <div className="space-y-3">
      <BilingualTabs active={lang} onChange={setLang} enLabel={t('tabs.en')} esLabel={t('tabs.es')} />
      <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-line)] p-3">
        <Label className="text-[length:var(--text-sm)]">{t('tableHeaders')}</Label>
        <div className="grid grid-cols-1 gap-2" style={{ gridTemplateColumns: `repeat(${headerCount}, minmax(0,1fr)) auto` }}>
          {block.headers.map((h, j) => (
            <Input
              key={j}
              value={asLocalised(h, lang)}
              onChange={(e) => setHeader(j, e.target.value)}
            />
          ))}
          {headerCount > 1 && (
            <Button type="button" variant="ghost" size="sm" aria-label={t('table.removeColumn')} onClick={() => removeColumn(headerCount - 1)}>
              <i aria-hidden="true" className="ri-close-line" />
            </Button>
          )}
        </div>
        {headerCount < 6 && (
          <Button type="button" variant="ghost" size="sm" onClick={addColumn}>
            + {t('table.addColumn')}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-[length:var(--text-sm)]">{t('tableRows')}</Label>
        {block.rows.map((row, i) => (
          <div key={i} className="flex items-start gap-2">
            <div
              className="grid flex-1 gap-2"
              style={{ gridTemplateColumns: `repeat(${headerCount}, minmax(0,1fr))` }}
            >
              {row.map((cell, j) => (
                <Input
                  key={j}
                  value={asLocalised(cell, lang)}
                  onChange={(e) => setCell(i, j, e.target.value)}
                  placeholder={t('table.emptyCell')}
                />
              ))}
            </div>
            {rowCount > 1 && (
              <Button type="button" variant="ghost" size="sm" aria-label={t('table.removeRow')} onClick={() => removeRow(i)}>
                <i aria-hidden="true" className="ri-close-line" />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={addRow}>
          + {t('table.addRow')}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

const KIND_ICON: Record<ProcedureBlockKind, string> = {
  text: 'ri-text',
  heading: 'ri-h-1',
  method: 'ri-list-ordered',
  recipe: 'ri-restaurant-line',
  image: 'ri-image-line',
  video: 'ri-video-line',
  warning: 'ri-alert-line',
  attachment: 'ri-attachment-line',
  table: 'ri-table-line',
};

export function ProcedureBlockEditor({
  block,
  onChange,
}: {
  block: ProcedureBlock;
  onChange: (next: ProcedureBlock) => void;
}): React.ReactElement {
  const t = useTranslations('admin.library.new.form.composer');
  const kindLabel = t(`kind.${block.kind}` as never);

  let body: React.ReactElement;
  switch (block.kind) {
    case 'text':
      body = <TextEditor block={block} onChange={onChange} />;
      break;
    case 'heading':
      body = <HeadingEditor block={block} onChange={onChange} />;
      break;
    case 'method':
      body = <MethodEditor block={block} onChange={onChange} />;
      break;
    case 'recipe':
      body = <RecipeEditor block={block} onChange={onChange} />;
      break;
    case 'image':
      body = <ImageEditor block={block} onChange={onChange} />;
      break;
    case 'video':
      body = <VideoEditor block={block} onChange={onChange} />;
      break;
    case 'warning':
      body = <WarningEditor block={block} onChange={onChange} />;
      break;
    case 'attachment':
      body = <AttachmentEditor block={block} onChange={onChange} />;
      break;
    case 'table':
      body = <TableEditor block={block} onChange={onChange} />;
      break;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-ink-2)]">
        <i aria-hidden="true" className={KIND_ICON[block.kind]} />
        {kindLabel}
      </div>
      {body}
    </div>
  );
}

// Localised + LocalisedOptional helpers, kept at the bottom so the per-kind
// editors don't carry the type noise.
export type { Localised, LocalisedOptional, ProcedureBlock, ProcedureYieldItem };
