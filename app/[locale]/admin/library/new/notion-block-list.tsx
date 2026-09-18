'use client';

/**
 * Notion-style composer for procedure blocks.
 *
 * Replaces the previous "colored-card" look with a clean, content-first
 * surface: each block renders in its actual shape (table looks like a table,
 * steps look like a numbered list), hover reveals a left gutter with a drag
 * handle, an add-row button, and a per-block menu (delete / duplicate / move).
 *
 * Stays in its own file so the wizard can swap to this without touching any
 * existing composer code — the only required change in the wizard is one
 * import + a `<NotionBlockList />` render.
 */

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
import { Popover } from '@/components/ui/popover';
import {
  BLOCK_FACTORIES,
  duplicateBlock,
  nextStepId,
} from '@/lib/procedure-blocks';
import { requestImageUpload, requestVideoUpload, uploadToR2, deleteUpload } from '@/lib/api';
import { classifyVideoUrl } from '@/lib/procedure-media';
import { Icon } from '@/components/ui/icon';
import type {
  Localised,
  LocalisedOptional,
  ProcedureBlock,
  ProcedureBlockKind,
  ProcedureMethodStep,
  ProcedureNoteKind,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Localised helpers (kept local — this file is self-contained).
// ---------------------------------------------------------------------------

function asLoc(v: Localised | undefined, lang: 'en' | 'es'): string {
  return v?.[lang] ?? '';
}
function setLoc(v: Localised | undefined, lang: 'en' | 'es', value: string): Localised {
  return { en: v?.en ?? '', es: v?.es ?? '', [lang]: value };
}
function asOpt(v: LocalisedOptional | undefined, lang: 'en' | 'es'): string {
  return v?.[lang] ?? '';
}
function setOpt(v: LocalisedOptional | undefined, lang: 'en' | 'es', value: string): LocalisedOptional {
  return { en: v?.en, es: v?.es, [lang]: value };
}

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

const NOTE_KINDS: ProcedureNoteKind[] = ['warn', 'tip', 'alt', 'equip', 'allergen'];

interface NotionBlockListProps {
  blocks: ProcedureBlock[];
  onChange: (next: ProcedureBlock[]) => void;
}

// ---------------------------------------------------------------------------
// Block menu — delete / duplicate / move. The drag handle lives in the gutter.
// ---------------------------------------------------------------------------

interface BlockMenuProps {
  block: ProcedureBlock;
  index: number;
  total: number;
  onChange: (next: ProcedureBlock[]) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
}

function BlockMenu({ index, total, onDuplicate, onRemove, onMove }: BlockMenuProps): React.ReactElement {
  const t = useTranslations('admin.library.new.form');
  // Items that don't apply at the current boundary are filtered out entirely
  // (move-up at the first row, move-down at the last row). Hiding them is
  // honest about what the user can do and avoids a `disabled` prop on the
  // shared RowActionItem type.
  const items = [
    ...(index > 0
      ? [{ label: t('blockActions.moveUp'), icon: 'ri-arrow-up-line', onSelect: () => onMove('up') }]
      : []),
    ...(index < total - 1
      ? [{ label: t('blockActions.moveDown'), icon: 'ri-arrow-down-line', onSelect: () => onMove('down') }]
      : []),
    { label: t('blockActions.duplicate'), icon: 'ri-file-copy-line', onSelect: onDuplicate },
    {
      label: t('blockActions.delete'),
      icon: 'ri-close-line',
      destructive: true,
      confirmLabel: 'Delete block',
      onSelect: onRemove,
    },
  ];
  return (
    <RowActions
      triggerLabel="Block actions"
      items={items}
      className="rounded-full bg-[var(--color-surface)] border border-[var(--color-line-2)] shadow-e1"
    />
  );
}

// ---------------------------------------------------------------------------
// Block-row wrapper. Owns the hover gutter (drag + add-below + menu) and a
// subtle hover background. The body is the per-kind editor.
// ---------------------------------------------------------------------------

interface BlockRowProps {
  block: ProcedureBlock;
  index: number;
  total: number;
  onPatch: (next: ProcedureBlock) => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onDuplicate: () => void;
  onInsertAfter: (kind: ProcedureBlockKind) => void;
}

function BlockRow({
  block,
  index,
  total,
  onPatch,
  onRemove,
  onMove,
  onDuplicate,
  onInsertAfter,
}: BlockRowProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const [isHover, setIsHover] = React.useState(false);
  // Lang state lives here so the unified toolbar can own the EN|ES toggle
  const [lang, setLang] = React.useState<'en' | 'es'>('en');

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const showToolbar = isHover || isDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      className={cn(
        'group rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] py-2 pl-3 pr-3 transition-all duration-[var(--dur)]',
        'hover:border-[var(--color-brand-600)]',
        isHover && 'bg-[var(--color-wash)]',
        isDragging && 'opacity-60 z-dropdown',
      )}
    >
      {/* Unified hover toolbar: drag · EN|ES · options menu — hidden at rest */}
      <div
        className={cn(
          'mb-1 flex items-center gap-1 transition-opacity duration-150',
          showToolbar ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        {/* Drag handle */}
        <button
          type="button"
          aria-label="Drag to reorder"
          title="Drag to reorder"
          className="flex size-7 cursor-grab items-center justify-center rounded-md text-[var(--color-ink-3)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink-2)] active:cursor-grabbing transition-colors"
          {...attributes}
          {...listeners}
        >
          <Icon icon="ri-drag-move-2-line" className="text-base" />
        </button>

        {/* Language toggle */}
        <LangToggle lang={lang} onChange={setLang} />

        {/* Spacer pushes menu to the right */}
        <span className="flex-1" />

        {/* Block options menu */}
        <BlockMenu
          block={block}
          index={index}
          total={total}
          onChange={() => { /* actions route through their own callbacks */ }}
          onRemove={onRemove}
          onMove={onMove}
          onDuplicate={onDuplicate}
        />
      </div>

      {/* Block body — lang is controlled by the toolbar above */}
      <BlockBody block={block} onPatch={onPatch} lang={lang} onInsertAfter={onInsertAfter} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add-below button. Opens a small inline menu of block kinds — the same
// options the empty-state menu shows, but inline.
// ---------------------------------------------------------------------------

function InsertAfterButton({
  onInsert,
  ghost = false,
}: {
  onInsert: (kind: ProcedureBlockKind) => void;
  /** When true, renders as a low-profile ghost affordance rather than a full button. */
  ghost?: boolean;
}): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Insert block below"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex size-7 items-center justify-center rounded-md transition-all',
          ghost
            ? 'text-[var(--color-ink-3)] opacity-30 hover:opacity-100 hover:bg-[var(--color-wash)] hover:text-[var(--color-ink-2)]'
            : 'bg-[var(--color-surface)] text-[var(--color-ink-2)] ring-1 ring-[var(--color-line-2)] shadow-e1 hover:bg-[var(--color-brand-tint)] hover:text-[var(--color-brand-700)] hover:ring-[var(--color-brand-600)]',
        )}
      >
        <Icon icon="ri-add-line" className="text-lg" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} triggerRef={triggerRef} align="start" width={220}>
        <div className="p-1 space-y-0.5">
          {([
            { kind: 'text', label: 'Text', icon: 'ri-text' },
            { kind: 'heading', label: 'Heading', icon: 'ri-h-1' },
            { kind: 'method', label: 'Numbered steps', icon: 'ri-list-ordered' },
            { kind: 'table', label: 'Table', icon: 'ri-table-line' },
            { kind: 'warning', label: 'Callout', icon: 'ri-alert-line' },
            { kind: 'image', label: 'Photograph', icon: 'ri-image-line' },
            { kind: 'video', label: 'Video', icon: 'ri-video-line' },
            { kind: 'attachment', label: 'Attachment', icon: 'ri-attachment-line' },
          ] as { kind: ProcedureBlockKind; label: string; icon: string }[]).map((opt) => (
            <button
              key={opt.kind}
              type="button"
              onClick={() => {
                onInsert(opt.kind);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--color-ink)] hover:bg-[var(--color-wash)] hover:text-[var(--color-brand-700)] transition-colors"
            >
              <Icon icon={opt.icon} className="text-base text-[var(--color-ink-2)]" />
              <span className="font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </Popover>
    </>
  );
}

// ---------------------------------------------------------------------------
// Per-kind bodies. Each one renders the block in its actual shape — a table
// block shows a table, a steps block shows numbered rows, an image block
// shows a drop zone. No chrome, no badges, no per-block header.
// ---------------------------------------------------------------------------

type BodyProps<T extends ProcedureBlock> = {
  block: T;
  onPatch: (next: T) => void;
  lang: 'en' | 'es';
};

function BlockBody({
  block,
  onPatch,
  lang,
  onInsertAfter,
}: {
  block: ProcedureBlock;
  onPatch: (next: ProcedureBlock) => void;
  lang: 'en' | 'es';
  onInsertAfter?: (kind: ProcedureBlockKind) => void;
}): React.ReactElement {
  switch (block.kind) {
    case 'text':
      return <TextBody block={block} onPatch={onPatch} lang={lang} onInsertAfter={onInsertAfter} />;
    case 'heading':
      return <HeadingBody block={block} onPatch={onPatch} lang={lang} />;
    case 'method':
      return <MethodBody block={block} onPatch={onPatch} lang={lang} />;
    case 'recipe':
      return <RecipeSummaryBody block={block} onPatch={onPatch} lang={lang} />;
    case 'image':
      return <ImageBody block={block} onPatch={onPatch} lang={lang} />;
    case 'video':
      return <VideoBody block={block} onPatch={onPatch} lang={lang} />;
    case 'warning':
      return <WarningBody block={block} onPatch={onPatch} lang={lang} />;
    case 'attachment':
      return <AttachmentBody block={block} onPatch={onPatch} lang={lang} />;
    case 'table':
      return <TableBody block={block} onPatch={onPatch} lang={lang} />;
  }
}

// ---- Text ----

/** Block type options for the slash command picker — same list as InsertAfterButton. */
const SLASH_BLOCK_OPTIONS: { kind: ProcedureBlockKind; label: string; icon: string }[] = [
  { kind: 'text', label: 'Text', icon: 'ri-text' },
  { kind: 'heading', label: 'Heading', icon: 'ri-h-1' },
  { kind: 'method', label: 'Numbered steps', icon: 'ri-list-ordered' },
  { kind: 'table', label: 'Table', icon: 'ri-table-line' },
  { kind: 'warning', label: 'Callout', icon: 'ri-alert-line' },
  { kind: 'image', label: 'Photograph', icon: 'ri-image-line' },
  { kind: 'video', label: 'Video', icon: 'ri-video-line' },
  { kind: 'attachment', label: 'Attachment', icon: 'ri-attachment-line' },
];

function TextBody({
  block,
  onPatch,
  lang,
  onInsertAfter,
}: BodyProps<Extract<ProcedureBlock, { kind: 'text' }>> & {
  onInsertAfter?: (kind: ProcedureBlockKind) => void;
}): React.ReactElement {
  const [slashOpen, setSlashOpen] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const value = asLoc(block.body, lang);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    const v = e.target.value;
    if (v === '/' && value === '') {
      setSlashOpen(true);
      return;
    }
    onPatch({ ...block, body: setLoc(block.body, lang, v) });
  }

  function handleSlashSelect(kind: ProcedureBlockKind): void {
    setSlashOpen(false);
    onInsertAfter?.(kind);
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={lang === 'en' ? 'Type something… (or / for blocks)' : 'Escribe algo… (o / para bloques)'}
        rows={3}
        className={bodyTextareaCls}
      />
      {slashOpen && (
        <div
          className="absolute left-0 top-full z-dropdown mt-1 w-52 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-[var(--e-3)]"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="p-1 space-y-0.5">
            {SLASH_BLOCK_OPTIONS.map((opt) => (
              <button
                key={opt.kind}
                type="button"
                onClick={() => handleSlashSelect(opt.kind)}
                className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--color-ink)] hover:bg-[var(--color-wash)] hover:text-[var(--color-brand-700)] transition-colors"
              >
                <Icon icon={opt.icon} className="text-base text-[var(--color-ink-2)]" />
                <span className="font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-[var(--color-line)] px-3 py-1.5">
            <button
              type="button"
              onClick={() => setSlashOpen(false)}
              className="text-xs text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]"
            >
              Esc to dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Heading ----

function HeadingBody({
  block,
  onPatch,
  lang,
}: BodyProps<Extract<ProcedureBlock, { kind: 'heading' }>>): React.ReactElement {
  const value = asLoc(block.text, lang);
  return (
    <div className="flex items-center gap-2">
      {/* Heading level selector — always visible, compact */}
      <div className="w-16 shrink-0">
        <CustomSelect
          size="sm"
          value={String(block.level)}
          onChange={(v) => onPatch({ ...block, level: Number(v) as 1 | 2 | 3 })}
          options={[
            { value: '1', label: 'H1', icon: 'ri-h-1' },
            { value: '2', label: 'H2', icon: 'ri-h-2' },
            { value: '3', label: 'H3', icon: 'ri-h-3' },
          ]}
        />
      </div>
      <Input
        value={value}
        onChange={(e) => onPatch({ ...block, text: setLoc(block.text, lang, e.target.value) })}
        placeholder={lang === 'en' ? 'Section title' : 'Título de la sección'}
        className={cn(
          'border-transparent bg-transparent shadow-none flex-1',
          headingCls(block.level),
          'px-2',
          'focus:border-[var(--color-brand-600)] focus:bg-[var(--color-surface)] focus:ring-0',
        )}
      />
    </div>
  );
}

function headingCls(level: 1 | 2 | 3): string {
  if (level === 1) return 'font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight';
  if (level === 2) return 'font-[family-name:var(--font-display)] text-xl font-bold tracking-tight';
  return 'font-[family-name:var(--font-display)] text-lg font-bold tracking-tight';
}

// ---- Method (numbered steps) ----

function MethodBody({
  block,
  onPatch,
  lang,
}: BodyProps<Extract<ProcedureBlock, { kind: 'method' }>>): React.ReactElement {
  const update = (idx: number, next: ProcedureMethodStep): void => {
    onPatch({ ...block, steps: block.steps.map((s, i) => (i === idx ? next : s)) });
  };
  const remove = (idx: number): void => {
    onPatch({ ...block, steps: block.steps.filter((_, i) => i !== idx) });
  };
  const move = (idx: number, dir: 'up' | 'down'): void => {
    const j = dir === 'up' ? idx - 1 : idx + 1;
    if (j < 0 || j >= block.steps.length) return;
    const next = arrayMove(block.steps, idx, j);
    onPatch({ ...block, steps: next });
  };
  const add = (): void => {
    onPatch({ ...block, steps: [...block.steps, { id: nextStepId(), body: { en: '', es: '' } }] });
  };

  return (
    <div className="space-y-2">
      <ol className="space-y-2">
        {block.steps.map((step, i) => (
          <li key={step.id ?? i} className="flex gap-3">
            <span className="mt-2 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-tint)] font-mono text-xs font-semibold text-[var(--color-brand-700)]">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="flex-1 space-y-2">
              <textarea
                value={asLoc(step.body, lang)}
                onChange={(e) => update(i, { ...step, body: setLoc(step.body, lang, e.target.value) })}
                placeholder={
                  lang === 'en'
                    ? 'Describe this step in English…'
                    : 'Describe este paso en español…'
                }
                rows={2}
                className={bodyTextareaCls}
              />
              {step.critical && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-warn-tint)] px-2 py-0.5 text-sm font-bold uppercase text-[var(--color-warn-ink)]">
                  <Icon icon="ri-focus-3-line" />
                  Critical
                </span>
              )}
            </div>
            <StepRowMenu
              index={i}
              total={block.steps.length}
              onMove={(dir) => move(i, dir)}
              onRemove={() => remove(i)}
            />
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={add}
        className="ml-10 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-[var(--color-ink-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]"
      >
        <Icon icon="ri-add-line" />
        Add step
      </button>
    </div>
  );
}

function StepRowMenu({
  index,
  total,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  onMove: (dir: 'up' | 'down') => void;
  onRemove: () => void;
}): React.ReactElement {
  const items = [
    ...(index > 0
      ? [{ label: 'Move up', icon: 'ri-arrow-up-line', onSelect: () => onMove('up') }]
      : []),
    ...(index < total - 1
      ? [{ label: 'Move down', icon: 'ri-arrow-down-line', onSelect: () => onMove('down') }]
      : []),
    { label: 'Delete step', icon: 'ri-close-line', destructive: true, onSelect: onRemove },
  ];
  return <RowActions triggerLabel="Step actions" items={items} />;
}

// ---- Recipe — for now, summary card pointing to dedicated editor ----

function RecipeSummaryBody({ block, onPatch }: BodyProps<Extract<ProcedureBlock, { kind: 'recipe' }>>): React.ReactElement { // lang unused for recipe
  const ingredientsCount = block.ingredients?.length ?? 0;
  const stepsCount = block.steps?.length ?? 0;
  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] p-3">
        <Icon icon="ri-restaurant-line" className="text-2xl text-[var(--color-brand-700)]" />
        <div className="flex-1 text-sm">
          <div className="font-semibold text-[var(--color-ink)]">Recipe block</div>
          <div className="text-[var(--color-ink-2)]">
            {ingredientsCount} ingredient{ingredientsCount === 1 ? '' : 's'} · {stepsCount} step{stepsCount === 1 ? '' : 's'}
          </div>
        </div>
        <CustomSelect
          size="sm"
          value=""
          onChange={() => {
            /* future: jump to dedicated recipe editor */
          }}
          options={[{ value: '', label: 'Open', icon: 'ri-arrow-right-line' }]}
        />
      </div>
      <p className="text-xs italic text-[var(--color-ink-3)]">
        Detailed recipe fields (audience, allergens, yields, factors) are edited in the full Recipe editor. This card summarises what's been added.
      </p>
    </div>
  );
}

// ---- Image ----

function ImageBody({ block, onPatch, lang }: BodyProps<Extract<ProcedureBlock, { kind: 'image' }>>): React.ReactElement {
  const [upload, setUpload] = React.useState<{ state: 'idle' | 'uploading' | 'failed'; error?: string }>({ state: 'idle' });
  const fileRef = React.useRef<HTMLInputElement>(null);

  const startUpload = async (file: File): Promise<void> => {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setUpload({ state: 'failed', error: 'Unsupported image type' });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUpload({ state: 'failed', error: 'Image too large (max 10 MB)' });
      return;
    }
    setUpload({ state: 'uploading' });
    try {
      const presigned = await requestImageUpload({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });
      await uploadToR2(presigned.uploadUrl, file, file.type);
      const filenameNoExt = file.name.replace(/\.[^.]+$/, '');
      onPatch({
        ...block,
        src: presigned.publicUrl,
        alt: {
          en: block.alt?.en?.trim() || filenameNoExt,
          es: block.alt?.es?.trim() || filenameNoExt,
        },
      });
      setUpload({ state: 'idle' });
    } catch (err) {
      setUpload({ state: 'failed', error: err instanceof Error ? err.message : 'Upload failed' });
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    void startUpload(f);
  };

  return (
    <div className="space-y-3 pt-1">
      {block.src ? (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)]">
          <div className="flex items-center justify-between border-b border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-brand-700)]">
              <Icon icon="ri-image-fill" /> Image
            </span>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                <Icon icon="ri-upload-2-line" className="mr-1" /> Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (block.src) {
                    void deleteUpload({ url: block.src }).catch(() => {
                      /* ignore — non-R2 URLs return 404 */
                    });
                  }
                  onPatch({ ...block, src: '' });
                }}
                className="text-[var(--color-bad)] hover:bg-[var(--color-bad-tint)]"
              >
                <Icon icon="ri-delete-bin-line" className="mr-1" /> Remove
              </Button>
            </div>
          </div>
          <div className="flex max-h-list items-center justify-center p-3">
            <img src={block.src} alt={block.alt?.en ?? ''} className="max-h-list rounded object-contain" />
          </div>
        </div>
      ) : upload.state === 'uploading' ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] px-4 py-6 text-sm text-[var(--color-ink-2)]">
          <span className="spinner" aria-hidden="true" />
          Uploading…
        </div>
      ) : upload.state === 'failed' ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-bad-tint)] bg-[var(--color-bad-tint)] px-4 py-3 text-sm text-[var(--color-bad)]">
          <Icon icon="ri-error-warning-line" /> {upload.error}
          <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
            Try again
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) void startUpload(f);
          }}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-3)] bg-[var(--color-wash)] px-4 py-6 text-sm text-[var(--color-ink-2)] hover:border-[var(--color-brand-600)] hover:bg-[var(--color-brand-tint)]"
        >
          <Icon icon="ri-image-add-line" className="text-2xl text-[var(--color-ink-3)]" />
          <span className="font-medium">Drop image, or click to browse</span>
          <span className="text-xs text-[var(--color-ink-3)]">JPG · PNG · WebP · GIF · max 10 MB</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFile} className="hidden" />
      {/* Caption — uses parent lang from toolbar */}
      <textarea
        value={asOpt(block.caption, lang) ?? ''}
        onChange={(e) => onPatch({ ...block, caption: setOpt(block.caption, lang, e.target.value) })}
        placeholder={lang === 'en' ? 'Optional caption' : 'Pie de foto opcional'}
        rows={2}
        className={bodyTextareaCls}
      />
    </div>
  );
}

