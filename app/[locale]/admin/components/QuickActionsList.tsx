import * as React from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

/**
 * QuickActionsList — DESIGN.md §3.4 vertical action list, admin density.
 *
 * Replaces the previous footer `[+ New SOP]  [Manage categories]` row
 * with a list of available shortcuts. The first action uses the
 * brand-tint background per the design review's "action accent" idea;
 * subsequent actions sit on the surface card and use ink-2.
 *
 * Stage 2 status: every action links to a real or placeholder route.
 * "Create course" and "Import document" are forward-looking; they
 * still render but link to the library for now.
 */
export interface QuickAction {
  id: string;
  href: string;
  labelKey:
    | 'quickCreateProcedure'
    | 'quickCreateCourse'
    | 'quickImportDocument'
    | 'quickAddEmployee';
  icon: string;
}

export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'create-procedure',
    href: '/library/new',
    labelKey: 'quickCreateProcedure',
    icon: 'ri-add-circle-line',
  },
  {
    id: 'create-course',
    href: '/library',
    labelKey: 'quickCreateCourse',
    icon: 'ri-graduation-cap-line',
  },
  {
    id: 'import-document',
    href: '/library/new',
    labelKey: 'quickImportDocument',
    icon: 'ri-upload-2-line',
  },
  {
    id: 'add-employee',
    href: '/employees/new',
    labelKey: 'quickAddEmployee',
    icon: 'ri-user-add-line',
  },
];

interface QuickActionsListProps {
  locale: string;
  actions?: QuickAction[];
  className?: string;
}

export async function QuickActionsList({
  locale,
  actions = DEFAULT_QUICK_ACTIONS,
  className,
}: QuickActionsListProps): Promise<React.ReactElement> {
  const t = await getTranslations('admin.dashboard');

  return (
    <section className={cn('space-y-3', className)} aria-labelledby="dashboard-quick-actions">
      <h2
        id="dashboard-quick-actions"
        className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] font-bold tracking-[-0.02em] text-[var(--color-ink)]"
      >
        {t('quickActionsHeading')}
      </h2>
      <ul className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
        {actions.map((action, idx) => {
          const label = t(action.labelKey);
          const isFirst = idx === 0;
          return (
            <li key={action.id} className="border-b border-[var(--color-line)] last:border-b-0">
              <Link
                href={`/${locale}/admin${action.href}`}
                aria-label={t('quickActionAria', { label })}
                className={cn(
                  'group flex min-h-[var(--tap-admin)] items-center gap-3 px-5 py-3',
                  'transition-colors duration-[180ms] ease-[var(--ease)]',
                  isFirst
                    ? 'bg-[var(--color-brand-tint)] hover:bg-[var(--color-brand-tint-2)]'
                    : 'hover:bg-[var(--color-panel)]',
                  'focus-visible:outline-none focus-visible:bg-[var(--color-panel)]',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]',
                    isFirst
                      ? 'bg-[var(--color-surface)] text-[var(--color-brand-700)]'
                      : 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
                  )}
                >
                  <i className={`${action.icon} text-[length:var(--text-md)]`} />
                </span>
                <span
                  className={cn(
                    'flex-1 truncate text-[length:var(--text-sm)] font-semibold',
                    isFirst ? 'text-[var(--color-brand-700)]' : 'text-[var(--color-ink)]',
                  )}
                >
                  {label}
                </span>
                <i
                  aria-hidden="true"
                  className={cn(
                    'ri-arrow-right-s-line text-[length:var(--text-lg)] transition-colors duration-[180ms] ease-[var(--ease)]',
                    isFirst
                      ? 'text-[var(--color-brand-600)] group-hover:text-[var(--color-brand-700)]'
                      : 'text-[var(--color-ink-3)] group-hover:text-[var(--color-brand-700)]',
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}