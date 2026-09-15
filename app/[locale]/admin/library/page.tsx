import * as React from 'react';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Admin Library — list of all procedures (manager view).
 *
 * Stage 2 status: the procedures list endpoint lands with the SOP Library.
 * For now we render an honest empty state — no fake rows — that names
 * exactly where to start when the endpoint ships.
 */

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

export default async function AdminLibraryPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.library');

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-brand-700)]">
            {t('pageEyebrow')}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-2xl)] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
            {t('pageTitle')}
          </h1>
          <p className="max-w-2xl text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            {t('pageSubtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/${locale}/admin/library/categories`}>
            <Button variant="secondary" size="sm">
              <i aria-hidden="true" className="ri-folders-line mr-1.5 text-[length:var(--text-md)]" />
              {t('manageCategories')}
            </Button>
          </Link>
          <Link href={`/${locale}/admin/library/new`}>
            <Button size="sm">
              <i aria-hidden="true" className="ri-add-line mr-1.5 text-[length:var(--text-md)]" />
              {t('newProcedure')}
            </Button>
          </Link>
        </div>
      </header>

      <ToolbarStub placeholder={t('searchPlaceholder')} filterLabel={t('filterAllCategories')} />

      <EmptyLibrary heading={t('emptyHeading')} body={t('emptyBody')} />
    </div>
  );
}

function ToolbarStub({
  placeholder,
  filterLabel,
}: {
  placeholder: string;
  filterLabel: string;
}): React.ReactElement {
  // The search + category filter row lands with the procedures endpoint.
  // For now, render the shape so the page never reflows when it ships.
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2">
      <div className="flex h-9 min-w-0 flex-1 items-center gap-2 px-3">
        <i aria-hidden="true" className="ri-search-line text-[var(--color-ink-3)]" />
        <span className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">{placeholder}</span>
      </div>
      <span
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)]',
          'border border-[var(--color-line)] bg-[var(--color-surface)] px-3',
          'text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]',
        )}
      >
        <i aria-hidden="true" className="ri-filter-3-line" />
        {filterLabel}
      </span>
    </div>
  );
}

function EmptyLibrary({
  heading,
  body,
}: {
  heading: string;
  body: string;
}): React.ReactElement {
  return (
    <article
      className={cn(
        'flex flex-col items-center gap-4 rounded-[var(--radius-lg)]',
        'border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)]',
        'px-6 py-16 text-center',
      )}
    >
      <span
        aria-hidden="true"
        className="inline-flex size-14 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]"
      >
        <i className="ri-book-3-line text-[length:var(--text-2xl)]" />
      </span>
      <div className="space-y-1">
        <h2 className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
          {heading}
        </h2>
        <p className="max-w-md text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          {body}
        </p>
      </div>
    </article>
  );
}