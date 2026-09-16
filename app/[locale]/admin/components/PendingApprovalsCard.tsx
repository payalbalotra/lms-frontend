import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface PendingApprovalItem {
  id: string;
  title: string;
  category: string;
  author: string;
  timeAgo: string;
  href: string;
}

const DEFAULT_PENDING: PendingApprovalItem[] = [
  {
    id: '1',
    title: 'Grilled Chicken Breast',
    category: 'Recipe · Draft',
    author: 'Maria Lopez',
    timeAgo: '2 hours ago',
    href: '/admin/library',
  },
  {
    id: '2',
    title: 'Cleaning Equipment Procedure',
    category: 'Station procedure · Draft',
    author: 'Carlos Cruz',
    timeAgo: '5 hours ago',
    href: '/admin/library',
  },
  {
    id: '3',
    title: 'Delivery Receiving Checklist',
    category: 'General procedure · Draft',
    author: 'Ana Torres',
    timeAgo: '3 days ago',
    href: '/admin/library',
  },
];

interface PendingApprovalsCardProps {
  locale: string;
  items?: PendingApprovalItem[];
  className?: string;
}

export function PendingApprovalsCard({
  locale,
  items = DEFAULT_PENDING,
  className,
}: PendingApprovalsCardProps): React.ReactElement {
  const isEs = locale === 'es';

  return (
    <section
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-xs space-y-4',
        className,
      )}
      aria-labelledby="dashboard-pending-approvals"
    >
      <header className="flex items-center justify-between gap-3 border-b border-[var(--color-line-2)]/60 pb-3">
        <h2
          id="dashboard-pending-approvals"
          className="font-[family-name:var(--font-display)] text-[length:var(--text-md)] font-bold tracking-tight text-[var(--color-ink)]"
        >
          {isEs ? 'Aprobaciones pendientes' : 'Pending approvals'}
        </h2>
        <Link
          href={`/${locale}/admin/library`}
          className="inline-flex items-center gap-1 text-[length:var(--text-xs)] font-bold uppercase tracking-wider text-[var(--color-brand-700)] hover:text-[var(--color-brand-600)] transition-colors"
        >
          {isEs ? 'Ver todo' : 'View all'}
          <i aria-hidden="true" className="ri-arrow-right-line" />
        </Link>
      </header>

      {items.length === 0 ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)] py-4 text-center">
          {isEs ? 'No hay aprobaciones pendientes.' : 'No pending approvals.'}
        </p>
      ) : (
        <div className="divide-y divide-[var(--color-line-2)]/60">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] text-base">
                  <i aria-hidden="true" className="ri-file-text-line" />
                </span>
                <div className="min-w-0 space-y-0.5">
                  <h3 className="text-[length:var(--text-xs)] font-bold text-[var(--color-ink)] truncate">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-[var(--color-ink-2)] truncate font-medium">
                    {item.category} · {isEs ? 'Por' : 'By'} {item.author} · {item.timeAgo}
                  </p>
                </div>
              </div>

              <Link href={`/${locale}${item.href}`} className="shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full border-[var(--color-brand-600)]/30 bg-[var(--color-brand-tint)]/40 text-[var(--color-brand-700)] hover:bg-[var(--color-brand-tint)] text-xs font-semibold px-3.5 py-1 shadow-2xs"
                >
                  {isEs ? 'Revisar' : 'Review'}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
