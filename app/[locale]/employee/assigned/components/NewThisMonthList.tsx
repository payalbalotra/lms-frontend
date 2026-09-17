import * as React from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

/**
 * NewThisMonthList — DESIGN.md §3.4 .chapter row, employee density.
 *
 * Procedures published or superseded within the current calendar month,
 * location-scoped, clearance-filtered server-side. Shows three compact
 * rows + a "See all" link. Empty state is a single line; no fake rows.
 */
export interface NewThisMonthRow {
  id: string;
  title: string;
  categoryName: string;
  version: number;
  publishedAt: Date;
}

interface NewThisMonthListProps {
  locale: string;
  rows: NewThisMonthRow[];
  className?: string;
}

const MONTH_FORMATTER = new Intl.DateTimeFormat('en', { month: 'short' });

function formatPublishedLabel(when: Date, fallback: (date: Date) => string): string {
  try {
    return MONTH_FORMATTER.format(when);
  } catch {
    return fallback(when);
  }
}

export async function NewThisMonthList({
  locale,
  rows,
  className,
}: NewThisMonthListProps): Promise<React.ReactElement> {
  const t = await getTranslations('employee.dashboard');
  const visible = rows.slice(0, 3);

  return (
    <section className={cn('space-y-3', className)} aria-labelledby="dashboard-new-month">
      <header className="flex items-baseline justify-between gap-3">
        <h2
          id="dashboard-new-month"
          className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] font-bold tracking-[-0.02em] text-[var(--color-ink)]"
        >
          {t('newThisMonth')}
        </h2>
        {rows.length > 0 ? (
          <Link
            href={`/${locale}/procedures`}
            className="text-[length:var(--text-sm)] font-semibold text-[var(--color-brand-700)] hover:text-[var(--color-brand-600)]"
          >
            {t('newThisMonthSeeAll')} →
          </Link>
        ) : null}
      </header>

      {visible.length === 0 ? (
        <p className="text-[length:var(--text-md)] text-[var(--color-ink-2)]">
          {t('newThisMonthEmpty')}
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((row) => (
            <li key={row.id}>
              <Link
                href={`/${locale}/procedures/${row.id}`}
                className={cn(
                  'group flex min-h-12 items-center gap-4 rounded-[var(--radius-lg)]',
                  'border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3',
                  'transition-all duration-[180ms] ease-[var(--ease)]',
                  'hover:-translate-y-px hover:border-[var(--color-brand-600)] hover:shadow-[var(--e-1)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint-2)] focus-visible:ring-offset-2',
                )}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-panel)] text-[var(--color-ink-2)]"
                >
                  <i className="ri-sparkling-2-line text-[length:var(--text-md)]" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[length:var(--text-md)] font-semibold text-[var(--color-ink)]">
                    {row.title}
                  </span>
                  <span className="truncate text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
                    {row.categoryName} · {t('version', { version: row.version })} ·{' '}
                    {formatPublishedLabel(row.publishedAt, (d) => d.toISOString().slice(0, 10))}
                  </span>
                </div>
                <i
                  aria-hidden="true"
                  className="ri-arrow-right-s-line text-[length:var(--text-lg)] text-[var(--color-ink-3)] transition-colors duration-[180ms] ease-[var(--ease)] group-hover:text-[var(--color-brand-700)]"
                />
                <span className="sr-only">{t('viewProcedure')}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}