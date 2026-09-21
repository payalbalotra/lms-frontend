'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { TrainingCourseRow } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RowActions } from '@/components/ui/row-actions';
import { StatusPill } from '@/components/ui/status-pill';
import { LuArrowRight, LuCircleCheck, LuClock, LuFilePen, LuFilter, LuRefreshCw, LuSearch, LuUserPlus, LuX } from 'react-icons/lu';

interface TrainingCourseExplorerProps {
  locale: string;
  rows: TrainingCourseRow[];
}

/**
 * The training courses that exist for this location, plus the live counts
 * of assignments per status. Filterable by title; the rest of the explorer
 * stays single-page — there's at most a dozen courses for any given location.
 */
export function TrainingCourseExplorer({
  locale,
  rows,
}: TrainingCourseExplorerProps): React.ReactElement {
  const t = useTranslations('admin.training');
  const tCommon = useTranslations('admin');
  const router = useRouter();
  const isEs = locale === 'es';

  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredRows = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const title = (isEs ? r.course.titleEs || r.course.titleEn : r.course.titleEn || r.course.titleEs).toLowerCase();
      return title.includes(q);
    });
  }, [rows, searchQuery, isEs]);

  function handleAssign(courseId: string): void {
    router.push(`/${locale}/admin/training/${courseId}/assign`);
  }

  function handleArchive(courseId: string): void {
    // The real archive call is wired up to the backend once the route exists;
    // the explorer confirms the action so it can never be one tap away.
    console.info('[training] archive course (mock)', courseId);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-3">
        <div className="relative flex-1 min-w-64">
          <LuSearch aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-3)]" />
          <Input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-tap-admin pl-10 pr-8 text-xs"
            aria-label={t('searchLabel')}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label={t('clearSearch')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
            >
              <LuX aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <span className="text-xs font-medium text-[var(--color-ink-2)]">
          {t('countSummary', { total: rows.length, shown: filteredRows.length })}
        </span>
      </div>

      {searchQuery && (
        <div className="flex items-center justify-between rounded-lg bg-[var(--color-panel)] px-4 py-2 text-xs border border-[var(--color-line)]">
          <div className="flex items-center gap-2 text-[var(--color-ink-2)]">
            <LuFilter aria-hidden="true" />
            <span>
              {tCommon('filteredCount', {
                shown: filteredRows.length,
                total: rows.length,
              })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="flex items-center gap-1 font-semibold text-[var(--color-brand-700)] hover:underline"
          >
            <LuRefreshCw aria-hidden="true" />
            <span>{tCommon('clearFilters')}</span>
          </button>
        </div>
      )}

      {filteredRows.length === 0 ? (
        <article className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] px-6 py-16 text-center">
          <h2 className="font-[family-name:var(--font-ui)] text-base font-semibold text-[var(--color-ink)]">
            {t('noMatchHeading')}
          </h2>
          <p className="max-w-md text-xs text-[var(--color-ink-2)]">
            {t('noMatchBody')}
          </p>
        </article>
      ) : (
        <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
          {filteredRows.map((row) => {
            const title = (isEs
              ? row.course.titleEs || row.course.titleEn
              : row.course.titleEn || row.course.titleEs) || row.course.slug;
            const purpose = isEs
              ? row.course.purposeEs || row.course.purposeEn
              : row.course.purposeEn || row.course.purposeEs;
            const hasQuiz = row.course.quiz?.questions?.length ? row.course.quiz.questions.length > 0 : false;
            const status = row.course.status;
            const overdueRow = row.overdueCount > 0;
            const lastUpdatedLabel = new Date(row.course.updatedAt).toLocaleDateString(
              isEs ? 'es' : 'en',
              { year: 'numeric', month: 'short', day: 'numeric' },
            );

            return (
              <li
                key={row.course.id}
                className="group flex flex-col gap-4 p-4 transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-wash)] md:flex-row md:items-center"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-[family-name:var(--font-ui)] text-sm font-semibold tracking-snug text-[var(--color-ink)] group-hover:text-[var(--color-brand-700)]">
                      {title}
                    </h3>

                    <StatusPill tone={hasQuiz ? 'info' : 'neutral'}>
                      {hasQuiz ? t('quizAttached') : t('noQuiz')}
                    </StatusPill>

                    {status === 'draft' ? (
                      <StatusPill tone="neutral">
                        <LuFilePen aria-hidden="true" className="text-xs" />
                        {t('statusDraft')}
                      </StatusPill>
                    ) : (
                      <StatusPill tone="ok">
                        <LuCircleCheck aria-hidden="true" className="text-xs" />
                        {t('statusPublished')}
                      </StatusPill>
                    )}
                  </div>

                  {purpose ? (
                    <p className="line-clamp-2 text-xs text-[var(--color-ink-2)] leading-relaxed">
                      {purpose}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-[var(--color-ink-3)]">
                    <span className="flex items-center gap-1">
                      <LuClock aria-hidden="true" />
                      {t('updatedAgo', { when: lastUpdatedLabel })}
                    </span>
                    <span>·</span>
                    <span>{t('totalAssigned', { count: row.assignmentCount })}</span>
                  </div>

                  {/* Per-status counts — uses StatusPill (rectangle, never pill)
                      to match the data-explorer density. DESIGN.md §3.6 forbids
                      overall completion % on the employee side; explicit counts
                      keep the manager informed without a forbidden summary. */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <StatusPill tone={overdueRow ? 'bad' : 'neutral'} withDot={overdueRow}>
                      {t('countOverdue', { count: row.overdueCount })}
                    </StatusPill>
                    <StatusPill tone="warn" withDot>
                      {t('countInProgress', { count: row.inProgressCount })}
                    </StatusPill>
                    <StatusPill tone="ok" withDot>
                      {t('countComplete', { count: row.completeCount })}
                    </StatusPill>
                  </div>
                </div>

                <div
                  className={cn(
                    'flex items-center gap-3 border-t border-[var(--color-line)] pt-4 md:border-t-0 md:pt-0',
                  )}
                >
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAssign(row.course.id)}
                    className="gap-2 font-semibold"
                  >
                    <LuUserPlus aria-hidden="true" className="text-sm" />
                    {t('assignAction')}
                  </Button>

                  <Link href={`/${locale}/admin/training/${row.course.id}/assign`} aria-hidden="true" tabIndex={-1} className="hidden">
                    {/* Visual target for crawlers — actual navigation handled by the button. */}
                  </Link>

                  <RowActions
                    triggerLabel={t('rowActionsLabel', { title })}
                    items={[
                      {
                        label: t('rowEdit'),
                        icon: LuArrowRight,
                        onSelect: () => router.push(`/${locale}/admin/training/${row.course.id}/edit`),
                      },
                      {
                        label: t('rowArchive'),
                        icon: LuFilePen,
                        destructive: true,
                        confirmLabel: t('rowArchiveConfirm'),
                        onSelect: () => handleArchive(row.course.id),
                      },
                    ]}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
