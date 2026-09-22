'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import type {
  Localised,
  Procedure,
  ProcedureAcknowledgement,
  ProcedureBlock,
  ProcedureBlockKind,
  ProcedureBody,
  ProcedureQuiz,
  ProcedureQuizQuestion,
  ProcedureStatus,
} from '@/lib/types';
import {
  BLOCK_FACTORIES,
  nextBlockId,
} from '@/lib/procedure-blocks';
import { ProcedureBlockCard } from '@/components/admin/procedure-block-card';
import {
  LuArrowDown,
  LuArrowUp,
  LuBookOpen,
  LuCheck,
  LuClipboardList,
  LuHeading1,
  LuImage,
  LuListChecks,
  LuListOrdered,
  LuPaperclip,
  LuPlus,
  LuSave,
  LuSearch,
  LuSignature,
  LuTable,
  LuTrash2,
  LuTriangleAlert,
  LuType,
  LuVideo,
  LuX,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';

// Allow-listed block kinds for a course. Course content excludes `recipe` —
// scaler / yield / ingredient / allergen subtree is library territory, not
// training (DESIGN.md §4). Everything else (videos, photos, tables, warnings,
// checklists, attachments, headings, numbered steps, free text) is in scope.
const COURSE_KINDS: ProcedureBlockKind[] = [
  'text',
  'heading',
  'method',
  'image',
  'video',
  'warning',
  'attachment',
  'table',
  'checklist',
];

const KIND_META: Record<ProcedureBlockKind, { label: string; icon: IconType }> = {
  text: { label: 'Text', icon: LuType },
  heading: { label: 'Heading', icon: LuHeading1 },
  method: { label: 'Numbered steps', icon: LuListOrdered },
  image: { label: 'Photograph', icon: LuImage },
  video: { label: 'Video', icon: LuVideo },
  warning: { label: 'Warning callout', icon: LuTriangleAlert },
  attachment: { label: 'Attachment', icon: LuPaperclip },
  table: { label: 'Table', icon: LuTable },
  checklist: { label: 'Checklist', icon: LuListChecks },
  recipe: { label: 'Recipe', icon: LuListOrdered }, // never offered in COURSE_KINDS
};

type CourseLang = 'en' | 'es';

// ---------------------------------------------------------------------------
// Small helpers — lightweight, self-contained.
// ---------------------------------------------------------------------------

function emptyBilingual(): Localised {
  return { en: '', es: '' };
}

function emptyQuestion(): ProcedureQuizQuestion {
  return {
    id: `q-${Math.random().toString(36).slice(2, 8)}`,
    prompt: emptyBilingual(),
    choices: [
      { id: `c-${Math.random().toString(36).slice(2, 8)}`, label: emptyBilingual() },
      { id: `c-${Math.random().toString(36).slice(2, 8)}`, label: emptyBilingual() },
    ],
    correctChoiceId: '',
  };
}

function emptyQuiz(): ProcedureQuiz {
  return { questions: [emptyQuestion()], attached: true };
}

// ---------------------------------------------------------------------------
// BilingualTabs — local copy; matches the look in the procedure-block editor.
// ---------------------------------------------------------------------------

function BilingualTabs({
  active,
  onChange,
  enLabel = 'EN',
  esLabel = 'ES',
}: {
  active: CourseLang;
  onChange: (next: CourseLang) => void;
  enLabel?: string;
  esLabel?: string;
}): React.ReactElement {
  return (
    <div className="inline-flex rounded-md border border-[var(--color-line-3)] bg-[var(--color-surface)] p-0.5 text-xs font-semibold">
      {(['en', 'es'] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          role="tab"
          aria-checked={active === lang}
          onClick={() => onChange(lang)}
          className={cn(
            'rounded-[var(--radius-sm)] px-3 py-1 transition-colors',
            active === lang
              ? 'bg-[var(--color-ink)] text-white'
              : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]',
          )}
        >
          {lang === 'en' ? enLabel : esLabel}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field wrapper — keeps the "label + control + hint" rhythm consistent.
// ---------------------------------------------------------------------------

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="space-y-1">
      <Label className="text-sm">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-[var(--color-bad)]">*</span>
        ) : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-[var(--color-ink-2)]">{hint}</p> : null}
    </div>
  );
}

const inputCls =
  'flex w-full rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] transition-all duration-[var(--dur)] focus:border-[var(--color-brand-600)] focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0';
const textareaCls = `${inputCls} py-3`;

// ---------------------------------------------------------------------------
// QuizEditor — inline mini-editor. Multi-question; 2–4 choices per question.
// ---------------------------------------------------------------------------

function QuizEditor({
  quiz,
  onChange,
  onDetach,
}: {
  quiz: ProcedureQuiz;
  onChange: (next: ProcedureQuiz) => void;
  onDetach: () => void;
}): React.ReactElement {
  const tForm = useTranslations('admin.training.form');
  const [lang, setLang] = React.useState<CourseLang>('en');
  const set = (next: ProcedureQuiz): void => onChange({ ...next, attached: true });

  function patchQuestion(qid: string, patch: Partial<ProcedureQuizQuestion>): void {
    set({
      ...quiz,
      questions: quiz.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)),
    });
  }

  function addQuestion(): void {
    set({ ...quiz, questions: [...quiz.questions, emptyQuestion()] });
  }

  function removeQuestion(qid: string): void {
    set({ ...quiz, questions: quiz.questions.filter((q) => q.id !== qid) });
  }

  function moveQuestion(qid: string, dir: 'up' | 'down'): void {
    const i = quiz.questions.findIndex((q) => q.id === qid);
    if (i === -1) return;
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= quiz.questions.length) return;
    const next = [...quiz.questions];
    [next[i], next[j]] = [next[j], next[i]];
    set({ ...quiz, questions: next });
  }

  function addChoice(qid: string): void {
    patchQuestion(qid, {
      choices: [
        ...quiz.questions.find((q) => q.id === qid)!.choices,
        {
          id: `c-${Math.random().toString(36).slice(2, 8)}`,
          label: emptyBilingual(),
        },
      ],
    });
  }

  function removeChoice(qid: string, cid: string): void {
    const q = quiz.questions.find((x) => x.id === qid);
    if (!q || q.choices.length <= 2) return;
    patchQuestion(qid, {
      choices: q.choices.filter((c) => c.id !== cid),
      correctChoiceId: q.correctChoiceId === cid ? '' : q.correctChoiceId,
    });
  }

  function setChoiceLabel(qid: string, cid: string, value: string): void {
    const q = quiz.questions.find((x) => x.id === qid);
    if (!q) return;
    patchQuestion(qid, {
      choices: q.choices.map((c) =>
        c.id === cid ? { ...c, label: { ...c.label, [lang]: value } } : c,
      ),
    });
  }

  function setPrompt(qid: string, value: string): void {
    const q = quiz.questions.find((x) => x.id === qid);
    if (!q) return;
    patchQuestion(qid, { prompt: { ...q.prompt, [lang]: value } });
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h3 className="font-[family-name:var(--font-ui)] text-md font-semibold text-[var(--color-ink)]">
            {tForm('quizHeading')}
          </h3>
          <p className="text-xs text-[var(--color-ink-2)]">{tForm('quizSubheading')}</p>
        </div>
        <BilingualTabs active={lang} onChange={setLang} />
      </div>

      <ol className="space-y-4">
        {quiz.questions.map((q, qi) => (
          <li
            key={q.id}
            className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] p-3"
          >
            <div className="flex items-start gap-2">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-panel)] font-mono text-xs font-semibold text-[var(--color-ink)]">
                {qi + 1}
              </span>
              <div className="flex-1 space-y-2">
                <textarea
                  value={q.prompt[lang]}
                  onChange={(e) => setPrompt(q.id, e.target.value)}
                  rows={2}
                  placeholder={tForm('quizPromptPlaceholder')}
                  className={textareaCls}
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveQuestion(q.id, 'up')}
                  disabled={qi === 0}
                  aria-label={tForm('moveUp')}
                  className="rounded-md p-1 text-[var(--color-ink-3)] hover:bg-[var(--color-panel)] disabled:opacity-30"
                >
                  <LuArrowUp aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => moveQuestion(q.id, 'down')}
                  disabled={qi === quiz.questions.length - 1}
                  aria-label={tForm('moveDown')}
                  className="rounded-md p-1 text-[var(--color-ink-3)] hover:bg-[var(--color-panel)] disabled:opacity-30"
                >
                  <LuArrowDown aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  aria-label={tForm('removeQuestion')}
                  className="rounded-md p-1 text-[var(--color-ink-3)] hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)]"
                >
                  <LuTrash2 aria-hidden="true" />
                </button>
              </div>
            </div>

            <fieldset className="space-y-2 pl-9">
              <legend className="sr-only">Choices</legend>
              {q.choices.map((c) => {
                const isCorrect = q.correctChoiceId === c.id;
                return (
                  <div key={c.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={isCorrect}
                      onClick={() => patchQuestion(q.id, { correctChoiceId: c.id })}
                      className={cn(
                        'inline-flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors',
                        isCorrect
                          ? 'border-[var(--color-ok)] bg-[var(--color-ok)] text-white'
                          : 'border-[var(--color-line-3)] text-transparent hover:border-[var(--color-ink-2)]',
                      )}
                      aria-label={tForm('markCorrect')}
                    >
                      {isCorrect ? <LuCheck aria-hidden="true" className="text-sm" /> : null}
                    </button>
                    <Input
                      value={c.label[lang]}
                      onChange={(e) => setChoiceLabel(q.id, c.id, e.target.value)}
                      placeholder={tForm('choicePlaceholder')}
                      className="text-xs"
                    />
                    {q.choices.length > 2 ? (
                      <button
                        type="button"
                        onClick={() => removeChoice(q.id, c.id)}
                        aria-label={tForm('removeChoice')}
                        className="rounded-md p-1 text-[var(--color-ink-3)] hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)]"
                      >
                        <LuX aria-hidden="true" className="text-sm" />
                      </button>
                    ) : null}
                  </div>
                );
              })}
              {q.choices.length < 4 ? (
                <button
                  type="button"
                  onClick={() => addChoice(q.id)}
                  className="ml-9 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-brand-700)] hover:underline"
                >
                  <LuPlus aria-hidden="true" />
                  {tForm('addChoice')}
                </button>
              ) : null}
            </fieldset>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Button type="button" variant="secondary" size="sm" onClick={addQuestion}>
          <LuPlus aria-hidden="true" className="mr-1" />
          {tForm('addQuestion')}
        </Button>
        <Button type="button" variant="neutral" size="sm" onClick={onDetach}>
          {tForm('removeQuiz')}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LinkedSopsEditor — multi-select chips. Filters the library by title. Drops
// any selected id on a re-search so the admin can review and re-add.
// ---------------------------------------------------------------------------

function LinkedSopsEditor({
  available,
  selectedIds,
  onChange,
}: {
  available: Procedure[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
}): React.ReactElement {
  const tForm = useTranslations('admin.training.form');
  const [search, setSearch] = React.useState('');

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return available;
    return available.filter((s) =>
      (s.titleEn + ' ' + s.titleEs).toLowerCase().includes(q),
    );
  }, [available, search]);

  const selected = selectedIds
    .map((id) => available.find((s) => s.id === id))
    .filter((s): s is Procedure => Boolean(s));

  function add(id: string): void {
    if (selectedIds.includes(id)) return;
    onChange([...selectedIds, id]);
  }

  function remove(id: string): void {
    onChange(selectedIds.filter((s) => s !== id));
  }

  function move(id: string, dir: 'up' | 'down'): void {
    const i = selectedIds.indexOf(id);
    if (i === -1) return;
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= selectedIds.length) return;
    const next = [...selectedIds];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      {/* Selected chips — ordered; the order here is what the employee sees */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-[family-name:var(--font-ui)] text-md font-semibold text-[var(--color-ink)]">
            {tForm('linkedSopsHeading')}
          </h3>
          <span className="text-xs text-[var(--color-ink-2)]">
            {tForm('linkedSopsCount', { count: selected.length })}
          </span>
        </div>

        {selected.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-2 text-xs text-[var(--color-ink-2)]">
            {tForm('linkedSopsEmpty')}
          </p>
        ) : (
          <ol className="space-y-2">
            {selected.map((s, i) => (
              <li
                key={s.id}
                className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-2"
              >
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => move(s.id, 'up')}
                    disabled={i === 0}
                    aria-label={tForm('moveUp')}
                    className="rounded-md p-0.5 text-[var(--color-ink-3)] hover:bg-[var(--color-panel)] disabled:opacity-30"
                  >
                    <LuArrowUp aria-hidden="true" className="text-sm" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(s.id, 'down')}
                    disabled={i === selected.length - 1}
                    aria-label={tForm('moveDown')}
                    className="rounded-md p-0.5 text-[var(--color-ink-3)] hover:bg-[var(--color-panel)] disabled:opacity-30"
                  >
                    <LuArrowDown aria-hidden="true" className="text-sm" />
                  </button>
                </div>
                <Icon icon={LuBookOpen} className="text-md text-[var(--color-ink-2)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[var(--color-ink)]">{s.titleEn}</p>
                  <p className="truncate text-[11px] text-[var(--color-ink-2)]">{s.titleEs}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  aria-label={tForm('removeSop')}
                  className="rounded-md p-1 text-[var(--color-ink-3)] hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)]"
                >
                  <LuX aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Library search + add */}
      <div className="space-y-2">
        <div className="relative">
          <LuSearch aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-3)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tForm('linkedSopsSearch')}
            className="h-tap-admin pl-10 text-xs"
          />
        </div>

        <ul className="max-h-56 divide-y divide-[var(--color-line)] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)]">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-[var(--color-ink-2)]">
              {tForm('linkedSopsNoMatch')}
            </li>
          ) : (
            filtered.map((s) => {
              const already = selectedIds.includes(s.id);
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[var(--color-ink)]">{s.titleEn}</p>
                    <p className="truncate text-[11px] text-[var(--color-ink-2)]">{s.titleEs}</p>
                  </div>
                  <button
                    type="button"
                    disabled={already}
                    onClick={() => add(s.id)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors',
                      already
                        ? 'cursor-not-allowed bg-[var(--color-panel)] text-[var(--color-ink-3)]'
                        : 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] hover:bg-[var(--color-brand-tint-2)]',
                    )}
                  >
                    {already ? (
                      <>
                        <LuCheck aria-hidden="true" /> {tForm('linkedSopAlreadyAdded')}
                      </>
                    ) : (
                      <>
                        <LuPlus aria-hidden="true" /> {tForm('linkedSopAdd')}
                      </>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AcknowledgementEditor — toggle + bilingual statement + version label.
// Mirrors the `.ack` block DESIGN.md §3.4. Required when the course is
// regulated; recommended when the receipt needs an audit trail.
// ---------------------------------------------------------------------------

function AcknowledgementEditor({
  value,
  onChange,
}: {
  value: ProcedureAcknowledgement | null;
  onChange: (next: ProcedureAcknowledgement | null) => void;
}): React.ReactElement {
  const tForm = useTranslations('admin.training.form');
  const [lang, setLang] = React.useState<CourseLang>('en');

  if (value === null) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] p-4">
        <div className="space-y-0.5">
          <h3 className="font-[family-name:var(--font-ui)] text-md font-semibold text-[var(--color-ink)]">
            {tForm('ackHeading')}
          </h3>
          <p className="text-xs text-[var(--color-ink-2)]">{tForm('ackSubheading')}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            onChange({
              versionLabel: '',
              statement: emptyBilingual(),
            })
          }
        >
          <LuPlus aria-hidden="true" className="mr-1" />
          {tForm('ackAdd')}
        </Button>
      </div>
    );
  }

  function setStatement(text: string): void {
    onChange({ ...value!, statement: { ...value!.statement, [lang]: text } });
  }

  function setVersion(label: string): void {
    onChange({ ...value!, versionLabel: label });
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon icon={LuSignature} className="text-md text-[var(--color-brand-700)]" />
          <h3 className="font-[family-name:var(--font-ui)] text-md font-semibold text-[var(--color-ink)]">
            {tForm('ackHeading')}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <BilingualTabs active={lang} onChange={setLang} />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={tForm('ackRemove')}
            className="rounded-md p-1 text-[var(--color-ink-3)] hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)]"
          >
            <LuTrash2 aria-hidden="true" />
          </button>
        </div>
      </div>

      <Field label={tForm('ackVersionLabel')} hint={tForm('ackVersionLabelHint')} required>
        <Input
          value={value.versionLabel}
          onChange={(e) => setVersion(e.target.value)}
          placeholder={tForm('ackVersionLabelPlaceholder')}
          className="text-xs"
        />
      </Field>

      <Field label={tForm('ackStatement')} hint={tForm('ackStatementHint')} required>
        <textarea
          value={value.statement[lang]}
          onChange={(e) => setStatement(e.target.value)}
          rows={3}
          placeholder={tForm('ackStatementPlaceholder')}
          className={textareaCls}
        />
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CourseBlockList — local reimplementation that excludes `recipe`.
// Reuses ProcedureBlockCard for the editing surface; ProcedureBlockEditor is
// invoked from inside the card and dispatches on `block.kind`.
// ---------------------------------------------------------------------------

function CourseBlockList({
  blocks,
  onChange,
}: {
  blocks: ProcedureBlock[];
  onChange: (next: ProcedureBlock[]) => void;
}): React.ReactElement {
  const tForm = useTranslations('admin.training.form');

  function update(id: string, next: ProcedureBlock): void {
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
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  function add(kind: ProcedureBlockKind): void {
    onChange([...blocks, BLOCK_FACTORIES[kind]()]);
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => (
        <ProcedureBlockCard
          key={block.id}
          block={block}
          index={i}
          total={blocks.length}
          onChange={(next) => update(block.id, next)}
          onRemove={() => remove(block.id)}
          onMove={(dir) => move(block.id, dir)}
          onDuplicate={() => {
            const clone: ProcedureBlock = { ...block, id: nextBlockId() } as ProcedureBlock;
            onChange([...blocks.slice(0, i + 1), clone, ...blocks.slice(i + 1)]);
          }}
        />
      ))}

      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] p-4">
        <p className="mb-3 text-xs font-semibold text-[var(--color-ink-3)]">
          {tForm('addBlock')}
        </p>
        <div className="flex flex-wrap gap-2">
          {COURSE_KINDS.map((kind) => {
            const meta = KIND_META[kind];
            return (
              <button
                key={kind}
                type="button"
                onClick={() => add(kind)}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-wash)] hover:border-[var(--color-brand-600)] transition-colors"
              >
                <Icon icon={meta.icon} className="text-sm text-[var(--color-ink-2)]" />
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NewCourseForm — the page's main composer.
// ---------------------------------------------------------------------------

export function NewCourseForm({
  locale,
  availableSops,
}: {
  locale: string;
  availableSops: Procedure[];
}): React.ReactElement {
  const tForm = useTranslations('admin.training.form');
  const router = useRouter();

  // Body state — courses are bilingual at the procedure level (bodyEn/bodyEs).
  // For the composer we maintain one ProcedureBody and mirror save across both
  // sides (a real backend will store them separately).
  const [titleEn, setTitleEn] = React.useState('');
  const [titleEs, setTitleEs] = React.useState('');
  const [purposeEn, setPurposeEn] = React.useState('');
  const [purposeEs, setPurposeEs] = React.useState('');
  const [blocks, setBlocks] = React.useState<ProcedureBlock[]>([]);
  const [quiz, setQuiz] = React.useState<ProcedureQuiz | null>(null);
  const [linkedSops, setLinkedSops] = React.useState<string[]>([]);
  const [acknowledgement, setAcknowledgement] =
    React.useState<ProcedureAcknowledgement | null>(null);
  const [status, setStatus] = React.useState<ProcedureStatus>('draft');

  const canPublish =
    titleEn.trim().length > 0 && titleEs.trim().length > 0 && blocks.length > 0;
  const canSaveDraft = titleEn.trim().length > 0 || titleEs.trim().length > 0;

  function handleSave(nextStatus: ProcedureStatus): void {
    const body: ProcedureBody = { blocks };
    console.info('[training] save course (mock)', {
      title: { en: titleEn, es: titleEs },
      purpose: { en: purposeEn, es: purposeEs },
      body,
      quiz,
      linkedSops,
      acknowledgement,
      attachedToTraining: true,
      status: nextStatus,
    });
    setStatus(nextStatus);
    router.push(`/${locale}/admin/training`);
  }

  return (
    <div className="space-y-8">
      {/* Section 1 — Title & purpose (bilingual) */}
      <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
        <div className="space-y-1">
          <h2 className="font-[family-name:var(--font-ui)] text-lg font-semibold text-[var(--color-ink)]">
            {tForm('sectionTitle')}
          </h2>
          <p className="text-xs text-[var(--color-ink-2)]">{tForm('sectionSubtitle')}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={tForm('titleEn')} required>
            <Input
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder={tForm('titleEnPlaceholder')}
              className="text-sm"
            />
          </Field>
          <Field label={tForm('titleEs')} required>
            <Input
              value={titleEs}
              onChange={(e) => setTitleEs(e.target.value)}
              placeholder={tForm('titleEsPlaceholder')}
              className="text-sm"
            />
          </Field>
        </div>

        <Field label={tForm('purpose')} required hint={tForm('purposeHint')}>
          <textarea
            value={purposeEn}
            onChange={(e) => setPurposeEn(e.target.value)}
            rows={2}
            placeholder={tForm('purposeEnPlaceholder')}
            className={`${textareaCls} mb-2`}
          />
          <textarea
            value={purposeEs}
            onChange={(e) => setPurposeEs(e.target.value)}
            rows={2}
            placeholder={tForm('purposeEsPlaceholder')}
            className={textareaCls}
          />
        </Field>
      </section>

      {/* Section 2 — Optional quiz */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-[family-name:var(--font-ui)] text-lg font-semibold text-[var(--color-ink)]">
              {tForm('sectionQuiz')}
            </h2>
            <p className="text-xs text-[var(--color-ink-2)]">{tForm('sectionQuizSubtitle')}</p>
          </div>
          {quiz === null ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => setQuiz(emptyQuiz())}>
              <LuPlus aria-hidden="true" className="mr-1" />
              {tForm('addQuiz')}
            </Button>
          ) : null}
        </div>
        {quiz ? (
          <QuizEditor
            quiz={quiz}
            onChange={setQuiz}
            onDetach={() => setQuiz(null)}
          />
        ) : (
          <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-wash)] px-4 py-3 text-xs text-[var(--color-ink-2)]">
            {tForm('noQuizYet')}
          </p>
        )}
      </section>

      {/* Section 3 — Block composer (videos, checklists, headings, steps, etc.) */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-[family-name:var(--font-ui)] text-lg font-semibold text-[var(--color-ink)]">
            {tForm('sectionBlocks')}
          </h2>
          <p className="text-xs text-[var(--color-ink-2)]">{tForm('sectionBlocksSubtitle')}</p>
        </div>
        {blocks.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 text-xs text-[var(--color-ink-2)]">
            {tForm('emptyBlocks')}
          </div>
        ) : (
          <CourseBlockList blocks={blocks} onChange={setBlocks} />
        )}
      </section>

      {/* Section 4 — Linked SOPs (read alongside) */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-[family-name:var(--font-ui)] text-lg font-semibold text-[var(--color-ink)]">
            {tForm('sectionSops')}
          </h2>
          <p className="text-xs text-[var(--color-ink-2)]">{tForm('sectionSopsSubtitle')}</p>
        </div>
        <LinkedSopsEditor
          available={availableSops}
          selectedIds={linkedSops}
          onChange={setLinkedSops}
        />
      </section>

      {/* Section 5 — Acknowledgement gate */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-[family-name:var(--font-ui)] text-lg font-semibold text-[var(--color-ink)]">
            {tForm('sectionAck')}
          </h2>
          <p className="text-xs text-[var(--color-ink-2)]">{tForm('sectionAckSubtitle')}</p>
        </div>
        <AcknowledgementEditor value={acknowledgement} onChange={setAcknowledgement} />
      </section>

      {/* Footer — save actions */}
      <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--color-line)] pt-6">
        <Button
          type="button"
          variant="neutral"
          size="sm"
          disabled={!canSaveDraft}
          onClick={() => handleSave('draft')}
        >
          <LuClipboardList aria-hidden="true" className="mr-1" />
          {tForm('saveDraft')}
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!canPublish}
          onClick={() => handleSave('published')}
        >
          <LuSave aria-hidden="true" className="mr-1" />
          {tForm('publish')}
        </Button>
      </footer>
    </div>
  );
}
