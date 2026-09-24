import * as React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LuChevronRight, LuGraduationCap } from 'react-icons/lu';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusPill } from '@/components/ui/status-pill';
import { ApiException, fetchMe } from '@/lib/api';
import {
  courseStepCount,
  getTrainingRowsForEmployee,
  mockTrainingEmployees,
} from '@/lib/mock-training';
import type { TrainingAssignmentRow, TrainingAssignmentStatus } from '@/lib/types';
import { TabBar } from '@/components/employee/tab-bar';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

// Status tone — overdue bad, complete ok, everything else warn (DESIGN.md §3.3).
function pillTone(s: TrainingAssignmentStatus): 'warn' | 'ok' | 'bad' {
  if (s === 'overdue') return 'bad';
  if (s === 'complete') return 'ok';
  return 'warn';
}

function daysFromNow(iso: string, now: number): number {
  return Math.ceil((new Date(iso).getTime() - now) / (24 * 60 * 60 * 1000));
}

function dueText(
  due: string,
  now: number,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const days = daysFromNow(due, now);
  if (days < 0) return t('statusOverdue');
  if (days === 0) return t('statusDueToday');
  if (days === 1) return t('statusDueTomorrow');
  return t('statusDueInDays', { days });
}

function statusLabel(
  s: TrainingAssignmentStatus,
  due: string,
  now: number,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  if (s === 'complete') return t('statusComplete');
  if (s === 'overdue') return t('statusOverdue');
  if (s === 'in_progress') return t('statusInProgress');
  const days = daysFromNow(due, now);
  if (days <= 0) return t('statusDueToday');
  if (days === 1) return t('statusDueTomorrow');
  return t('statusDueInDays', { days });
}

