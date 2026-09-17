import * as React from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

/**
 * RecentlyPublishedList — DESIGN.md §3.4 .chapter row pattern, admin density.
 *
 * Five most recently published procedures, location-scoped. Empty state
 * is honest: the library starts with the first publish, so we say so.
 *
 * Stage 2 status: this list is empty until the SOP Library ships. The
 * card header always renders so when the endpoint lands the panel
 * fills in without changing the page.
 */
export interface RecentlyPublishedRow {
  id: string;
  title: string;
  categoryName: string;
  version: number;
  publishedAt: Date;
  publishedBy: string;
}

interface RecentlyPublishedListProps {
  locale: string;
  rows: RecentlyPublishedRow[];
  className?: string;
}

export async function RecentlyPublishedList({
  locale,
  rows,
  className,
}: RecentlyPublishedListProps): Promise<React.ReactElement> {
  const t = await getTranslations('admin.dashboard');
  const visible = rows.slice(0, 5);

  return (
    <section className={cn('space-y-3', className)} aria-labelledby="dashboard-recent-published">
      <header className="flex items-baseline justify-between gap-3">
        <h2
          id="dashboard-recent-published"
          className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] font-bold tracking-[-0.02em] text-[var(--color-ink)]"
        >
          {t('recentlyPublished')}
        </h2>
        {rows.length > 5 ? (
          <Link
            href={`/${locale}/admin/library`}
            className="text-[length:var(--text-sm)] font-semibold text-[var(--color-brand-700)] hover:text-[var(--color-brand-600)]"
          >
            {t('recentlyPublishedSeeAll')} →
          </Link>
        ) : null}
      </header>

      {visible.length === 0 ? (
        <div
          className={cn(
            'rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)]',
            'bg-[var(--color-surface)] px-6 py-8 text-center',
          )}
        >
          <i
            aria-hidden="true"
            className="ri-book-3-line mb-2 block text-[length:var(--text-2xl)] text-[var(--color-ink-3)]"
          />
          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            {t('recentlyPublishedEmpty')}
          </p>
        </div>
      ) : (
        <RowList rows={visible} locale={locale} />
      )}
    </section>
  );
}

/**
 * RowList is its own async server component so it can pull translations
 * without threading them through props. Renders DESIGN.md §3.4 .chapter
 * rows at admin density: 36px tap, hairline border, no shadow at rest.
 */
async function RowList({
  rows,
  locale,
}: {
  rows: RecentlyPublishedRow[];
  locale: string;
}): Promise<React.ReactElement> {
  const t = await getTranslations('admin.dashboard');
  return (
    <ul className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
      {rows.map((row) => (
        <li key={row.id} className="border-b border-[var(--color-line)] last:border-b-0">
          <Link
            href={`/${locale}/admin/library/${row.id}`}
            className={cn(
              'group flex min-h-[var(--tap-admin)] items-center gap-4 px-5 py-3',
              'transition-colors duration-[180ms] ease-[var(--ease)]',
              'hover:bg-[var(--color-panel)]',
              'focus-visible:outline-none focus-visible:bg-[var(--color-panel)]',
            )}
          >
            <span
              aria-hidden="true"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-panel)] text-[var(--color-ink-2)]"
            >
              <i className="ri-file-list-3-line text-[length:var(--text-md)]" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[length:var(--text-sm)] font-semibold text-[var(--color-ink)]">
                {row.title}
              </span>
              <span className="truncate text-[length:var(--text-xs)] text-[var(--color-ink-2)]">
                {row.categoryName} · {t('versionN', { version: row.version })} ·{' '}
                {formatDate(row.publishedAt)} · {t('publishedAtBy', { name: row.publishedBy })}
              </span>
            </div>
            <i
              aria-hidden="true"
              className="ri-arrow-right-s-line text-[length:var(--text-lg)] text-[var(--color-ink-3)] transition-colors duration-[180ms] ease-[var(--ease)] group-hover:text-[var(--color-brand-700)]"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

const DATE_FORMATTER = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' });

function formatDate(when: Date): string {
  try {
    return DATE_FORMATTER.format(when);
  } catch {
    return when.toISOString().slice(0, 10);
  }
}