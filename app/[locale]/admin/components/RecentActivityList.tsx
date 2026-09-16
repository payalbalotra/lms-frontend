import * as React from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

export interface ActivityRowItem {
  id: string;
  initials: string;
  user: string;
  action: string;
  target: string;
  timeAgo: string;
  avatarTone: 'blue' | 'sky' | 'teal' | 'purple' | 'orange';
  href: string;
}

const DEFAULT_ACTIVITY: ActivityRowItem[] = [
  {
    id: '1',
    initials: 'ML',
    user: 'Maria Lopez',
    action: 'completed',
    target: 'Food Safety Basics',
    timeAgo: '12 minutes ago',
    avatarTone: 'blue',
    href: '/admin/training',
  },
  {
    id: '2',
    initials: 'CC',
    user: 'Carlos Cruz',
    action: 'created',
    target: 'Grilled Chicken Procedure',
    timeAgo: '1 hour ago',
    avatarTone: 'sky',
    href: '/admin/library',
  },
  {
    id: '3',
    initials: 'AT',
    user: 'Ana Torres',
    action: 'published',
    target: 'Cleaning Schedule - Main Kitchen',
    timeAgo: '3 hours ago',
    avatarTone: 'teal',
    href: '/admin/library',
  },
  {
    id: '4',
    initials: 'JD',
    user: 'James Diaz',
    action: 'added a new employee',
    target: '',
    timeAgo: '4 hours ago',
    avatarTone: 'purple',
    href: '/admin/employees',
  },
];

const toneStyles: Record<ActivityRowItem['avatarTone'], string> = {
  blue: 'bg-blue-500 text-white',
  sky: 'bg-sky-500 text-white',
  teal: 'bg-emerald-600 text-white',
  purple: 'bg-indigo-600 text-white',
  orange: 'bg-[var(--color-brand-600)] text-white',
};

interface RecentActivityListProps {
  locale: string;
  rows?: ActivityRowItem[];
  className?: string;
}

export async function RecentActivityList({
  locale,
  rows = DEFAULT_ACTIVITY,
  className,
}: RecentActivityListProps): Promise<React.ReactElement> {
  const t = await getTranslations('admin.dashboard');
  const isEs = locale === 'es';

  return (
    <section
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-xs space-y-4',
        className,
      )}
      aria-labelledby="dashboard-recent-activity"
    >
      <header className="flex items-center justify-between gap-3 border-b border-[var(--color-line-2)]/60 pb-3">
        <h2
          id="dashboard-recent-activity"
          className="font-[family-name:var(--font-display)] text-[length:var(--text-md)] font-bold tracking-tight text-[var(--color-ink)]"
        >
          {t('recentActivity')}
        </h2>
        <Link
          href={`/${locale}/admin/library`}
          className="inline-flex items-center gap-1 text-[length:var(--text-xs)] font-bold uppercase tracking-wider text-[var(--color-brand-700)] hover:text-[var(--color-brand-600)] transition-colors"
        >
          {isEs ? 'Ver todo' : 'View all'}
          <i aria-hidden="true" className="ri-arrow-right-line" />
        </Link>
      </header>

      {rows.length === 0 ? (
        <div className="py-6 text-center text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
          <i aria-hidden="true" className="ri-pulse-line text-2xl block mb-1" />
          <p>{t('recentActivityEmpty')}</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-line-2)]/60">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-2xs',
                    toneStyles[row.avatarTone],
                  )}
                >
                  {row.initials}
                </span>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-[length:var(--text-xs)] text-[var(--color-ink)] font-medium truncate">
                    <span className="font-bold">{row.user}</span>{' '}
                    <span className="text-[var(--color-ink-2)]">{row.action}</span>{' '}
                    {row.target ? <span className="font-bold">{row.target}</span> : null}
                  </p>
                  <p className="text-[11px] text-[var(--color-ink-3)] font-medium">
                    {row.timeAgo}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}