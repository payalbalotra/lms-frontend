import * as React from 'react';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import {
  getTrainingCourseRowsForAdmin,
} from '@/lib/mock-training';
import { TrainingCourseExplorer } from './training-course-explorer';
import { LuGraduationCap, LuPlus } from 'react-icons/lu';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function AdminTrainingPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.training');

  const rows = getTrainingCourseRowsForAdmin();

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[var(--color-ink-2)]">
            {t('pageEyebrow')}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--color-ink)]">
            {t('pageTitle')}
          </h1>
          <p className="max-w-2xl text-sm text-[var(--color-ink-2)]">
            {t('pageSubtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/${locale}/admin/training/new`}>
            <Button size="sm">
              <LuPlus aria-hidden="true" className="mr-2 text-md" />
              {t('newCourse')}
            </Button>
          </Link>
        </div>
      </header>

      {rows.length === 0 ? (
        <EmptyTrainingList heading={t('emptyHeading')} body={t('emptyBody')} />
      ) : (
        <TrainingCourseExplorer locale={locale} rows={rows} />
      )}
    </div>
  );
}

function EmptyTrainingList({
  heading,
  body,
}: {
  heading: string;
  body: string;
}): React.ReactElement {
  return (
    <article className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] px-6 py-16 text-center">
      <span
        aria-hidden="true"
        className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--color-panel)] text-[var(--color-ink-2)]"
      >
        <LuGraduationCap className="text-2xl" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h2 className="font-[family-name:var(--font-ui)] text-lg font-semibold tracking-tight text-[var(--color-ink)]">
          {heading}
        </h2>
        <p className="max-w-md text-sm text-[var(--color-ink-2)]">
          {body}
        </p>
      </div>
    </article>
  );
}
