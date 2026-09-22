'use client';

/**
 * QuizEditor — the "Quiz" step of the procedure wizard.
 *
 * Admin authors a quiz inline: each question gets a prompt, up to six options
 * (min two), and exactly one option is marked correct. The attach toggle
 * controls whether the quiz shows on the procedure detail page; if the
 * procedure is part of training it shows even without the toggle.
 *
 * State lives here so the wizard stays dumb — the editor receives `value`
 * and emits a full `ProcedureQuiz` on every change. When `value` is null we
 * seed one empty question so the author has something to fill in straight
 * away; nothing is emitted until the admin actually edits.
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { Localised, ProcedureQuiz, ProcedureQuizQuestion } from '@/lib/types';
import { LuCheck, LuCircle, LuPlus, LuTrash2 } from 'react-icons/lu';

const MIN_CHOICES = 2;
const MAX_CHOICES = 6;

function withBoth(s: string): Localised {
  return { en: s, es: s };
}

function emptyQuestion(): ProcedureQuizQuestion {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `q-${Math.random().toString(36).slice(2, 10)}`,
    prompt: withBoth(''),
    choices: Array.from({ length: 4 }, () => ({
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `c-${Math.random().toString(36).slice(2, 10)}`,
      label: withBoth(''),
    })),
    correctChoiceId: '',
  };
}

interface QuizEditorProps {
  value: ProcedureQuiz | null;
  onChange: (next: ProcedureQuiz | null) => void;
  isSaving?: boolean;
}

export function QuizEditor({ value, onChange, isSaving }: QuizEditorProps): React.ReactElement {
  const t = useTranslations('admin.library.new.quiz');

  // Local working copy. Seeded once from `value` (or a blank single-question
  // quiz when authoring for the first time). Edits emit through `onChange`
  // — no emit on mount, so flipping through the wizard without touching
  // anything leaves the parent state clean.
  const [working, setWorking] = React.useState<ProcedureQuiz>(() => value ?? makeBlankQuiz());

  const update = (next: ProcedureQuiz): void => {
    setWorking(next);
    onChange(next);
  };

  const setAttached = (next: boolean): void => update({ ...working, attached: next });

  const updateQuestion = (qi: number, patch: Partial<ProcedureQuizQuestion>): void => {
    const questions = working.questions.map((q, i) => (i === qi ? { ...q, ...patch } : q));
    update({ ...working, questions });
  };

  const updatePrompt = (qi: number, text: string): void =>
    updateQuestion(qi, { prompt: withBoth(text) });

  const updateChoice = (qi: number, ci: number, text: string): void => {
    const q = working.questions[qi];
    if (!q) return;
    const choices = q.choices.map((c, j) => (j === ci ? { ...c, label: withBoth(text) } : c));
    updateQuestion(qi, { choices });
  };

  const setCorrect = (qi: number, ci: number): void => {
    const q = working.questions[qi];
    if (!q) return;
    updateQuestion(qi, { correctChoiceId: q.choices[ci]?.id ?? '' });
  };

  const addQuestion = (): void =>
    update({ ...working, questions: [...working.questions, emptyQuestion()] });

  const deleteQuestion = (qi: number): void => {
    const next = working.questions.filter((_, i) => i !== qi);
    update({
      ...working,
      questions: next.length > 0 ? next : [emptyQuestion()],
    });
  };

  const addChoice = (qi: number): void => {
    const q = working.questions[qi];
    if (!q || q.choices.length >= MAX_CHOICES) return;
    updateQuestion(qi, { choices: [...q.choices, { id: makeId(), label: withBoth('') }] });
  };

  const deleteChoice = (qi: number, ci: number): void => {
    const q = working.questions[qi];
    if (!q || q.choices.length <= MIN_CHOICES) return;
    const removed = q.choices[ci];
    const choices = q.choices.filter((_, j) => j !== ci);
    const correctChoiceId = removed && q.correctChoiceId === removed.id ? '' : q.correctChoiceId;
    updateQuestion(qi, { choices, correctChoiceId });
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-[family-name:var(--font-display)] text-[length:var(--text-xl)] font-bold tracking-tight text-[var(--color-ink)]">
          {t('title')}
        </h2>
        <p className="text-sm text-[var(--color-ink-2)]">{t('description')}</p>
      </header>

      {/* Attach toggle — the admin's primary control over visibility. */}
      <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <input
          id="quiz-attach"
          type="checkbox"
          checked={working.attached}
          disabled={isSaving}
          onChange={(e) => setAttached(e.target.checked)}
          className="mt-1 size-5 accent-[var(--color-brand-600)]"
        />
        <label htmlFor="quiz-attach" className="flex-1 cursor-pointer space-y-0.5">
          <span className="block text-sm font-semibold text-[var(--color-ink)]">
            {t('attachedLabel')}
          </span>
          <span className="block text-sm text-[var(--color-ink-2)]">{t('attachedHelp')}</span>
        </label>
      </div>

      {/* Question list */}
      <ol className="space-y-4">
        {working.questions.map((q, qi) => (
          <li
            key={q.id}
            className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]"
          >
            <header className="flex items-start gap-3 border-b border-[var(--color-line)] bg-[var(--color-wash)] px-4 py-3">
              <span className="mt-2 flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-tint)] text-sm font-bold text-[var(--color-brand-700)]">
                {qi + 1}
              </span>
              <div className="flex-1 space-y-1">
                <label
                  htmlFor={`q-${q.id}-prompt`}
                  className="block text-sm font-semibold uppercase text-[var(--color-ink-3)]"
                >
                  Question
                </label>
                <input
                  id={`q-${q.id}-prompt`}
                  type="text"
                  value={q.prompt.en}
                  onChange={(e) => updatePrompt(qi, e.target.value)}
                  placeholder={t('promptPlaceholder')}
                  disabled={isSaving}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] placeholder:font-normal placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-tint)]"
                />
                {q.choices.every((c) => !c.label.en.trim()) ? null : !q.correctChoiceId ? (
                  <p className="pt-1 text-sm font-medium text-[var(--color-warn-ink)]">
                    {t('noCorrect')}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => deleteQuestion(qi)}
                disabled={isSaving}
                aria-label={t('deleteQuestion')}
                className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-3)] hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)] disabled:opacity-50"
              >
                <LuTrash2 className="size-4" aria-hidden="true" />
              </button>
            </header>

            <ul className="space-y-2 p-3">
              {q.choices.map((c, ci) => {
                const isCorrect = q.correctChoiceId === c.id;
                return (
                  <li key={c.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrect(qi, ci)}
                      disabled={isSaving}
                      aria-pressed={isCorrect}
                      aria-label={t('markCorrect')}
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors',
                        isCorrect
                          ? 'border-[var(--color-ok)] bg-[var(--color-ok-tint)] text-[var(--color-ok)]'
                          : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-transparent hover:border-[var(--color-ink-3)]',
                      )}
                    >
                      {isCorrect ? <LuCheck className="size-4" aria-hidden="true" /> : <LuCircle className="size-4" aria-hidden="true" />}
                    </button>
                    <input
                      type="text"
                      value={c.label.en}
                      onChange={(e) => updateChoice(qi, ci, e.target.value)}
                      placeholder={t('choicePlaceholder', { n: ci + 1 })}
                      disabled={isSaving}
                      className={cn(
                        'flex-1 rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:outline-none focus:ring-2',
                        isCorrect
                          ? 'border-[var(--color-ok)] focus:border-[var(--color-ok)] focus:ring-[var(--color-ok-tint)]'
                          : 'border-[var(--color-line-2)] focus:border-[var(--color-ring)] focus:ring-[var(--color-brand-tint)]',
                      )}
                    />
                    {q.choices.length > MIN_CHOICES ? (
                      <button
                        type="button"
                        onClick={() => deleteChoice(qi, ci)}
                        disabled={isSaving}
                        aria-label={t('deleteOption')}
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-3)] hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)] disabled:opacity-50"
                      >
                        <LuTrash2 className="size-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </li>
                );
              })}
              {q.choices.length < MAX_CHOICES ? (
                <li className="pt-1">
                  <button
                    type="button"
                    onClick={() => addChoice(qi)}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[var(--color-brand-700)] hover:bg-[var(--color-brand-tint)] disabled:opacity-50"
                  >
                    <LuPlus className="size-4" aria-hidden="true" />
                    {t('addOption')}
                  </button>
                </li>
              ) : null}
            </ul>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={addQuestion}
        disabled={isSaving}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] py-3 text-sm font-semibold text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-ring)] hover:bg-[var(--color-brand-tint)] hover:text-[var(--color-brand-700)] disabled:opacity-50"
      >
        <LuPlus className="size-4" aria-hidden="true" />
        {t('addQuestion')}
      </button>
    </div>
  );
}

function makeBlankQuiz(): ProcedureQuiz {
  return { questions: [emptyQuestion()], attached: false };
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2, 10)}`;
}