// ---- Video ----

function VideoBody({ block, onPatch, lang }: BodyProps<Extract<ProcedureBlock, { kind: 'video' }>>): React.ReactElement {
  const [upload, setUpload] = React.useState<{ state: 'idle' | 'uploading' | 'failed'; error?: string }>({ state: 'idle' });
  const fileRef = React.useRef<HTMLInputElement>(null);
  const videoClass = React.useMemo(() => classifyVideoUrl(block.src), [block.src]);

  const startUpload = async (file: File): Promise<void> => {
    if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
      setUpload({ state: 'failed', error: 'Unsupported video type' });
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setUpload({ state: 'failed', error: 'Video too large (max 100 MB)' });
      return;
    }
    setUpload({ state: 'uploading' });
    try {
      const presigned = await requestVideoUpload({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });
      await uploadToR2(presigned.uploadUrl, file, file.type);
      onPatch({ ...block, src: presigned.publicUrl });
      setUpload({ state: 'idle' });
    } catch (err) {
      setUpload({ state: 'failed', error: err instanceof Error ? err.message : 'Upload failed' });
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    void startUpload(f);
  };

  return (
    <div className="space-y-3 pt-1">
      {block.src ? (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)]">
          <div className="flex items-center justify-between border-b border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-brand-700)]">
              <Icon icon={videoClass.provider === 'file' ? 'ri-video-fill' : 'ri-link'} />
              Video
            </span>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                <Icon icon="ri-upload-2-line" className="mr-1" /> Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (videoClass.provider === 'file' && block.src) {
                    void deleteUpload({ url: block.src }).catch(() => {
                      /* ignore */
                    });
                  }
                  onPatch({ ...block, src: '' });
                }}
                className="text-[var(--color-bad)] hover:bg-[var(--color-bad-tint)]"
              >
                <Icon icon="ri-delete-bin-line" className="mr-1" /> Remove
              </Button>
            </div>
          </div>
          <div className="bg-[var(--color-ink)]">
            {videoClass.provider === 'file' ? (
              <video controls src={block.src} className="max-h-list w-full object-contain" />
            ) : videoClass.embedUrl ? (
              <iframe
                src={videoClass.embedUrl}
                title="Video preview"
                className="aspect-video w-full"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="no-referrer"
              />
            ) : null}
          </div>
        </div>
      ) : upload.state === 'uploading' ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] px-4 py-6 text-sm text-[var(--color-ink-2)]">
          <span className="spinner" aria-hidden="true" />
          Uploading…
        </div>
      ) : upload.state === 'failed' ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-bad-tint)] bg-[var(--color-bad-tint)] px-4 py-3 text-sm text-[var(--color-bad)]">
          <Icon icon="ri-error-warning-line" /> {upload.error}
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) void startUpload(f);
            }}
            className="flex w-full flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-3)] bg-[var(--color-wash)] px-4 py-5 text-sm text-[var(--color-ink-2)] hover:border-[var(--color-brand-600)] hover:bg-[var(--color-brand-tint)]"
          >
            <Icon icon="ri-video-add-line" className="text-2xl text-[var(--color-ink-3)]" />
            <span className="font-medium">Drop video, or click to upload</span>
            <span className="text-xs text-[var(--color-ink-3)]">MP4 · WebM · MOV · max 100 MB</span>
          </button>
          <Input
            type="url"
            value={block.src}
            onChange={(e) => onPatch({ ...block, src: e.target.value })}
            placeholder="…or paste a YouTube / Vimeo URL"
            className="text-sm"
          />
        </div>
      )}
      <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleFile} className="hidden" />
      <textarea
        value={asOpt(block.caption, lang) ?? ''}
        onChange={(e) => onPatch({ ...block, caption: setOpt(block.caption, lang, e.target.value) })}
        placeholder={lang === 'en' ? 'Optional caption' : 'Pie de foto opcional'}
        rows={2}
        className={bodyTextareaCls}
      />
    </div>
  );
}

