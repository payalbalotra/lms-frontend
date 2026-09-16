import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface QuickActionItem {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  icon: string;
  tone: 'orange' | 'purple' | 'green' | 'blue';
}

const DEFAULT_ACTIONS: QuickActionItem[] = [
  {
    id: 'create-procedure',
    href: '/admin/library/new',
    title: 'Create procedure',
    subtitle: 'Add a new procedure',
    icon: 'ri-file-add-line',
    tone: 'orange',
  },
  {
    id: 'import-document',
    href: '/admin/library/new',
    title: 'Import document',
    subtitle: 'Upload PDF, Word or photo',
    icon: 'ri-file-upload-line',
    tone: 'purple',
  },
  {
    id: 'invite-employee',
    href: '/admin/employees/new',
    title: 'Invite employee',
    subtitle: 'Add a new team member',
    icon: 'ri-user-add-line',
    tone: 'green',
  },
  {
    id: 'assign-training',
    href: '/admin/training',
    title: 'Assign training',
    subtitle: 'Schedule training for employees',
    icon: 'ri-graduation-cap-line',
    tone: 'blue',
  },
];

const toneStyles: Record<QuickActionItem['tone'], { bg: string; text: string }> = {
  orange: { bg: 'bg-[var(--color-brand-600)]', text: 'text-white' },
  purple: { bg: 'bg-purple-600', text: 'text-white' },
  green: { bg: 'bg-emerald-600', text: 'text-white' },
  blue: { bg: 'bg-sky-600', text: 'text-white' },
};

interface QuickActionsListProps {
  locale: string;
  actions?: QuickActionItem[];
  className?: string;
}

export async function QuickActionsList({
  locale,
  actions = DEFAULT_ACTIONS,
  className,
}: QuickActionsListProps): Promise<React.ReactElement> {
  const isEs = locale === 'es';

  return (
    <section
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-xs space-y-4',
        className,
      )}
      aria-labelledby="dashboard-quick-actions"
    >
      <h2
        id="dashboard-quick-actions"
        className="font-[family-name:var(--font-display)] text-[length:var(--text-md)] font-bold tracking-tight text-[var(--color-ink)]"
      >
        {isEs ? 'Acciones rápidas' : 'Quick actions'}
      </h2>

      <div className="space-y-2.5">
        {actions.map((action) => {
          const style = toneStyles[action.tone];
          return (
            <Link
              key={action.id}
              href={`/${locale}${action.href}`}
              className="group flex items-center gap-3.5 rounded-[var(--radius-md)] border border-[var(--color-line-2)]/60 bg-[var(--color-surface)] p-3 transition-all duration-200 hover:border-[var(--color-brand-600)]/40 hover:bg-[var(--color-wash)]/40 hover:shadow-2xs"
            >
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-lg shadow-2xs transition-transform duration-200 group-hover:scale-105',
                  style.bg,
                  style.text,
                )}
              >
                <i aria-hidden="true" className={action.icon} />
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="text-[length:var(--text-xs)] font-bold text-[var(--color-ink)] truncate group-hover:text-[var(--color-brand-700)] transition-colors">
                  {action.title}
                </h3>
                <p className="text-[11px] text-[var(--color-ink-2)] truncate font-medium mt-0.5">
                  {action.subtitle}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}