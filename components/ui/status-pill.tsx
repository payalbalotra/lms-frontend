import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Status pill — DESIGN.md §3.3.
 *
 *   - Shape: small rectangle (rounded-md), not pill.
 *   - Six tones: ok, warn, bad, neutral (panel), info (ink-2), active (ok).
 *   - Tight, single line — a column widens, never truncates.
 */
export type StatusTone = 'ok' | 'warn' | 'bad' | 'neutral' | 'info' | 'progress';

const toneClasses: Record<StatusTone, string> = {
  ok: 'bg-[var(--color-ok-tint)] text-[var(--color-ok)]',
  warn: 'bg-[var(--color-warn-tint)] text-[var(--color-warn-ink)]',
  bad: 'bg-[var(--color-bad-tint)] text-[var(--color-bad)]',
  neutral: 'bg-[var(--color-panel-2)] text-[var(--color-ink-2)]',
  info: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
  progress: 'bg-[var(--color-panel)] text-[var(--color-ink)]',
};

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  /** Optional dot icon to the left. */
  withDot?: boolean;
}

export function StatusPill({
  tone = 'neutral',
  withDot,
  className,
  children,
  ...rest
}: StatusPillProps): React.ReactElement {
  return (
    <span
      data-slot="status-pill"
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md',
        'px-2 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
      {...rest}
    >
      {withDot ? (
        <span
          aria-hidden="true"
          className="inline-block size-1.5 rounded-full bg-current"
        />
      ) : null}
      {children}
    </span>
  );
}
