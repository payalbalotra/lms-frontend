'use client';

import * as React from 'react';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ApiException,
  importDocument,
  requestDocumentUpload,
  uploadToR2,
} from '@/lib/api';
import type {
  ExtractedBlock,
  ExtractedProcedure,
  ImportProcedureType,
  Localised,
} from '@/lib/types';
import { LuCheckCheck, LuCloudUpload, LuLoaderCircle, LuWandSparkles } from 'react-icons/lu';
import { IconTile } from '@/components/ui/icon-tile';

const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPTED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'text/plain',
  'text/markdown',
]);

type PanelState =
  | { kind: 'idle' }
  | { kind: 'uploading'; filename: string }
  | { kind: 'extracting'; filename: string }
  | { kind: 'ready'; extraction: ExtractedProcedure; filename: string }
  | { kind: 'failed'; error: string; filename: string };

interface DocumentImportPanelProps {
  procedureType: ImportProcedureType;
  /** Fired when the manager clicks "Use this draft" with the parsed
   *  extraction. The wizard applies it to FormSnapshot. */
  onExtracted: (extraction: ExtractedProcedure) => void;
}

export function DocumentImportPanel({
  procedureType,
  onExtracted,
}: DocumentImportPanelProps): React.ReactElement {
  const t = useTranslations('admin.library.new.import');
  const tCommon = useTranslations('admin.library.new.form');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<PanelState>({ kind: 'idle' });
  // Per-block accept flags — initialised when extraction lands. Blocks
  // default to accepted; the manager unchecks the ones they don't want.
  const [accepted, setAccepted] = useState<Record<number, boolean>>({});
  const [acceptedTitle, setAcceptedTitle] = useState(true);
  const [acceptedPurpose, setAcceptedPurpose] = useState(true);
  const [acceptedRecipe, setAcceptedRecipe] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  function reset(): void {
    setState({ kind: 'idle' });
    setAccepted({});
    setAcceptedTitle(true);
    setAcceptedPurpose(true);
    setAcceptedRecipe(true);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleFile(file: File): Promise<void> {
    if (!ACCEPTED_MIME.has(file.type)) {
      setState({
        kind: 'failed',
        error: t('unsupportedType', { mime: file.type || 'unknown' }),
        filename: file.name,
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      setState({
        kind: 'failed',
        error: t('tooLarge', {
          size: Math.round(file.size / (1024 * 1024)),
          max: MAX_BYTES / (1024 * 1024),
        }),
        filename: file.name,
      });
      return;
    }

    setState({ kind: 'uploading', filename: file.name });
    try {
      const presigned = await requestDocumentUpload({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });
      await uploadToR2(presigned.uploadUrl, file, file.type);
      setState({ kind: 'extracting', filename: file.name });

      const { extraction } = await importDocument({
        publicUrl: presigned.publicUrl,
        filename: file.name,
        contentType: file.type,
        procedureType,
      });

      const initial: Record<number, boolean> = {};
      (extraction.blocks ?? []).forEach((_, i) => {
        initial[i] = true;
      });
      setAccepted(initial);
      setAcceptedTitle(Boolean(extraction.title));
      setAcceptedPurpose(Boolean(extraction.purpose));
      setAcceptedRecipe(Boolean(extraction.recipe));
      setState({ kind: 'ready', extraction, filename: file.name });
    } catch (err) {
      const message =
        err instanceof ApiException
          ? err.message
          : err instanceof Error
            ? err.message
            : t('genericError');
      setState({ kind: 'failed', error: message, filename: file.name });
    }
  }

  function applyDraft(): void {
    if (state.kind !== 'ready') return;
    const ext = state.extraction;
    const filtered: ExtractedProcedure = {
      extractedLanguage: ext.extractedLanguage,
      ...(ext.notes !== undefined ? { notes: ext.notes } : {}),
      ...(ext.title && acceptedTitle ? { title: ext.title } : {}),
      ...(ext.purpose && acceptedPurpose ? { purpose: ext.purpose } : {}),
      ...(ext.recipe && acceptedRecipe ? { recipe: ext.recipe } : {}),
      ...(ext.blocks
        ? {
            blocks: ext.blocks.filter((_, i) => accepted[i]),
          }
        : {}),
    };
    onExtracted(filtered);
  }

  const hasAnything =
    state.kind === 'ready' &&
    Boolean(
      state.extraction.title ||
        state.extraction.purpose ||
        (state.extraction.blocks && state.extraction.blocks.length > 0) ||
        state.extraction.recipe,
    );

  return (
    <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
      <header className="flex items-start gap-3 border-b border-[var(--color-line)] pb-3">
        <IconTile size="md" icon={LuWandSparkles} />
        <div className="min-w-0">
          <h3 className="text-md font-semibold tracking-snug text-[var(--color-ink)]">{t('title')}</h3>
          <p className="mt-0.5 text-sm text-[var(--color-ink-2)]">{t('body')}</p>
        </div>
      </header>

      {/* Idle / failed — show drop zone */}
      {(state.kind === 'idle' || state.kind === 'failed') && (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) void handleFile(file);
            }}
            className={cn(
              'flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed bg-[var(--color-wash)] p-6 text-center',
              'transition-colors duration-[var(--dur)] ease-[var(--ease)]',
              dragOver
                ? 'border-[var(--color-ring)] bg-[var(--color-brand-tint)]'
                : 'border-[var(--color-line-3)] hover:bg-[var(--color-panel)]',
            )}
          >
            <LuCloudUpload aria-hidden="true" className="mb-2 text-lg text-[var(--color-ink-2)]" />
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              {t('dropHint')} <span className="text-[var(--color-ink-2)] font-normal">{t('or')}</span>
            </p>
            <div className="mt-3">
              <Button
                type="button"
                variant="secondary"
                size="default"
                onClick={() => inputRef.current?.click()}
              >
                {t('browse')}
              </Button>
            </div>
            <span className="mt-2 text-sm text-[var(--color-ink-3)]">{t('formatsHint')}</span>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.jpg,.jpeg,.png,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,text/plain,text/markdown"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </div>
          {state.kind === 'failed' && (
            <div
              role="alert"
              className="rounded-[var(--radius-md)] border border-[var(--color-bad-tint)] bg-[var(--color-bad-tint)] px-3 py-2 text-sm text-[var(--color-bad)]"
            >
              <p className="font-semibold">{state.error}</p>
              <p className="mt-1 text-sm opacity-80">
                {state.filename}
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-2 text-sm font-semibold underline-offset-4 hover:underline"
              >
                {t('tryAgain')}
              </button>
            </div>
          )}
        </>
      )}

      {/* Busy states */}
      {(state.kind === 'uploading' || state.kind === 'extracting') && (
        <BusyCard
          label={
            state.kind === 'uploading'
              ? t('uploadingLabel', { filename: state.filename })
              : t('extractingLabel', { filename: state.filename })
          }
        />
      )}

      {/* Ready — preview card with accept/reject */}
      {state.kind === 'ready' && (
        <ReadyPreview
          extraction={state.extraction}
          filename={state.filename}
          accepted={accepted}
          setAccepted={setAccepted}
          acceptedTitle={acceptedTitle}
          setAcceptedTitle={setAcceptedTitle}
          acceptedPurpose={acceptedPurpose}
          setAcceptedPurpose={setAcceptedPurpose}
          acceptedRecipe={acceptedRecipe}
          setAcceptedRecipe={setAcceptedRecipe}
          hasAnything={hasAnything}
          onApply={applyDraft}
          onDiscard={reset}
          t={t}
        />
      )}
    </section>
  );
}