// ---- Warning / callout ----

function WarningBody({
  block,
  onPatch,
  lang,
}: BodyProps<Extract<ProcedureBlock, { kind: 'warning' }>>): React.ReactElement {
  const sevTone: Record<ProcedureNoteKind, { bg: string; text: string; icon: string }> = {
    warn: { bg: 'border-[var(--color-bad-tint)] bg-[var(--color-bad-tint)]', text: 'text-[var(--color-bad)]', icon: 'ri-error-warning-line' },
    tip: { bg: 'border-[var(--color-ok-tint-2)] bg-[var(--color-ok-tint)]', text: 'text-[var(--color-ok)]', icon: 'ri-lightbulb-line' },
    alt: { bg: 'border-[var(--color-line-2)] bg-[var(--color-wash)]', text: 'text-[var(--color-ink-2)]', icon: 'ri-loop-left-line' },
    equip: { bg: 'border-[var(--color-line-2)] bg-[var(--color-wash)]', text: 'text-[var(--color-ink-2)]', icon: 'ri-tools-line' },
    allergen: { bg: 'border-[var(--color-warn)] bg-[var(--color-warn-tint)]', text: 'text-[var(--color-warn-ink)]', icon: 'ri-shield-cross-line' },
  };
  const tone = sevTone[block.severity];

  return (
    <div className={cn('rounded-[var(--radius-md)] border p-3', tone.bg)}>
      {/* Severity picker — compact, always accessible */}
      <div className="mb-2 flex items-center gap-2">
        <Icon icon={tone.icon} className={cn(tone.text, 'text-base shrink-0')} />
        <div className="w-28 shrink-0">
          <CustomSelect
            size="sm"
            value={block.severity}
            onChange={(v) => onPatch({ ...block, severity: v as ProcedureNoteKind })}
            options={NOTE_KINDS.map((k) => ({ value: k, label: k, icon: sevTone[k].icon }))}
          />
        </div>
      </div>
      <textarea
        value={asLoc(block.body, lang)}
        onChange={(e) => onPatch({ ...block, body: setLoc(block.body, lang, e.target.value) })}
        placeholder={lang === 'en' ? 'Write the note in English…' : 'Escribe la nota en español…'}
        rows={3}
        className={cn(bodyTextareaCls, 'bg-[var(--color-surface)]')}
      />
    </div>
  );
}

