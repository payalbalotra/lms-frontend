'use client';

/**
 * Compact access row for Locations / Roles / Stations.
 *
 * Renders every option as a small selectable "tab" inside a 4-column
 * grid — same pill-tab affordance used by the procedure library's
 * category filter, just grid-laid. Each tab has an icon, a label, and
 * a check badge when selected. Clicking a tab toggles its membership in
 * the selected set.
 *
 * The grid wraps to 2-up on narrow viewports so the tabs never get too
 * cramped to read. The `disabled` prop dims the whole grid when Public
 * visibility is on — Public overrides these without losing selections
 * (they stay in state for the audit trail).
 *
 * Lives in its own file because Locations, Roles, and Stations share the
 * same exact UX — only the option list and i18n labels change.
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { AccessRow } from './access-row';
import type { AccessOption } from './access-data';

export interface AccessBlockProps {
  icon: string;
  title: string;
  emptyLabel: string;
  countLabel: (count: number) => string;
  options: AccessOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  /** Number of columns on the `sm` breakpoint and up. Defaults to 2 so
   *  Locations renders as a clean 2×2 grid (matching the procedure
   *  library's 2x2 metadata pattern). Pass 3 or 4 for wider option sets. */
  columns?: 2 | 3 | 4;
  disabled?: boolean;
}

export function AccessBlock({
  icon,
  title,
  emptyLabel,
  countLabel,
  options,
  selected,
  onToggle,
  columns = 2,
  disabled = false,
}: AccessBlockProps): React.ReactElement {
  const tAccess = useTranslations('admin.library.new.access');

  const gridCols = cn(
    'grid grid-cols-2 gap-2 pl-10 pt-1',
    columns === 3 && 'sm:grid-cols-3',
    columns === 4 && 'sm:grid-cols-4',
    disabled && 'pointer-events-none',
  );

  return (
    <AccessRow
      icon={icon}
      title={title}
      count={selected.size}
      emptyLabel={emptyLabel}
      countLabel={countLabel}
      disabled={disabled}
    >
      <div className={gridCols}>
        {options.map((opt) => {
          const isSelected = selected.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt.id)}
              disabled={disabled}
              aria-pressed={isSelected}
              className={cn(
                'group relative flex items-center gap-2 rounded-[var(--radius-md)] border px-2.5 py-2 text-left transition-all min-h-[40px]',
                isSelected
                  ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] shadow-xs ring-2 ring-[var(--color-brand-600)]/30'
                  : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)]',
                disabled && 'cursor-not-allowed hover:bg-[var(--color-surface)] hover:border-[var(--color-line-2)] hover:text-[var(--color-ink)]',
              )}
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-md text-xs shadow-2xs transition-colors',
                  isSelected
                    ? 'bg-[var(--color-brand-600)] text-white'
                    : 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
                )}
                aria-hidden="true"
              >
                <i className={opt.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-[length:var(--text-xs)] font-bold truncate',
                    isSelected ? 'text-[var(--color-brand-700)]' : 'text-[var(--color-ink)]',
                  )}
                >
                  {opt.label}
                </span>
              </span>
              {isSelected && (
                <span
                  aria-hidden="true"
                  className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white text-[10px] shadow-xs"
                >
                  <i className="ri-check-line font-bold" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {disabled && (
        <p className="pl-10 text-[length:var(--text-xs)] text-[var(--color-ink-3)] italic">
          {tAccess('publicDisabledHint')}
        </p>
      )}
    </AccessRow>
  );
}
