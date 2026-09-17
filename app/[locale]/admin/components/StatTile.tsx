import * as React from 'react';
import { cn } from '@/lib/utils';

interface StatTileProps {
  label: string;
  hint?: string;
  value: number | string;
  icon: string;
  trend?: string;
  trendTone?: 'positive' | 'warning' | 'neutral';
  tone?: 'orange' | 'purple' | 'green' | 'blue' | 'neutral' | 'ok' | 'warn' | 'restricted';
  className?: string;
}

const toneStyles: Record<NonNullable<StatTileProps['tone']>, { bg: string; text: string }> = {
  orange: { bg: 'bg-[var(--color-brand-tint)]', text: 'text-[var(--color-brand-700)]' },
  purple: { bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400' },
  green: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' },
  blue: { bg: 'bg-sky-500/10 dark:bg-sky-500/20', text: 'text-sky-600 dark:text-sky-400' },
  neutral: { bg: 'bg-[var(--color-panel)]', text: 'text-[var(--color-ink-2)]' },
  ok: { bg: 'bg-[var(--color-ok-tint)]', text: 'text-[var(--color-ok)]' },
  warn: { bg: 'bg-[var(--color-warn-tint)]', text: 'text-[var(--color-warn-ink)]' },
  restricted: { bg: 'bg-[var(--color-bad-tint)]', text: 'text-[var(--color-bad)]' },
};

export function StatTile({
  label,
  hint,
  value,
  icon,
  trend,
  trendTone = 'positive',
  tone = 'neutral',
  className,
}: StatTileProps): React.ReactElement {
  const currentTone = toneStyles[tone] ?? toneStyles.neutral;

  return (
    <article
      data-slot="stat-tile"
      className={cn(
        'group relative flex flex-col justify-between rounded-[var(--radius-lg)]',
        'border border-[var(--color-line)] bg-[var(--color-surface)] p-5',
        'transition-all duration-200 ease-[var(--ease)]',
        'hover:shadow-sm hover:border-[var(--color-line-3)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-[length:var(--text-xs)] font-bold uppercase tracking-wider text-[var(--color-ink-2)]">
          {label}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] transition-transform duration-200 group-hover:scale-105',
            currentTone.bg,
            currentTone.text,
          )}
        >
          <i className={`${icon} text-xl`} />
        </span>
      </div>

      <div className="space-y-1">
        <div className="font-[family-name:var(--font-display)] text-3xl font-bold leading-none tracking-tight text-[var(--color-ink)]">
          {value}
        </div>

        {trend ? (
          <div className="flex items-center gap-1 pt-1 text-[length:var(--text-xs)] font-semibold">
            {trendTone === 'positive' && (
              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400">
                <i aria-hidden="true" className="ri-arrow-up-line mr-0.5" />
                {trend}
              </span>
            )}
            {trendTone === 'warning' && (
              <span className="inline-flex items-center text-amber-600 dark:text-amber-400">
                <span className="size-1.5 rounded-full bg-current mr-1" />
                {trend}
              </span>
            )}
            {trendTone === 'neutral' && (
              <span className="text-[var(--color-ink-3)]">{trend}</span>
            )}
          </div>
        ) : hint ? (
          <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">{hint}</p>
        ) : null}
      </div>
    </article>
  );
}