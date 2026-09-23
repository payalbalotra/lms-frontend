'use client';

/**
 * QuizReader — the read-side quiz block on a procedure detail page.
 *
 * Visibility: the quiz renders when either `quiz.attached` is true OR the
 * procedure is part of a training plan (`attachedToTraining`). When the
 * procedure has a quiz but neither flag is on, admins see a one-click
 * "Attach quiz" banner above the document body.
 *
 * The reader mirrors the QuizEditor surface one-to-one: collapsed-by-default
 * accordion rows, click to expand, correct answer highlighted in ok-green
 * with a "Correct" badge. This keeps what the employee sees in lockstep with
 * what the admin authored — they read the same shape the admin built.
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { Localised, ProcedureQuiz } from '@/lib/types';
import { LuCheck, LuChevronRight, LuCircle, LuCircleCheck, LuMessageCircleQuestion } from 'react-icons/lu';

interface QuizReaderProps {
  quiz: ProcedureQuiz;
  locale: 'en' | 'es';
}

function pickText(v: Localised, locale: 'en' | 'es'): string {
  return v[locale] || v.en || v.es || '';
}

export function QuizReader({ quiz, locale }: QuizReaderProps): React.ReactElement {
  const t = useTranslations('employee.doc.quiz');
  const questions = quiz.questions;
  const [openId, setOpenId] = React.useState<string | null>(questions[0]?.id ?? null);

  return (
    <section className="doc-sec">
      <h2>
        {t('heading')}
        <span className="count">{' · '}{t('count', { count: questions.length })}</span>
      </h2>
      <p className="doc-purpose">{t('intro')}</p>

      <ol className="space-y-4">
        {questions.map((q, i) => {
          const isOpen = openId === q.id;
          return (
            <li
              key={q.id}
              className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]"
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : q.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-wash)]"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-line-2)] bg-[var(--color-surface)] text-sm font-semibold text-[var(--color-ink)]">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-semibold text-[var(--color-ink)]">
                  {pickText(q.prompt, locale)}
                </span>
                <span
                  className={cn(
                    'text-[var(--color-ink-3)] transition-transform',
                    isOpen && 'rotate-90',
                  )}
                  aria-hidden="true"
                >
                  <LuChevronRight />
                </span>
              </button>
              {isOpen && (
                <ul className="space-y-2 border-t border-[var(--color-line)] bg-[var(--color-wash)] p-3">
                  {q.choices.map((c) => {
                    const isCorrect = c.id === q.correctChoiceId;
                    return (
                      <li
                        key={c.id}
                        className={cn(
                          'flex items-start gap-3 rounded-md border px-3 py-2 text-sm',
                          isCorrect
                            ? 'border-[var(--color-ok)] bg-[var(--color-ok-tint)] text-[var(--color-ink)]'
                            : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)]',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 shrink-0',
                            isCorrect ? 'text-[var(--color-ok)]' : 'text-[var(--color-ink-3)]',
                          )}
                          aria-hidden="true"
                        >
                          {isCorrect ? <LuCircleCheck className="size-4" /> : <LuCircle className="size-4" />}
                        </span>
                        <span className="flex-1">{pickText(c.label, locale)}</span>
                        {isCorrect && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-ok-tint)] px-2 py-0.5 text-sm font-semibold uppercase text-[var(--color-ok)]">
                            <LuCheck className="size-3" aria-hidden="true" />
                            {t('correct')}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Banner shown to admins when the procedure has a quiz but neither
 *  `quiz.attached` nor `attachedToTraining` is true. One click flips the
 *  attached flag in the mock store (real backend call would PATCH the
 *  procedure). The banner is rendered above the document body so it's the
 *  first thing the admin notices. */
export function QuizAttachBanner({
  onAttach,
  onDismiss,
  isAttaching,
}: {
  onAttach: () => void;
  onDismiss: () => void;
  isAttaching?: boolean;
}): React.ReactElement {
  const t = useTranslations('employee.doc.quiz');
  return (
    <div
      role="status"
      className="mb-6 flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-warn)] bg-[var(--color-warn-tint)] p-4 shadow-e1"
    >
      <span className="mt-0.5 flex size-tap-admin shrink-0 items-center justify-center rounded-full bg-[var(--color-warn-tint)] text-[var(--color-warn-ink)]">
        <LuMessageCircleQuestion className="size-5" aria-hidden="true" />
      </span>
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-semibold text-[var(--color-warn-ink)]">{t('bannerTitle')}</p>
        <p className="text-sm text-[var(--color-warn-ink)]">{t('bannerBody')}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onDismiss}
          disabled={isAttaching}
          className="rounded-full px-3 py-2 text-sm font-semibold text-[var(--color-warn-ink)] hover:bg-[var(--color-warn-tint)] disabled:opacity-50"
        >
          {t('bannerDismiss')}
        </button>
        <button
          type="button"
          onClick={onAttach}
          disabled={isAttaching}
          className="rounded-full bg-[var(--color-warn-tint-2)] px-3 py-2 text-sm font-semibold text-[var(--color-warn-ink)] shadow-e1 hover:brightness-95 disabled:opacity-50"
        >
          {isAttaching ? t('bannerAttaching') : t('bannerAttach')}
        </button>
      </div>
    </div>
  );
}
