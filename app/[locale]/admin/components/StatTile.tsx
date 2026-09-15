import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * StatTile — bare stat tile, no plot (per dataviz skill: "the only form
 * that skips [hover/interaction] is a bare stat tile with no plot").
 *
 * DESIGN.md §2.3 / §3.4 rule: hairline border at rest, NO shadow.
 * Hover lifts to --e-1. Border or shadow, never both.
 *
 * Number in DM Sans at --text-2xl (36px) — the section-heading tier.
 * Label in --text-sm (14px) ink-2. Hint in --text-xs ink-3. No
 * percentages — DESIGN.md §8 forbidden list.
 */
interface StatTileProps {
  label: string;
  hint?: string;
  value: number | string;
  icon: string;
  tone?: 'neutral' | 'ok' | 'warn' | 'restricted';
  className?: string;
}

const iconToneClasses: Record<NonNullable<StatTileProps['tone']>, string> = {
  neutral: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
  ok: 'bg-[var(--color-ok-tint)] text-[var(--color-ok)]',
  warn: 'bg-[var(--color-warn-tint)] text-[var(--color-warn-ink)]',
  restricted: 'bg-[var(--color-bad-tint)] text-[var(--color-bad)]',
};

export function StatTile({
  label,
  hint,
  value,
  icon,
  tone = 'neutral',
  className,
}: StatTileProps): React.ReactElement {
  return (
    <article
      data-slot="stat-tile"
      className={cn(
        'group relative flex flex-col gap-2 rounded-[var(--radius-lg)]',
        'border border-[var(--color-line)] bg-[var(--color-surface)] p-5',
        'transition-shadow duration-[180ms] ease-[var(--ease)]',
        'hover:shadow-[var(--e-1)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[length:var(--text-sm)] font-semibold uppercase tracking-wide text-[var(--color-ink-2)]">
          {label}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex size-9 items-center justify-center rounded-[var(--radius-md)]',
            iconToneClasses[tone],
          )}
        >
          <i className={`${icon} text-[length:var(--text-lg)]`} />
        </span>
      </div>
      <div className="font-[family-name:var(--font-display)] text-[length:var(--text-2xl)] font-bold leading-none tracking-[-0.02em] text-[var(--color-ink)]">
        {value}
      </div>
      {hint ? (
        <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">{hint}</p>
      ) : null}
    </article>
  );
}