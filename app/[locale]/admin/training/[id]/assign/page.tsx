import * as React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LuArrowLeft, LuBookOpen, LuGraduationCap, LuSignature } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import { StatusPill } from '@/components/ui/status-pill';
import {
  getCourseById,
  listTrainingAssignmentsForCourse,
  listLinkedSops,
  mockTrainingEmployees,
} from '@/lib/mock-training';
import { AssignForm } from './assign-form';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AssignCoursePage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.training.assign');
  const tCourse = await getTranslations('admin.training');

  const course = getCourseById(id);
  if (!course) notFound();

  const isEs = locale === 'es';
  const title = (isEs ? course.titleEs : course.titleEn) || course.slug;
  const purpose = isEs ? course.purposeEs : course.purposeEn;
  const linkedSops = listLinkedSops(course);
  const assignments = listTrainingAssignmentsForCourse(course.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <Link
        href={`/${locale}/admin/training`}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
      >
        <Icon icon={LuArrowLeft} className="text-md" />
        {tCourse('backToList')}
      </Link>

      <header className="space-y-2">
        <p className="text-xs font-semibold text-[var(--color-ink-2)]">{t('eyebrow')}</p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--color-ink)]">
          {t('title', { course: title })}
        </h1>
        <p className="max-w-2xl text-sm text-[var(--color-ink-2)]">{t('subtitle')}</p>
      </header>

      <section className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]">
              <LuGraduationCap aria-hidden="true" className="text-md" />
            </span>
            <div className="min-w-0 space-y-1">
              <h2 className="font-[family-name:var(--font-ui)] text-md font-semibold text-[var(--color-ink)]">
                {title}
              </h2>
              {purpose ? (
                <p className="text-xs text-[var(--color-ink-2)]">{purpose}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {course.quiz?.questions?.length ? (
              <StatusPill tone="info">{tCourse('quizAttached')}</StatusPill>
            ) : (
              <StatusPill tone="neutral">{tCourse('noQuiz')}</StatusPill>
            )}
            {course.acknowledgement ? (
              <StatusPill tone="info">
                <Icon icon={LuSignature} className="text-xs" aria-hidden="true" />
                {t('ackRequired', { version: course.acknowledgement.versionLabel })}
              </StatusPill>
            ) : null}
            {linkedSops.length > 0 ? (
              <StatusPill tone="neutral">
                <Icon icon={LuBookOpen} className="text-xs" aria-hidden="true" />
                {t('linkedSopsCount', { count: linkedSops.length })}
              </StatusPill>
            ) : null}
          </div>
        </div>
      </section>

      <AssignForm
        locale={locale}
        courseId={course.id}
        employees={mockTrainingEmployees}
        existingAssignments={assignments}
      />
    </div>
  );
}