function BusyCard({ label }: { label: string }): React.ReactElement {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-ink-2)]">
      <LuLoaderCircle aria-hidden="true" className="animate-spin text-lg text-[var(--color-brand-700)]" />
      <span>{label}</span>
    </div>
  );
}

interface ReadyPreviewProps {
  extraction: ExtractedProcedure;
  filename: string;
  accepted: Record<number, boolean>;
  setAccepted: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  acceptedTitle: boolean;
  setAcceptedTitle: (v: boolean) => void;
  acceptedPurpose: boolean;
  setAcceptedPurpose: (v: boolean) => void;
  acceptedRecipe: boolean;
  setAcceptedRecipe: (v: boolean) => void;
  hasAnything: boolean;
  onApply: () => void;
  onDiscard: () => void;
  t: ReturnType<typeof useTranslations<'admin.library.new.import'>>;
}

function ReadyPreview({
  extraction,
  filename,
  accepted,
  setAccepted,
  acceptedTitle,
  setAcceptedTitle,
  acceptedPurpose,
  setAcceptedPurpose,
  acceptedRecipe,
  setAcceptedRecipe,
  hasAnything,
  onApply,
  onDiscard,
  t,
}: ReadyPreviewProps): React.ReactElement {
  const blocks = extraction.blocks ?? [];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
        <LuCheckCheck aria-hidden="true" className="text-[var(--color-ok)]" />
        <span>{t('readyHeading', { filename })}</span>
      </div>

      {!hasAnything && (
        <div
          role="status"
          className="rounded-[var(--radius-md)] border border-[var(--color-warn-tint)] bg-[var(--color-warn-tint)] px-3 py-2 text-sm text-[var(--color-warn)]"
        >
          {t('noExtraction')}
        </div>
      )}

      {extraction.title && (
        <AcceptRow
          label={t('sectionsTitle')}
          value={localisedPreview(extraction.title)}
          accepted={acceptedTitle}
          onToggle={setAcceptedTitle}
        />
      )}
      {extraction.purpose && (
        <AcceptRow
          label={t('sectionsPurpose')}
          value={localisedPreview(extraction.purpose)}
          accepted={acceptedPurpose}
          onToggle={setAcceptedPurpose}
        />
      )}
      {extraction.recipe && (
        <AcceptRow
          label={t('sectionsRecipe')}
          value={
            extraction.recipe.ingredients
              ? t('recipeSummary', {
                  ingredients: extraction.recipe.ingredients.length,
                  steps: extraction.recipe.steps?.length ?? 0,
                })
              : t('sectionsRecipe')
          }
          accepted={acceptedRecipe}
          onToggle={setAcceptedRecipe}
        />
      )}
      {blocks.map((block, i) => (
        <BlockRow
          key={i}
          index={i}
          block={block}
          accepted={accepted[i] ?? true}
          onToggle={(v) => setAccepted((prev) => ({ ...prev, [i]: v }))}
          blockLabel={t(`blockKind.${block.kind}` as never)}
        />
      ))}

      {extraction.notes && (
        <p className="text-sm italic text-[var(--color-ink-3)]">
          {t('sectionsNotes')}: {extraction.notes}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="neutral" size="sm" onClick={onDiscard}>
          {t('discard')}
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!hasAnything}
          onClick={onApply}
        >
          {t('useThis')}
        </Button>
      </div>
      </div>
  );
}

