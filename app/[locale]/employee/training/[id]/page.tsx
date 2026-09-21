import * as React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LuArrowLeft, LuBookOpen, LuChevronRight, LuGraduationCap, LuSignature } from 'react-icons/lu';
import { ApiException, fetchMe } from '@/lib/api';
import {
  effectiveStatus,
  getCourseById,
  listLinkedSops,
  listTrainingAssignmentsForEmployee,
  mockTrainingEmployees,
} from '@/lib/mock-training';
import { TabBar } from '@/components/employee/tab-bar';
import { BlockRenderer } from '@/components/doc/block-renderer';
import { QuizReader } from '@/components/doc/quiz-reader';
import { Icon } from '@/components/ui/icon';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export const dynamic = 'force-dynamic';

function daysFromNow(iso: string, now: number): number {
  return Math.ceil((new Date(iso).getTime() - now) / (24 * 60 * 60 * 1000));
}

function pillTone(
  s: 'due' | 'in_progress' | 'complete' | 'overdue',
): 'warn' | 'ok' | 'bad' {
  if (s === 'overdue') return 'bad';
  if (s === 'complete') return 'ok';
  return 'warn';
}

function statusLabel(
  s: 'due' | 'in_progress' | 'complete' | 'overdue',
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

export default async function EmployeeTrainingCoursePage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('employee.training');

  const course = getCourseById(id);
  if (!course) notFound();

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

  const matched = mockTrainingEmployees.find(
    (e) => e.name.toLowerCase() === employee.name.toLowerCase(),
  );
  const mockEmployeeId = matched?.id ?? mockTrainingEmployees[0]?.id ?? 'emp-001';

  const now = Date.now();
  const assignment = listTrainingAssignmentsForEmployee(mockEmployeeId).find(
    (a) => a.courseId === id,
  );

  const isEs = locale === 'es';
  const localeForBlocks: 'en' | 'es' = isEs ? 'es' : 'en';
  const title = (isEs ? course.titleEs || course.titleEn : course.titleEn || course.titleEs) || course.slug;
  const purpose = (isEs ? course.purposeEs || course.purposeEn : course.purposeEn || course.purposeEs) || '';
  const blocks = isEs ? course.bodyEs.blocks : course.bodyEn.blocks;
  const linkedSops = listLinkedSops(course);

  const status = assignment ? effectiveStatus(assignment) : 'due';
  const tone = pillTone(status);
  const toneCls =
    tone === 'ok'
      ? 'bg-[var(--color-ok-tint)] text-[var(--color-ok)] border-[var(--color-ok)]/30'
      : tone === 'bad'
        ? 'bg-[var(--color-bad-tint)] text-[var(--color-bad)] border-[var(--color-bad)]/30'
        : 'bg-[var(--color-warn-tint)] text-[var(--color-warn-ink)] border-[var(--color-warn)]/30';

  const dueLabel = assignment
    ? statusLabel(status, assignment.dueAt, now, t)
    : '';

  return (
    <>
      <main className="mx-auto w-full max-w-doc space-y-8 px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <Link
          href={`/${locale}/employee/training`}
          className="inline-flex min-h-tap items-center gap-2 text-base font-semibold text-[var(--color-ink-2)]"
        >
          <LuArrowLeft aria-hidden="true" />
          {t('backToList')}
        </Link>

        <header className="space-y-3">
          <p className="text-sm font-semibold leading-meta text-[var(--color-ink-2)]">
            {t('courseEyebrow')}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold leading-display tracking-tight text-[var(--color-ink)] sm:text-2xl">
            {title}
          </h1>
          {purpose ? (
            <p className="text-base text-[var(--color-ink-2)]">{purpose}</p>
          ) : null}
          {assignment ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span
                className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-sm font-semibold ${toneCls}`}
              >
                {dueLabel}
              </span>
            </div>
          ) : null}
        </header>

        {/* Body — same block vocabulary as the procedure reader (DESIGN.md §4
            says training chapters share the same block vocabulary as SOPs). */}
        <div className="space-y-8">
          <BlockRenderer blocks={blocks} locale={localeForBlocks} />

          {course.quiz?.attached && course.quiz.questions.length > 0 ? (
            <section className="space-y-4">
              <header className="flex items-center gap-2">
                <Icon icon={LuGraduationCap} className="text-xl text-[var(--color-brand-700)]" aria-hidden="true" />
                <h2 className="font-[family-name:var(--font-ui)] text-lg font-semibold text-[var(--color-ink)]">
                  {t('quizHeading')}
                </h2>
              </header>
              <QuizReader quiz={course.quiz} locale={localeForBlocks} />
            </section>
          ) : null}

          {linkedSops.length > 0 ? (
            <section className="space-y-3">
              <header className="flex items-center gap-2">
                <Icon icon={LuBookOpen} className="text-xl text-[var(--color-brand-700)]" aria-hidden="true" />
                <h2 className="font-[family-name:var(--font-ui)] text-lg font-semibold text-[var(--color-ink)]">
                  {t('linkedSopsHeading')}
                </h2>
              </header>
              <p className="text-base text-[var(--color-ink-2)]">{t('linkedSopsHint')}</p>
              <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
                {linkedSops.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/${locale}/procedures/${s.id}`}
                      className="flex min-h-tap items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-wash)]"
                    >
                      <span
                        aria-hidden="true"
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-panel)] text-[var(--color-ink-2)]"
                      >
                        <LuBookOpen aria-hidden="true" className="text-md" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-md font-semibold text-[var(--color-ink)]">
                          {(isEs ? s.titleEs || s.titleEn : s.titleEn || s.titleEs) || s.slug}
                        </p>
                        {s.purposeEn || s.purposeEs ? (
                          <p className="line-clamp-2 text-base text-[var(--color-ink-2)]">
                            {(isEs ? s.purposeEs || s.purposeEn : s.purposeEn || s.purposeEs) || ''}
                          </p>
                        ) : null}
                      </div>
                      <LuChevronRight aria-hidden="true" className="text-xl text-[var(--color-ink-3)]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {course.acknowledgement ? (
            <section className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-brand-600)]/30 bg-[var(--color-brand-tint)]/40 p-5">
              <header className="flex items-center gap-2">
                <Icon icon={LuSignature} className="text-xl text-[var(--color-brand-700)]" aria-hidden="true" />
                <h2 className="font-[family-name:var(--font-ui)] text-lg font-semibold text-[var(--color-ink)]">
                  {t('ackHeading', { version: course.acknowledgement.versionLabel })}
                </h2>
              </header>
              <p className="text-base text-[var(--color-ink)]">
                {(isEs
                  ? course.acknowledgement.statement.es || course.acknowledgement.statement.en
                  : course.acknowledgement.statement.en || course.acknowledgement.statement.es) || ''}
              </p>
              <label className="flex min-h-tap cursor-pointer items-start gap-3 rounded-md bg-[var(--color-surface)] p-3 text-base">
                <input
                  type="checkbox"
                  className="mt-0.5 size-5 shrink-0 accent-[var(--color-brand-600)]"
                  defaultChecked={Boolean(assignment?.acknowledgedAt)}
                  disabled={Boolean(assignment?.acknowledgedAt)}
                  aria-label={t('ackCheckboxLabel')}
                />
                <span className="flex-1 text-[var(--color-ink)]">
                  {t('ackCheckboxText')}
                </span>
              </label>
              {assignment?.acknowledgedAt ? (
                <p className="text-sm text-[var(--color-ink-2)]">
                  {t('ackSignedAt', {
                    when: new Date(assignment.acknowledgedAt).toLocaleString(
                      isEs ? 'es' : 'en',
                      { dateStyle: 'medium', timeStyle: 'short' },
                    ),
                  })}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>
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
