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
  const matched = mockTrainingEmployees.find(
    (e) => e.name.toLowerCase() === employee.name.toLowerCase(),
  );
  const mockEmployeeId = matched?.id ?? mockTrainingEmployees[0]?.id ?? 'emp-001';

  const now = Date.now();
  const rows = getTrainingRowsForEmployee(mockEmployeeId, new Date(now));
  const isEs = locale === 'es';

  const titleOf = (r: TrainingAssignmentRow): string => {
    const c = r.course;
    return (isEs ? c.titleEs || c.titleEn : c.titleEn || c.titleEs) || c.slug;
  };
  const purposeOf = (r: TrainingAssignmentRow): string => {
    const c = r.course;
    return (isEs ? c.purposeEs || c.purposeEn : c.purposeEn || c.purposeEs) || '';
  };

  const due = rows.filter((r) => r.effectiveStatus === 'due');
  const inProgress = rows.filter((r) => r.effectiveStatus === 'in_progress');
  const complete = rows.filter((r) => r.effectiveStatus === 'complete');
  const overdue = rows.filter((r) => r.effectiveStatus === 'overdue');

  // "Now" as the cook sees it = overdue + due. Overdue rides in the same
  // section so the cook only has to look in one place for "what to do now".
  const active = [...overdue, ...due];

  const empty = rows.length === 0;

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

        {empty ? (
          <EmptyState icon={LuGraduationCap} title={t('emptyHeading')} body={t('emptyBody')} />
        ) : (
          <>
            {active.length > 0 ? (
              <TrainingSection
                title={t('sectionDue')}
                countLabel={t('countSummary', { count: active.length })}
                rows={active}
                titleOf={titleOf}
                purposeOf={purposeOf}
                locale={locale}
                now={now}
                t={t}
              />
            ) : null}

            {inProgress.length > 0 ? (
              <TrainingSection
                title={t('sectionInProgress')}
                countLabel={t('countSummary', { count: inProgress.length })}
                rows={inProgress}
                titleOf={titleOf}
                purposeOf={purposeOf}
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
                purposeOf={purposeOf}
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
          ask: t('tabAsk'),
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
  purposeOf,
  locale,
  now,
  t,
}: {
  title: string;
  countLabel: string;
  rows: TrainingAssignmentRow[];
  titleOf: (r: TrainingAssignmentRow) => string;
  purposeOf: (r: TrainingAssignmentRow) => string;
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
          return (
            <li key={r.assignment.id}>
              <Link
                href={`/${locale}/employee/training/${r.course.id}`}
                className="flex min-h-tap items-center gap-3 px-4 py-3 transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-wash)]"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-panel)] text-[var(--color-ink-2)]"
                >
                  <LuGraduationCap aria-hidden="true" className="text-xl" />
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-md font-semibold leading-heading text-[var(--color-ink)]">
                    {titleOf(r)}
                  </p>
                  {purposeOf(r) ? (
                    <p className="line-clamp-2 text-base leading-meta text-[var(--color-ink-2)]">
                      {purposeOf(r)}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill tone={tone} withDot>
                    {label}
                  </StatusPill>
                  <LuChevronRight aria-hidden="true" className="text-xl text-[var(--color-ink-3)]" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
