import * as React from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

/**
 * RecentActivityList — DESIGN.md §3.4 .chapter row pattern, admin density.
 *
 * Five most recent activity rows (published / drafted / updated /
 * employee-invited / training-completed). Broader than
 * RecentlyPublishedList — that one is library-only. This one answers
 * "what changed lately" across the whole LMS.
 *
 * Stage 2 status: this list is empty until the activity endpoint
 * lands. The card header always renders.
 */
export type ActivityKind =
  | 'published'
  | 'drafted'
  | 'updated'
  | 'invited'
  | 'completed';

export interface ActivityRow {
  id: string;
  kind: ActivityKind;
  title: string;
  meta: string;
  at: Date;
  href: string;
}

interface RecentActivityListProps {
  locale: string;
  rows: ActivityRow[];
  className?: string;
}

const KIND_ICON: Record<ActivityKind, string> = {
  published: 'ri-file-list-3-line',
  drafted: 'ri-draft-line',
  updated: 'ri-loop-right-line',
  invited: 'ri-user-add-line',
  completed: 'ri-checkbox-circle-line',
};

const KIND_TONE: Record<ActivityKind, string> = {
  published: 'bg-[var(--color-ok-tint)] text-[var(--color-ok)]',
  drafted: 'bg-[var(--color-warn-tint)] text-[var(--color-warn-ink)]',
  updated: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
  invited: 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]',
  completed: 'bg-[var(--color-ok-tint)] text-[var(--color-ok)]',
};

export async function RecentActivityList({
  locale,
  rows,
  className,
}: RecentActivityListProps): Promise<React.ReactElement> {
  const t = await getTranslations('admin.dashboard');
  const visible = rows.slice(0, 5);

  return (
    <section className={cn('space-y-3', className)} aria-labelledby="dashboard-recent-activity">
      <header className="flex items-baseline justify-between gap-3">
        <h2
          id="dashboard-recent-activity"
          className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] font-bold tracking-[-0.02em] text-[var(--color-ink)]"
        >
          {t('recentActivity')}
        </h2>
        {rows.length > 5 ? (
          <Link
            href={`/${locale}/admin/library`}
            className="text-[length:var(--text-sm)] font-semibold text-[var(--color-brand-700)] hover:text-[var(--color-brand-600)]"
          >
            {t('viewAll')} →
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
            className="ri-pulse-line mb-2 block text-[length:var(--text-2xl)] text-[var(--color-ink-3)]"
          />
          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            {t('recentActivityEmpty')}
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
          {visible.map((row) => (
            <li key={row.id} className="border-b border-[var(--color-line)] last:border-b-0">
              <Link
                href={row.href}
                className={cn(
                  'group flex min-h-[var(--tap-admin)] items-center gap-4 px-5 py-3',
                  'transition-colors duration-[180ms] ease-[var(--ease)]',
                  'hover:bg-[var(--color-panel)]',
                  'focus-visible:outline-none focus-visible:bg-[var(--color-panel)]',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]',
                    KIND_TONE[row.kind],
                  )}
                >
                  <i className={`${KIND_ICON[row.kind]} text-[length:var(--text-md)]`} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[length:var(--text-sm)] font-semibold text-[var(--color-ink)]">
                    {row.title}
                  </span>
                  <span className="truncate text-[length:var(--text-xs)] text-[var(--color-ink-2)]">
                    {row.meta} · {formatDate(row.at)}
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
      )}
    </section>
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