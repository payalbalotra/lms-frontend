import * as React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { listProcedures, ApiException } from '@/lib/api';
import type { Procedure } from '@/lib/types';

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

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let procedures: Procedure[] = [];
  let loadError: string | null = null;
  try {
    const result = await listProcedures({}, cookieHeader);
    procedures = result.procedures;
  } catch (err) {
    if (err instanceof ApiException) {
      loadError = err.code;
    } else {
      throw err;
    }
  }

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

      {loadError ? (
        <p role="alert" className="text-sm text-[var(--color-bad)]">
          {loadError}
        </p>
      ) : procedures.length === 0 ? (
        <EmptyLibrary heading={t('emptyHeading')} body={t('emptyBody')} />
      ) : (
        <ProcedureList procedures={procedures} locale={locale} />
      )}
    </div>
  );
}

// Pick the localised label from the joined category. Empty when category is
// null (archived or never assigned). Returns an em dash so the row stays
// visually balanced.
function categoryLabel(proc: Procedure, locale: string): string {
  if (!proc.category) return '—';
  return locale === 'es' ? proc.category.nameEs : proc.category.nameEn;
}

function ProcedureList({
  procedures,
  locale,
}: {
  procedures: Procedure[];
  locale: string;
}): React.ReactElement {
  return (
    <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
      {procedures.map((p) => (
        <li key={p.id} className="flex items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="truncate text-[length:var(--text-sm)] font-semibold text-[var(--color-ink)]">
                {p.titleEn || p.titleEs || p.slug}
              </p>
              {p.status === 'draft' ? (
                <span className="inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--color-warn-tint)] px-2 py-0.5 text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-warn-ink)]">
                  Draft
                </span>
              ) : (
                <span className="inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--color-ok-tint)] px-2 py-0.5 text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-ok-ink)]">
                  Published
                </span>
              )}
            </div>
            <p className="text-[length:var(--text-xs)] text-[var(--color-ink-2)]">
              {categoryLabel(p, locale)} · Updated{' '}
              {new Date(p.updatedAt).toLocaleString()}
            </p>
          </div>
          <Link
            href={`/procedures/${p.slug}`}
            className="text-[length:var(--text-sm)] font-medium text-[var(--color-brand-700)] underline-offset-4 hover:underline"
          >
            View
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ToolbarStub({
  placeholder,
  filterLabel,
}: {
  placeholder: string;
  filterLabel: string;
}): React.ReactElement {
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