// ---- Attachment ----

function AttachmentBody({ block, onPatch, lang }: BodyProps<Extract<ProcedureBlock, { kind: 'attachment' }>>): React.ReactElement {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-2">
        <Icon icon="ri-attachment-line" className="text-lg text-[var(--color-brand-700)]" />
        <Input
          type="url"
          value={block.href}
          onChange={(e) => onPatch({ ...block, href: e.target.value })}
          placeholder="https://example.com/file.pdf"
          className="flex-1 border-none bg-transparent shadow-none focus:border-none"
        />
      </div>
      <Input
        value={asLoc(block.title, lang)}
        onChange={(e) => onPatch({ ...block, title: setLoc(block.title, lang, e.target.value) })}
        placeholder={lang === 'en' ? 'e.g. HACCP checklist' : 'e.g. Lista HACCP'}
        className="border-transparent bg-transparent shadow-none focus:border-[var(--color-brand-600)] focus:ring-0"
      />
    </div>
  );
}

// ---- Table — real table ----

function TableBody({
  block,
  onPatch,
  lang,
}: BodyProps<Extract<ProcedureBlock, { kind: 'table' }>>): React.ReactElement {
  const currentLabel = lang === 'en' ? 'EN' : 'ES';
  const otherLabel = lang === 'en' ? 'ES' : 'EN';
  function setHeader(j: number, lang: 'en' | 'es', value: string): void {
    onPatch({
      ...block,
      headers: block.headers.map((h, k) => (k === j ? setLoc(h, lang, value) : h)),
    });
  }
  function setCell(i: number, j: number, lang: 'en' | 'es', value: string): void {
    onPatch({
      ...block,
      rows: block.rows.map((row, k) =>
        k === i ? row.map((cell, l) => (l === j ? setLoc(cell, lang, value) : cell)) : row,
      ),
    });
  }
  function addColumn(): void {
    const empty: Localised = { en: '', es: '' };
    onPatch({
      ...block,
      headers: [...block.headers, empty],
      rows: block.rows.map((row) => [...row, empty]),
    });
  }
  function removeColumn(j: number): void {
    if (block.headers.length <= 1) return;
    onPatch({
      ...block,
      headers: block.headers.filter((_, k) => k !== j),
      rows: block.rows.map((row) => row.filter((_, k) => k !== j)),
    });
  }
  function addRow(): void {
    const emptyRow: Localised[] = Array.from({ length: block.headers.length }, () => ({ en: '', es: '' }));
    onPatch({ ...block, rows: [...block.rows, emptyRow] });
  }
  function removeRow(i: number): void {
    if (block.rows.length <= 1) return;
    onPatch({ ...block, rows: block.rows.filter((_, k) => k !== i) });
  }

  return (
    <div>
      {/* Table grid — hairline borders, no badge/label */}
      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--color-line)] bg-[var(--color-wash)]">
              {block.headers.map((_, j) => {
                const isFilledOther = otherLabel === 'ES'
                  ? Boolean(block.headers[j]?.es?.trim())
                  : Boolean(block.headers[j]?.en?.trim());
                return (
                  <th
                    key={j}
                    className="group relative min-w-field-xs border-r border-[var(--color-line)] p-1 text-left font-semibold text-[var(--color-ink)] last:border-r-0"
                  >
                    <div className="flex items-center gap-1 px-1">
                      <input
                        type="text"
                        value={asLoc(block.headers[j], lang)}
                        onChange={(e) => setHeader(j, lang, e.target.value)}
                        placeholder={`Header ${j + 1} (${currentLabel})`}
                        className="w-full rounded px-2 py-1 text-xs font-bold text-[var(--color-ink)] bg-transparent placeholder:text-[var(--color-ink-3)] border border-transparent hover:border-[var(--color-line-2)] focus:border-[var(--color-brand-600)] focus:bg-[var(--color-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-tint-2)] transition-colors"
                      />
                      {isFilledOther && (
                        <span
                          title={`${otherLabel} translation present`}
                          className="inline-flex size-4 shrink-0 items-center justify-center text-[var(--color-ok)]"
                        >
                          <Icon icon="ri-check-line" className="text-xs font-bold" />
                        </span>
                      )}
                      {block.headers.length > 1 && (
                        <button
                          type="button"
                          aria-label="Remove column"
                          title="Remove column"
                          onClick={() => removeColumn(j)}
                          className="flex size-5 shrink-0 items-center justify-center rounded text-[var(--color-ink-3)] opacity-0 group-hover:opacity-100 hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)] transition-all"
                        >
                          <Icon icon="ri-close-line" className="text-xs" />
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
              <th className="w-tap-admin border-b border-[var(--color-line)] bg-[var(--color-wash)] p-1 text-center">
                <button
                  type="button"
                  aria-label="Add column"
                  title="Add column"
                  onClick={addColumn}
                  className="mx-auto flex size-8 items-center justify-center rounded text-[var(--color-ink-2)] hover:bg-[var(--color-brand-tint)] hover:text-[var(--color-brand-700)] transition-colors"
                >
                  <Icon icon="ri-add-line" className="text-base font-bold" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-line)]">
            {block.rows.map((row, i) => (
              <tr key={i} className="group/row transition-colors hover:bg-[var(--color-wash)]">
                {row.map((_, j) => {
                  const isFilledOther = otherLabel === 'ES'
                    ? Boolean(row[j]?.es?.trim())
                    : Boolean(row[j]?.en?.trim());
                  return (
                    <td
                      key={j}
                      className="min-w-field-xs border-r border-[var(--color-line)] p-1 align-top last:border-r-0"
                    >
                      <div className="flex items-center gap-1 px-1">
                        <input
                          type="text"
                          value={asLoc(row[j], lang)}
                          onChange={(e) => setCell(i, j, lang, e.target.value)}
                          placeholder={`Cell (${currentLabel})`}
                          className="w-full rounded px-2 py-1 text-sm text-[var(--color-ink)] bg-transparent placeholder:text-[var(--color-ink-3)] border border-transparent hover:border-[var(--color-line-2)] focus:border-[var(--color-brand-600)] focus:bg-[var(--color-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-tint-2)] transition-colors"
                        />
                        {isFilledOther && (
                          <span
                            title={`${otherLabel} translation present`}
                            className="inline-flex size-4 shrink-0 items-center justify-center text-[var(--color-ok)]"
                          >
                            <Icon icon="ri-check-line" className="text-xs font-bold" />
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="w-tap-admin p-1 text-center align-middle">
                  {block.rows.length > 1 && (
                    <button
                      type="button"
                      aria-label="Remove row"
                      title="Remove row"
                      onClick={() => removeRow(i)}
                      className="mx-auto flex size-6 items-center justify-center rounded text-[var(--color-ink-3)] opacity-0 group-hover/row:opacity-100 hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)] transition-all"
                    >
                      <Icon icon="ri-close-line" className="text-xs" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            <tr className="bg-[var(--color-wash)]">
              <td colSpan={block.headers.length} className="p-1">
                <button
                  type="button"
                  onClick={addRow}
                  title="Add row"
                  className="inline-flex items-center gap-2 rounded px-2 py-1 text-xs font-semibold text-[var(--color-ink-2)] hover:bg-[var(--color-brand-tint)] hover:text-[var(--color-brand-700)] transition-colors"
                >
                  <Icon icon="ri-add-line" className="text-sm" />
                  <span>Add row</span>
                </button>
              </td>
              <td className="w-tap-admin p-1 text-center align-middle border-t border-[var(--color-line)]">
                <button
                  type="button"
                  aria-label="Add row"
                  title="Add row"
                  onClick={addRow}
                  className="mx-auto flex size-8 items-center justify-center rounded text-[var(--color-ink-2)] hover:bg-[var(--color-brand-tint)] hover:text-[var(--color-brand-700)] transition-colors"
                >
                  <Icon icon="ri-add-line" className="text-base font-bold" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bilingual primitives — single visible language, EN/ES pill to switch.
//
// The previous version stacked EN above ES (two textareas per block, two
// label rows). That doubled each block's height and pushed content off the
// page. This version matches the rest of the codebase (see BilingualTabs
// in procedure-block-editor.tsx): one input visible at a time, small pill
// toggle to switch sides. Each bilingual body owns its own `lang` state so
// the manager can be filling English in one block and Spanish in another
// without one switch affecting the other.
// ---------------------------------------------------------------------------

const bodyTextareaCls =
  'flex w-full resize-none rounded-[var(--radius-md)] border border-transparent bg-transparent px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] transition-colors hover:border-[var(--color-line-2)] hover:bg-[var(--color-surface)] focus:border-[var(--color-brand-600)] focus:bg-[var(--color-surface)] focus:outline-none';

function LangToggle({
  lang,
  onChange,
}: {
  lang: 'en' | 'es';
  onChange: (next: 'en' | 'es') => void;
}): React.ReactElement {
  return (
    <div
      role="tablist"
      aria-label="Language"
      className="inline-flex rounded-md border border-[var(--color-line-2)] bg-[var(--color-wash)] p-0.5 text-xs font-bold shadow-e1"
    >
      <button
        type="button"
        role="tab"
        aria-checked={lang === 'en'}
        aria-selected={lang === 'en'}
        onClick={() => onChange('en')}
        className={cn(
          'rounded-[var(--radius-sm)] px-3 py-1 transition-colors',
          lang === 'en'
            ? 'bg-[var(--color-surface)] text-[var(--color-brand-700)] shadow-e1 ring-1 ring-[var(--color-brand-tint-2)]'
            : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]',
        )}
      >
        EN
      </button>
      <button
        type="button"
        role="tab"
        aria-checked={lang === 'es'}
        aria-selected={lang === 'es'}
        onClick={() => onChange('es')}
        className={cn(
          'rounded-[var(--radius-sm)] px-3 py-1 transition-colors',
          lang === 'es'
            ? 'bg-[var(--color-surface)] text-[var(--color-brand-700)] shadow-e1 ring-1 ring-[var(--color-brand-tint-2)]'
            : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]',
        )}
      >
        ES
      </button>
    </div>
  );
}

interface BilingualInputProps {
  lang: 'en' | 'es';
  onLangChange: (next: 'en' | 'es') => void;
  enValue: string;
  esValue: string;
  onEnChange: (next: string) => void;
  onEsChange: (next: string) => void;
  enPlaceholder: string;
  esPlaceholder: string;
  /** When true, render a textarea; otherwise a single-line input. */
  multiline?: boolean;
  className?: string;
  rows?: number;
  bgClass?: string;
  /** Where the pill sits — top-right by default, inline-left for headings. */
  pillPosition?: 'top-right' | 'inline';
}

function BilingualInput({
  lang,
  onLangChange,
  enValue,
  esValue,
  onEnChange,
  onEsChange,
  enPlaceholder,
  esPlaceholder,
  multiline,
  className,
  rows = 2,
  pillPosition = 'top-right',
}: BilingualInputProps): React.ReactElement {
  const value = lang === 'en' ? enValue : esValue;
  const onChange = lang === 'en' ? onEnChange : onEsChange;
  const placeholder = lang === 'en' ? enPlaceholder : esPlaceholder;

  if (pillPosition === 'inline') {
    // Pill sits left of the input — used by Heading so the level selector
    // doesn't have to fight for space at the top.
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <LangToggle lang={lang} onChange={onLangChange} />
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className={cn(bodyTextareaCls, 'flex-1')}
          />
        ) : (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 border-transparent bg-[var(--color-wash)] shadow-none focus:border-transparent focus:ring-0"
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <LangToggle lang={lang} onChange={onLangChange} />
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={cn(bodyTextareaCls, className)}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'border-transparent bg-[var(--color-wash)] shadow-none',
            'focus:border-[var(--color-brand-600)] focus:ring-2 focus:ring-[var(--color-brand-tint)]',
            className,
          )}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state — a clean "press / for blocks" surface. No 8-card grid.
// ---------------------------------------------------------------------------

function EmptyState({ onAdd }: { onAdd: (kind: ProcedureBlockKind) => void }): React.ReactElement {
  return (
    <div className="space-y-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] p-8">
      <div className="flex items-start gap-3">
        <div className="flex size-tap-admin shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] text-lg">
          <Icon icon="ri-file-text-line" />
        </div>
        <div>
          <h3 className="font-[family-name:var(--font-ui)] text-md font-bold text-[var(--color-ink)]">
            Start writing
          </h3>
          <p className="mt-0.5 text-sm text-[var(--color-ink-2)]">
            Pick a starting block. Each block stays loose — you can rearrange,
            duplicate, or remove from the row menu.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([
          { kind: 'text', label: 'Text', icon: 'ri-text', hint: 'Paragraph' },
          { kind: 'heading', label: 'Heading', icon: 'ri-h-1', hint: 'Section title' },
          { kind: 'method', label: 'Steps', icon: 'ri-list-ordered', hint: 'Numbered list' },
          { kind: 'table', label: 'Table', icon: 'ri-table-line', hint: 'Rows + columns' },
          { kind: 'warning', label: 'Callout', icon: 'ri-alert-line', hint: 'Warn / tip / alt' },
          { kind: 'image', label: 'Image', icon: 'ri-image-line', hint: 'Photo + caption' },
          { kind: 'video', label: 'Video', icon: 'ri-video-line', hint: 'Upload or link' },
          { kind: 'attachment', label: 'Attachment', icon: 'ri-attachment-line', hint: 'Linked file' },
        ] as { kind: ProcedureBlockKind; label: string; icon: string; hint: string }[]).map((opt) => (
          <button
            key={opt.kind}
            type="button"
            onClick={() => onAdd(opt.kind)}
            className="group flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-3 text-left transition-colors hover:border-[var(--color-brand-600)] hover:bg-[var(--color-wash)]"
          >
            <Icon icon={opt.icon} className="mt-0.5 text-lg text-[var(--color-ink-2)] group-hover:text-[var(--color-brand-700)]" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[var(--color-ink)]">{opt.label}</span>
              <span className="block text-xs text-[var(--color-ink-2)]">{opt.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top-level list. Owns the dnd-kit context, the empty state, and the
// final "+ Add block" affordance.
// ---------------------------------------------------------------------------

export function NotionBlockList({ blocks, onChange }: NotionBlockListProps): React.ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent): void {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((b) => b.id === active.id);
    const to = blocks.findIndex((b) => b.id === over.id);
    if (from === -1 || to === -1 || from === to) return;
    onChange(arrayMove(blocks, from, to));
  }

  function patch(id: string, next: ProcedureBlock): void {
    onChange(blocks.map((b) => (b.id === id ? next : b)));
  }
  function remove(id: string): void {
    onChange(blocks.filter((b) => b.id !== id));
  }
  function move(id: string, dir: 'up' | 'down'): void {
    const i = blocks.findIndex((b) => b.id === id);
    if (i === -1) return;
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= blocks.length) return;
    onChange(arrayMove(blocks, i, j));
  }
  function duplicate(id: string): void {
    const i = blocks.findIndex((b) => b.id === id);
    if (i < -1) return;
    onChange([...blocks.slice(0, i + 1), duplicateBlock(blocks[i]), ...blocks.slice(i + 1)]);
  }
  function addAtEnd(kind: ProcedureBlockKind): void {
    onChange([...blocks, BLOCK_FACTORIES[kind]()]);
  }
  function addAfter(id: string, kind: ProcedureBlockKind): void {
    const i = blocks.findIndex((b) => b.id === id);
    if (i === -1) {
      addAtEnd(kind);
      return;
    }
    const next = [...blocks];
    next.splice(i + 1, 0, BLOCK_FACTORIES[kind]());
    onChange(next);
  }

  if (blocks.length === 0) {
    return <EmptyState onAdd={addAtEnd} />;
  }

  return (
    <div className="space-y-1 pl-8 sm:pl-10">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((block, i) => (
            <BlockRow
              key={block.id}
              block={block}
              index={i}
              total={blocks.length}
              onPatch={(next) => patch(block.id, next)}
              onRemove={() => remove(block.id)}
              onMove={(dir) => move(block.id, dir)}
              onDuplicate={() => duplicate(block.id)}
              onInsertAfter={(kind) => addAfter(block.id, kind)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <EndAddButton onAdd={addAtEnd} />
    </div>
  );
}

function EndAddButton({ onAdd }: { onAdd: (kind: ProcedureBlockKind) => void }): React.ReactElement {
  return (
    <div className="pt-2">
      {/* Ghost affordance — visible on hover only so it doesn't compete with slash command */}
      <InsertAfterButton onInsert={onAdd} ghost />
    </div>
  );
}
