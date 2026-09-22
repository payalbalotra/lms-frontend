'use client';

/**
 * Compact row used by the Access step for Locations / Roles / Stations /
 * People.
 *
 * Layout (top-to-bottom, left-to-right):
 *   [icon]  Title    count/status  ............  [trigger on right]
 *   [picker area — always visible]
 *
 * The row is purely presentational: the picker area is supplied by the
 * caller (a 2-up or 4-col grid of selectable tabs for every block on
 * this step). The row never hides it — managers should always be able
 * to scan the full option set, even when nothing is selected yet.
 *
 * When `disabled` is true the row renders inert — opacity-50, no hover,
 * pointer-events-none on the trigger and children. The header still
 * reads so the manager can see what was selected before flipping
 * Public on.
 *
 * Lives in its own file so the four access rows (and the People row)
 * can share layout / spacing / disabled visuals without duplicating
 * the <section> + <header> markup in each block component.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';

export interface AccessRowProps {
  icon: string;
  title: string;
  count: number;
  emptyLabel: string;
  countLabel: (count: number) => string;
  /** Picker trigger element — Add button for Locations/Roles/Stations,
   *  search input for People. Renders on the right side of the header. */
  trigger?: React.ReactNode;
  /** Picker area. Renders below the header (always, regardless of count).
   *  Usually a grid of selectable option tabs. */
  children?: React.ReactNode;
  disabled?: boolean;
}

export function AccessRow({
  icon,
  title,
  count,
  emptyLabel,
  countLabel,
  trigger,
  children,
  disabled = false,
}: AccessRowProps): React.ReactElement {
  const showCount = count > 0;

  return (
    <section
      aria-disabled={disabled}
      className={cn(
        'space-y-3 border-b border-[var(--color-line)] py-4 transition-opacity last:border-b-0',
        disabled && 'opacity-50',
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]"
          >
            <Icon icon={icon} className="text-base" />
          </span>
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">
            {title}
          </h3>
          {showCount ? (
            <span className="text-sm font-semibold text-[var(--color-ink-2)]">
              {countLabel(count)}
            </span>
          ) : (
            <span className="text-sm text-[var(--color-ink-3)]">
              {emptyLabel}
            </span>
          )}
        </div>
        {trigger && (
          <div className={cn('shrink-0', disabled && 'pointer-events-none')}>{trigger}</div>
        )}
      </div>

      {children && (
        <div className={cn(disabled && 'pointer-events-none')}>{children}</div>
      )}
    </section>
  );
}

/**
 * Removable chip for a selected access item. Used inside an `AccessRow`.
 *
 * Renders as a brand-tinted pill with a label and a × button. The button
 * has its own click handler so the row's `pointer-events-none` doesn't
 * accidentally swallow the remove action when the row is disabled.
 */

export interface AccessChipProps {
  label: string;
  onRemove: () => void;
  disabled?: boolean;
}

export function AccessChip({
  label,
  onRemove,
  disabled = false,
}: AccessChipProps): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brand-tint-2)] bg-[var(--color-brand-tint)] py-1 pl-3 pr-2 text-sm font-semibold text-[var(--color-brand-700)]">
      <span className="max-w-field-sm truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={label}
        className="flex size-4 shrink-0 items-center justify-center rounded-full text-[var(--color-brand-tint-2)] transition-colors hover:bg-[var(--color-brand-600)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:cursor-not-allowed"
      >
        <Icon icon="ri-close-line" className="text-sm" />
      </button>
    </span>
  );
}
