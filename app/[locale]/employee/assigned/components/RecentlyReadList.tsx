import * as React from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

/**
 * RecentlyReadList — DESIGN.md §3.4 .chapter row pattern, employee density.
 *
 * Renders the three most recently read procedures for the signed-in
 * employee. The `document_view_recent` table (Stage 2 SOP Library)
 * feeds this. Until the table exists we render the empty state and
 * the supporting hint — never fake rows.
 *
 * Empty state is honest copy: "Open any procedure and it will appear
 * here." No spinners, no skeletons. The supporting hint explains the
 * rule, so the absence doesn't read as a bug.
 */
export interface RecentlyReadRow {
  id: string;
  title: string;
  categoryName: string;
  version: number;
  lastReadAt: Date;
  restricted: boolean;
}

interface RecentlyReadListProps {
  locale: string;
  rows: RecentlyReadRow[];
  className?: string;
}

function formatLastRead(
  when: Date,
  messages: {
    lastReadToday: string;
    lastReadYesterday: string;
    lastReadDaysAgo: (params: { days: number }) => string;
  },
): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (when >= startOfToday) return messages.lastReadToday;
  if (when >= startOfYesterday) return messages.lastReadYesterday;
  const diffMs = startOfToday.getTime() - when.getTime();
  const days = Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)));
  return messages.lastReadDaysAgo({ days });
}

export async function RecentlyReadList({
  locale,
  rows,
  className,
}: RecentlyReadListProps): Promise<React.ReactElement> {
  const t = await getTranslations('employee.dashboard');
  const visible = rows.slice(0, 3);

  // Resolve the date strings here, not inside the .map — next-intl's
  // translator type only knows about the keys it sees in this file's
  // call sites, so passing `t` into a helper would trip a TS2739 when
  // the helper reaches for keys it doesn't know are also in the namespace.
  const readAgo = {
    lastReadToday: t('lastReadToday'),
    lastReadYesterday: t('lastReadYesterday'),
    lastReadDaysAgo: (params: { days: number }): string => t('lastReadDaysAgo', params),
  };

  return (
    <section className={cn('space-y-3', className)} aria-labelledby="dashboard-recently-read">
      <h2
        id="dashboard-recently-read"
        className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] font-bold tracking-[-0.02em] text-[var(--color-ink)]"
      >
        {t('recentlyRead')}
      </h2>

      {visible.length === 0 ? (
        <div
          className={cn(
            'rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)]',
            'bg-[var(--color-surface)] px-6 py-8 text-center',
          )}
        >
          <i
            aria-hidden="true"
            className="ri-book-open-line mb-2 block text-[length:var(--text-2xl)] text-[var(--color-ink-3)]"
          />
          <p className="text-[length:var(--text-md)] font-medium text-[var(--color-ink)]">
            {t('recentlyReadEmpty')}
          </p>
          <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            {t('recentlyReadHint')}
          </p>
        </div>
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
                  <i className="ri-file-list-3-line text-[length:var(--text-md)]" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[length:var(--text-md)] font-semibold text-[var(--color-ink)]">
                    {row.title}
                  </span>
                  <span className="truncate text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
                    {row.categoryName} · {t('version', { version: row.version })} · {formatLastRead(row.lastReadAt, readAgo)}
                  </span>
                </div>
                {row.restricted ? (
                  <span
                    className="ml-auto inline-flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-bad-tint)] px-2 py-0.5 text-[length:var(--text-xs)] font-semibold text-[var(--color-bad)]"
                  >
                    <i aria-hidden="true" className="ri-lock-2-line" />
                    {t('restrictedBadge')}
                  </span>
                ) : null}
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