function AcceptRow({
  label,
  value,
  accepted,
  onToggle,
}: {
  label: string;
  value: string;
  accepted: boolean;
  onToggle: (v: boolean) => void;
}): React.ReactElement {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 py-2 transition-opacity',
        accepted
          ? 'border-[var(--color-line)] opacity-100'
          : 'border-[var(--color-line-2)] opacity-50',
      )}
    >
      <input
        type="checkbox"
        checked={accepted}
        onChange={(e) => onToggle(e.target.checked)}
        className="mt-1 size-4 accent-[var(--color-brand-600)]"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--color-ink-3)]">
          {label}
        </p>
        <p className="text-sm text-[var(--color-ink)]">{value}</p>
      </div>
    </label>
  );
}

function BlockRow({
  index,
  block,
  accepted,
  onToggle,
  blockLabel,
}: {
  index: number;
  block: ExtractedBlock;
  accepted: boolean;
  onToggle: (v: boolean) => void;
  blockLabel: string;
}): React.ReactElement {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 py-2 transition-opacity',
        accepted
          ? 'border-[var(--color-line)] opacity-100'
          : 'border-[var(--color-line-2)] opacity-50',
      )}
    >
      <input
        type="checkbox"
        checked={accepted}
        onChange={(e) => onToggle(e.target.checked)}
        className="mt-1 size-4 accent-[var(--color-brand-600)]"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--color-ink-3)]">
          {blockLabel}
        </p>
        <BlockBody block={block} />
      </div>
      <span className="text-sm text-[var(--color-ink-3)]">#{index + 1}</span>
    </label>
  );
}

function BlockBody({ block }: { block: ExtractedBlock }): React.ReactElement {
  switch (block.kind) {
    case 'text':
      return <p className="text-sm text-[var(--color-ink)]">{localisedPreview(block.body)}</p>;
    case 'heading':
      return (
        <p
          className={cn(
            'text-[var(--color-ink)]',
            block.level === 1 && 'text-md font-semibold',
            block.level === 2 && 'text-sm font-semibold',
            block.level === 3 && 'text-sm font-semibold',
          )}
        >
          {localisedPreview(block.text)}
        </p>
      );
    case 'method':
      return (
        <ol className="list-decimal pl-5 text-sm text-[var(--color-ink)]">
          {block.steps.map((s, i) => (
            <li key={i}>{localisedPreview(s.body)}</li>
          ))}
        </ol>
      );
    case 'warning':
      return (
        <p className="text-sm text-[var(--color-warn)]">
          <span className="mr-1 inline-block rounded-sm bg-[var(--color-warn-tint)] px-2 py-0.5 text-sm font-semibold">
            {block.severity}
          </span>
          {localisedPreview(block.body)}
        </p>
      );
    case 'table':
      return (
        <div className="overflow-x-auto rounded-sm border border-[var(--color-line-2)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-panel)]">
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i} className="px-2 py-1 text-left font-semibold">
                    {localisedPreview(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-t border-[var(--color-line-2)]">
                  {row.map((c, j) => (
                    <td key={j} className="px-2 py-1">
                      {localisedPreview(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'recipe':
      return (
        <p className="text-sm text-[var(--color-ink)]">
          {block.ingredients?.length ?? 0} ingredients ·{' '}
          {block.steps?.length ?? 0} steps
        </p>
      );
  }
}

function localisedPreview(l: Localised): string {
  // Show whichever side the AI filled in. v1 only fills one side per the
  // bilingual rule in the extraction prompt.
  return (l.en || l.es || '').trim();
}
