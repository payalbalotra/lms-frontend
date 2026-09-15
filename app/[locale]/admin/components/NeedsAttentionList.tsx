import * as React from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

/**
 * NeedsAttentionList — DESIGN.md §3.4 .note-block.n-warn pattern.
 *
 * Six kinds of attention entries map to one amber panel each
 * (not red — DESIGN.md §2.1: "important ≠ dangerous"). Empty state
 * shows a single ok-tone line; the message is "library is healthy".
 *
 * Stage 2 status: the attention endpoint doesn't exist yet; the
 * list renders empty. The card header always shows, so when the
 * endpoint ships the panel fills in without changing the page.
 */
export type AttentionKind =
  | 'drafts'
  | 'reviews'
  | 'emptyCategories'
  | 'pendingApprovals'
  | 'overdueEmployees'
  | 'expiringClearances';

export interface AttentionEntry {
  kind: AttentionKind;
  count: number;
  /** Optional route used when count > 0 and the user wants to drill in. */
  href?: string;
  /** Optional: doc refs for drafts / past-review SOPs so the row can link in. */
  refs?: Array<{ id: string; title: string; meta?: string }>;
}

interface NeedsAttentionListProps {
  locale: string;
  entries: AttentionEntry[];
  className?: string;
}

interface AttentionTone {
  icon: string;
  ring: string;
  iconCls: string;
}

function toneForKind(kind: AttentionKind): AttentionTone {
  switch (kind) {
    case 'drafts':
    case 'pendingApprovals':
      return {
        icon: 'ri-draft-line',
        ring: 'border-[var(--color-warn)]/40 bg-[var(--color-warn-tint)]',
        iconCls: 'text-[var(--color-warn-ink)]',
      };
    case 'reviews':
    case 'expiringClearances':
      return {
        icon: 'ri-calendar-check-line',
        ring: 'border-[var(--color-warn)]/40 bg-[var(--color-warn-tint)]',
        iconCls: 'text-[var(--color-warn-ink)]',
      };
    case 'emptyCategories':
      return {
        icon: 'ri-folders-line',
        ring: 'border-[var(--color-warn)]/40 bg-[var(--color-warn-tint)]',
        iconCls: 'text-[var(--color-warn-ink)]',
      };
    case 'overdueEmployees':
      return {
        icon: 'ri-user-warning-line',
        ring: 'border-[var(--color-warn)]/40 bg-[var(--color-warn-tint)]',
        iconCls: 'text-[var(--color-warn-ink)]',
      };
  }
}

export async function NeedsAttentionList({
  locale,
  entries,
  className,
}: NeedsAttentionListProps): Promise<React.ReactElement> {
  const t = await getTranslations('admin.dashboard');
  const totalCount = entries.reduce((sum, e) => sum + e.count, 0);

  function messageFor(entry: AttentionEntry): string {
    if (entry.count === 0) return '';
    switch (entry.kind) {
      case 'drafts':
        return entry.count === 1
          ? t('needsAttentionDraftsOne')
          : t('needsAttentionDraftsMany', { count: entry.count });
      case 'reviews':
        return entry.count === 1
          ? t('needsAttentionReviewsOne')
          : t('needsAttentionReviewsMany', { count: entry.count });
      case 'emptyCategories':
        return entry.count === 1
          ? t('needsAttentionEmptyCategoriesOne')
          : t('needsAttentionEmptyCategoriesMany', { count: entry.count });
      case 'pendingApprovals':
        return entry.count === 1
          ? t('needsAttentionPendingApprovalsOne')
          : t('needsAttentionPendingApprovalsMany', { count: entry.count });
      case 'overdueEmployees':
        return entry.count === 1
          ? t('needsAttentionOverdueEmployeesOne')
          : t('needsAttentionOverdueEmployeesMany', { count: entry.count });
      case 'expiringClearances':
        return entry.count === 1
          ? t('needsAttentionExpiringClearancesOne')
          : t('needsAttentionExpiringClearancesMany', { count: entry.count });
    }
  }

  const visibleEntries = entries.filter((e) => e.count > 0);

  return (
    <section className={cn('space-y-3', className)} aria-labelledby="dashboard-needs-attention">
      <header className="flex items-baseline justify-between gap-3">
        <h2
          id="dashboard-needs-attention"
          className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] font-bold tracking-[-0.02em] text-[var(--color-ink)]"
        >
          {t('needsAttention')}
        </h2>
        {totalCount > 0 ? (
          <span
            className={cn(
              'inline-flex min-w-7 items-center justify-center rounded-[var(--radius-pill)]',
              'bg-[var(--color-warn)] px-2 py-0.5 text-[length:var(--text-xs)] font-bold text-white',
            )}
          >
            {t('needsAttentionCount', { count: totalCount })}
          </span>
        ) : null}
      </header>

      {visibleEntries.length === 0 ? (
        <div
          className={cn(
            'flex items-center gap-3 rounded-[var(--radius-lg)]',
            'border border-[var(--color-ok-tint-2)] bg-[var(--color-ok-tint)] px-5 py-4',
          )}
        >
          <i aria-hidden="true" className="ri-checkbox-circle-line text-[length:var(--text-lg)] text-[var(--color-ok)]" />
          <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-ok)]">
            {t('needsAttentionEmpty')}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visibleEntries.map((entry, idx) => {
            const tone = toneForKind(entry.kind);
            const message = messageFor(entry);
            return (
              <li key={`${entry.kind}-${idx}`}>
                <article
                  className={cn(
                    'rounded-[var(--radius-lg)] border p-4',
                    tone.ring,
                  )}
                >
                  <div className="flex items-start gap-3">
                    <i
                      aria-hidden="true"
                      className={cn(`mt-0.5 ${tone.icon} text-[length:var(--text-md)]`, tone.iconCls)}
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-[length:var(--text-sm)] font-semibold text-[var(--color-warn-ink)]">
                        {message}
                      </p>
                      {entry.refs && entry.refs.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {entry.refs.slice(0, 3).map((ref) => (
                            <li key={ref.id}>
                              <Link
                                href={`/${locale}/admin/library/${ref.id}`}
                                className="text-[length:var(--text-sm)] font-medium text-[var(--color-warn-ink)] underline-offset-2 hover:underline"
                              >
                                {ref.title}
                                {ref.meta ? (
                                  <span className="ml-2 text-[length:var(--text-xs)] font-normal opacity-80">
                                    · {ref.meta}
                                  </span>
                                ) : null}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    {entry.href ? (
                      <Link
                        href={entry.href}
                        aria-label={message}
                        className="shrink-0 text-[length:var(--text-sm)] font-semibold text-[var(--color-warn-ink)] underline-offset-2 hover:underline"
                      >
                        →
                      </Link>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}