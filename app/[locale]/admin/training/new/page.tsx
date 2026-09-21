import * as React from 'react';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LuArrowLeft } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import { listAvailableSops } from '@/lib/mock-training';
import { NewCourseForm } from './new-course-form';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewCoursePage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.training');

  const availableSops = listAvailableSops();

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <Link
        href={`/${locale}/admin/training`}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
      >
        <Icon icon={LuArrowLeft} className="text-md" />
        {t('backToList')}
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[var(--color-ink-2)]">
            {t('pageEyebrow')}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--color-ink)]">
            {t('newCourseTitle')}
          </h1>
          <p className="max-w-2xl text-sm text-[var(--color-ink-2)]">
            {t('newCourseSubtitle')}
          </p>
        </div>
      </header>

      <NewCourseForm locale={locale} availableSops={availableSops} />
    </div>
  );
}