export default async function EmployeeTrainingPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('employee.training');

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let employee;
  try {
    const me = await fetchMe(cookieHeader);
    employee = me.employee;
  } catch (err) {
    if (err instanceof ApiException) redirect(`/${locale}/login`);
    throw err;
  }

  // The mock employee id is derived from the real employee record by matching
  // the name — a temporary bridge until the backend wires assignments to the
  // auth identity. If we don't find a mock match, fall back to the first mock
  // employee so the screen still has rows to render.
  const matched =
    mockTrainingEmployees.find((e) => e.id === employee.id) ??
    mockTrainingEmployees.find((e) => e.name.toLowerCase() === employee.name.toLowerCase());
  const mockEmployeeId = matched?.id ?? employee.id;

  const now = Date.now();
  const rows = getTrainingRowsForEmployee(mockEmployeeId, new Date(now));
  const isEs = locale === 'es';

  const titleOf = (r: TrainingAssignmentRow): string => {
    const c = r.course;
    return (isEs ? c.titleEs || c.titleEn : c.titleEn || c.titleEs) || c.slug;
  };

  const continueRows: TrainingAssignmentRow[] = [];
  const assignedRows: TrainingAssignmentRow[] = [];
  const complete: TrainingAssignmentRow[] = [];
  const DUE_SOON_DAYS = 3;
  for (const r of rows) {
    if (r.effectiveStatus === 'complete') {
      complete.push(r);
      continue;
    }
    if (
      r.effectiveStatus === 'overdue' ||
      r.effectiveStatus === 'in_progress'
    ) {
      continueRows.push(r);
      continue;
    }
    // status === 'due': split between "Continue" (due within the next 3 days,
    // also surfaced on Home's Training section) and "Assigned" (the longer bag).
    const days = daysFromNow(r.assignment.dueAt, now);
    if (days <= DUE_SOON_DAYS) continueRows.push(r);
    else assignedRows.push(r);
  }
  // Continue sorts by urgency: overdue first, then earliest dueAt, then in-progress.
  continueRows.sort((a, b) => {
    const rank = (s: TrainingAssignmentStatus): number =>
      s === 'overdue' ? 0 : s === 'due' ? 1 : 2;
    const ra = rank(a.effectiveStatus);
    const rb = rank(b.effectiveStatus);
    if (ra !== rb) return ra - rb;
    return new Date(a.assignment.dueAt).getTime() - new Date(b.assignment.dueAt).getTime();
  });
  assignedRows.sort(
    (a, b) => new Date(a.assignment.dueAt).getTime() - new Date(b.assignment.dueAt).getTime(),
  );

  const empty = rows.length === 0;
  const overdueCount = rows.filter((r) => r.effectiveStatus === 'overdue').length;
  const pct = rows.length ? Math.round((complete.length / rows.length) * 100) : 0;

  return (
    <>
      <main className="mx-auto w-full max-w-doc space-y-8 px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        {/* No eyebrow: the tab bar below already says Training, and so does
            the heading. */}
        <header className="space-y-1">
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold leading-display tracking-tight text-[var(--color-ink)] sm:text-2xl">
            {t('heading')}
          </h1>
          <p className="text-base text-[var(--color-ink-2)]">{t('subtitle')}</p>
        </header>

        {/* How much you have, how much you have done: the question this tab
            exists to answer, so it comes before any list. */}
        {empty ? null : (
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <p className="flex flex-wrap items-baseline gap-x-2 text-base">
              <span className="font-semibold text-[var(--color-ink)]">
                {t('progressLine', { done: complete.length, total: rows.length })}
              </span>
              {overdueCount ? (
                <span className="font-semibold text-[var(--color-bad)]">· {t('overdueLine', { count: overdueCount })}</span>
              ) : null}
            </p>
            <div
              role="progressbar"
              aria-label={t('progressLine', { done: complete.length, total: rows.length })}
              aria-valuemin={0}
              aria-valuemax={rows.length}
              aria-valuenow={complete.length}
              className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-panel)]"
            >
              <div className="h-full rounded-full bg-[var(--color-ok-fill)]" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {empty ? (
          <EmptyState icon={LuGraduationCap} title={t('emptyHeading')} body={t('emptyBody')} />
        ) : (
          <>
            {continueRows.length > 0 ? (
              <TrainingSection
                title={t('sectionContinue')}
                countLabel={t('countSummary', { count: continueRows.length })}
                rows={continueRows}
                titleOf={titleOf}
                locale={locale}
                now={now}
                t={t}
              />
            ) : null}

            {assignedRows.length > 0 ? (
              <TrainingSection
                title={t('sectionAssigned')}
                countLabel={t('countSummary', { count: assignedRows.length })}
                rows={assignedRows}
                titleOf={titleOf}
                locale={locale}
                now={now}
                t={t}
              />
            ) : null}

            {complete.length > 0 ? (
              <TrainingSection
                title={t('sectionComplete')}
                countLabel={t('countSummary', { count: complete.length })}
                rows={complete}
                titleOf={titleOf}
                locale={locale}
                now={now}
                t={t}
              />
            ) : null}
          </>
        )}
      </main>

      <TabBar
        locale={locale}
        active="training"
        labels={{
          home: t('tabHome'),
          procedures: t('tabProcedures'),
          training: t('tabTraining'),
          soon: t('tabSoon'),
          nav: t('tabsNav'),
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// TrainingSection — one labelled list per status group. Pill rendering is
// done inline so this stays a server component.
// ---------------------------------------------------------------------------

function TrainingSection({
  title,
  countLabel,
  rows,
  titleOf,
  locale,
  now,
  t,
}: {
  title: string;
  countLabel: string;
  rows: TrainingAssignmentRow[];
  titleOf: (r: TrainingAssignmentRow) => string;
  locale: string;
  now: number;
  t: (key: string, vars?: Record<string, string | number>) => string;
}): React.ReactElement {
  const sectionId = `section-${title.replace(/\s+/g, '-')}`;
  return (
    <section aria-labelledby={sectionId} className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id={sectionId}
          className="text-lg font-semibold leading-heading text-[var(--color-ink)]"
        >
          {title}
        </h2>
        <span className="text-base font-medium text-[var(--color-ink-2)]">{countLabel}</span>
      </div>

      <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
        {rows.map((r) => {
          const tone = pillTone(r.effectiveStatus);
          const label = statusLabel(r.effectiveStatus, r.assignment.dueAt, now, t);
          const steps = courseStepCount(r.course);
          const done = r.assignment.completedStepIds.length;
          // One line of facts under the title: where you are, and when it is due
          // or when you finished. The purpose was cut to two broken lines here;
          // it is on the course page, where there is room to read it.
          const facts = [
            r.effectiveStatus === 'in_progress' && steps ? t('stepsDone', { done: Math.min(done, steps), total: steps }) : null,
            // The pill already says overdue, and "due in n days" for one not begun.
            r.effectiveStatus === 'in_progress' ? dueText(r.assignment.dueAt, now, t) : null,
            r.effectiveStatus === 'complete' && (r.assignment.acknowledgedAt ?? r.assignment.quizPassedAt)
              ? t('finishedOn', {
                  date: new Date((r.assignment.acknowledgedAt ?? r.assignment.quizPassedAt)!).toLocaleDateString(locale, {
                    day: 'numeric',
                    month: 'short',
                  }),
                })
              : null,
            r.effectiveStatus === 'complete' && r.assignment.quizPassedAt ? t('quizPassed') : null,
          ].filter(Boolean);
          return (
            <li key={r.assignment.id}>
              <Link
                href={`/${locale}/employee/training/${r.course.id}`}
                className="flex min-h-tap items-center gap-3 px-4 py-4 transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-wash)]"
              >
                <div className="min-w-0 flex-1">
                  {/* The whole title: beside the pill it was cut to "Fund…". */}
                  <p className="text-md font-semibold leading-heading text-[var(--color-ink)]">{titleOf(r)}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--color-ink-2)]">
                    <StatusPill tone={tone} withDot>
                      {label}
                    </StatusPill>
                    {facts.join(' · ')}
                  </p>
                </div>
                <LuChevronRight aria-hidden="true" className="shrink-0 text-xl text-[var(--color-ink-3)]" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
