import * as React from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type AttentionKind =
  | 'pendingApprovals'
  | 'overdueEmployees'
  | 'expiringSops'
  | 'drafts'
  | 'reviews'
  | 'emptyCategories';

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  title: string;
  subtitle: string;
  actionLabel: string;
  href: string;
  icon?: string;
}

interface NeedsAttentionListProps {
  locale: string;
  items?: AttentionItem[];
  className?: string;
}

const DEFAULT_ATTENTION_ITEMS: AttentionItem[] = [
  {
    id: '1',
    kind: 'pendingApprovals',
    title: '3 procedures awaiting approval',
    subtitle: 'Grilled Chicken Breast, Cleaning Schedule, and 1 more',
    actionLabel: 'Review',
    href: '/admin/library',
    icon: 'ri-file-search-line',
  },
  {
    id: '2',
    kind: 'overdueEmployees',
    title: '5 employees have overdue training',
    subtitle: 'Food Safety, Allergen Awareness, and 3 more',
    actionLabel: 'View training',
    href: '/admin/training',
    icon: 'ri-user-warning-line',
  },
  {
    id: '3',
    kind: 'expiringSops',
    title: '2 procedures expire this week',
    subtitle: 'Cleaning Schedule - Main Kitchen, Equipment Handling',
    actionLabel: 'Review',
    href: '/admin/library',
    icon: 'ri-time-line',
  },
];

export async function NeedsAttentionList({
  locale,
  items = DEFAULT_ATTENTION_ITEMS,
  className,
}: NeedsAttentionListProps): Promise<React.ReactElement> {
  const t = await getTranslations('admin.dashboard');
  const isEs = locale === 'es';

  return (
    <section
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-brand-600)]/20 bg-[#fff8f5] dark:bg-[var(--color-brand-tint)]/10 p-5 sm:p-6 shadow-xs space-y-4',
        className,
      )}
      aria-labelledby="dashboard-needs-attention"
    >
      <header className="flex items-center justify-between gap-3 border-b border-[var(--color-brand-600)]/15 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white text-sm shadow-xs font-bold">
            !
          </span>
          <h2
            id="dashboard-needs-attention"
            className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] font-bold tracking-tight text-[var(--color-brand-700)]"
          >
            {isEs ? 'Requiere atención' : 'Needs attention'}
          </h2>
        </div>
        <Link
          href={`/${locale}/admin/library`}
          className="inline-flex items-center gap-1 text-[length:var(--text-xs)] font-bold uppercase tracking-wider text-[var(--color-brand-700)] hover:text-[var(--color-brand-600)] transition-colors"
        >
          {t('viewAll')}
          <i aria-hidden="true" className="ri-arrow-right-line" />
        </Link>
      </header>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 py-2 text-[length:var(--text-sm)] text-[var(--color-ok)]">
          <i aria-hidden="true" className="ri-checkbox-circle-line text-lg" />
          <p>{t('needsAttentionEmpty')}</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-brand-600)]/10 space-y-3 pt-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 first:pt-0"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] text-base mt-0.5">
                  <i aria-hidden="true" className={item.icon || 'ri-error-warning-line'} />
                </span>
                <div className="min-w-0 space-y-0.5">
                  <h3 className="text-[length:var(--text-sm)] font-bold text-[var(--color-ink)] truncate">
                    {item.title}
                  </h3>
                  <p className="text-[length:var(--text-xs)] text-[var(--color-ink-2)] truncate font-medium">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <Link href={`/${locale}${item.href}`} className="shrink-0 self-start sm:self-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full border-[var(--color-brand-600)]/30 bg-white/80 dark:bg-[var(--color-surface)] text-[var(--color-brand-700)] hover:bg-[var(--color-brand-tint)] text-xs font-semibold px-4 py-1.5 shadow-2xs"
                >
                  {item.actionLabel}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}