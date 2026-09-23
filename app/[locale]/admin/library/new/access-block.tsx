'use client';

/**
 * Compact access row used for Job Roles and Stations on the Access step.
 * Each option is a selectable pill-tab inside a multi-column grid; the
 * selected one fills with the brand tint and shows a check badge.
 *
 * The `variant="dropdown"` form is used for Locations — a CustomSelect
 * picker with single-select semantics. Stations get an optional `allOption`
 * shortcut that toggles every option id in one click (hidden when only
 * one station exists). `maxVisible` collapses longer lists behind a
 * "Show N more" toggle.
 *
 * The grid wraps to 2-up on narrow viewports so tabs stay readable. When
 * `disabled` (Public visibility on) the row renders inert — selections
 * stay in state for the audit trail.
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { CustomSelect, type SelectOption } from '@/components/ui/custom-select';
import { AccessRow } from './access-row';
import type { AccessOption } from './access-data';
import { Icon } from '@/components/ui/icon';
import { LuMapPin } from 'react-icons/lu';

export interface AccessBlockProps {
  icon: string;
  title: string;
  emptyLabel: string;
  countLabel: (count: number) => string;
  options: AccessOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  /** Columns on the `sm` breakpoint and up. Defaults to 2. */
  columns?: 2 | 3 | 4;
  /** Swaps the picker grid for a single CustomSelect (used by Locations
   *  and Stations). */
  variant?: 'grid' | 'dropdown';
  /** Placeholder text inside the dropdown trigger when nothing is picked. */
  dropdownPlaceholder?: string;
  /** Appends an "All" shortcut at the end that toggles every option. */
  allOption?: boolean;
  /** Label for the all-option trigger. */
  allOptionLabel?: string;
  /** Cap on rendered options before a "Show N more" toggle appears. */
  maxVisible?: number;
  /** Italic helper text shown beneath the grid (e.g. explains why a
   *  dependent list is empty, or nudges the manager to scope it). */
  footerHint?: string;
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
  variant = 'grid',
  dropdownPlaceholder,
  allOption = false,
  allOptionLabel,
  maxVisible,
  footerHint,
  disabled = false,
}: AccessBlockProps): React.ReactElement {
  const tAccess = useTranslations('admin.library.new.access');

  if (variant === 'dropdown') {
    return (
      <AccessRow
        icon={icon}
        title={title}
        count={selected.size}
        emptyLabel={emptyLabel}
        countLabel={countLabel}
        disabled={disabled}
      >
        <div className={cn('pl-10 pt-1', disabled && 'pointer-events-none')}>
          <CustomSelect
            value={Array.from(selected)[0] ?? ''}
            onChange={(value) => {
              // Single-select: flip the new id in, then clear any prior
              // selection. `onToggle` is idempotent on a Set, so duplicates
              // are harmless.
              onToggle(value);
              for (const prev of Array.from(selected)) {
                if (prev !== value) onToggle(prev);
              }
            }}
            options={options.map<SelectOption>((opt) => ({
              value: opt.id,
              label: opt.label,
              description: opt.sub,
              icon: opt.icon,
            }))}
            placeholder={dropdownPlaceholder ?? tAccess('locationDropdownPlaceholder')}
            leadingIcon={LuMapPin}
            disabled={disabled}
          />
        </div>

        {disabled && (
          <p className="pl-10 text-sm text-[var(--color-ink-3)] italic">
            {tAccess('publicDisabledHint')}
          </p>
        )}
      </AccessRow>
    );
  }

  const [showAll, setShowAll] = React.useState(false);
  const cap = maxVisible ?? options.length;
  const needsToggle = options.length > cap;
  const visibleOptions = needsToggle && !showAll ? options.slice(0, cap) : options;
  const allSelected = allOption && selected.size === options.length && options.length > 0;

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
        {visibleOptions.map((opt) => {
          const isSelected = selected.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt.id)}
              disabled={disabled}
              aria-pressed={isSelected}
              className={cn(
                'group relative flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-left transition-all min-h-10',
                isSelected
                  ? 'border-[var(--color-ring)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] shadow-e1 ring-2 ring-[var(--color-ring)]'
                  : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)]',
                disabled && 'cursor-not-allowed hover:bg-[var(--color-surface)] hover:border-[var(--color-line-2)] hover:text-[var(--color-ink)]',
              )}
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-md text-sm shadow-e1 transition-colors',
                  isSelected
                    ? 'bg-[var(--color-brand-600)] text-white'
                    : 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
                )}
                aria-hidden="true"
              >
                <Icon icon={opt.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-sm font-semibold truncate',
                    isSelected ? 'text-[var(--color-brand-700)]' : 'text-[var(--color-ink)]',
                  )}
                >
                  {opt.label}
                </span>
              </span>
              {isSelected && (
                <span
                  aria-hidden="true"
                  className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white text-sm shadow-e1"
                >
                  <Icon icon="ri-check-line" />
                </span>
              )}
            </button>
          );
        })}

        {allOption && options.length > 1 && (
          <button
            type="button"
            onClick={() => {
              if (allSelected) {
                for (const opt of options) {
                  if (selected.has(opt.id)) onToggle(opt.id);
                }
              } else {
                for (const opt of options) {
                  if (!selected.has(opt.id)) onToggle(opt.id);
                }
              }
            }}
            disabled={disabled}
            aria-pressed={allSelected}
            className={cn(
              'group relative flex items-center gap-2 rounded-[var(--radius-md)] border border-dashed px-3 py-2 text-left transition-all min-h-10',
              allSelected
                ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] shadow-e1 ring-2 ring-[var(--color-brand-tint-2)]'
                : 'border-[var(--color-line-3)] bg-[var(--color-wash)] text-[var(--color-ink-2)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]',
              disabled && 'cursor-not-allowed hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)] hover:text-[var(--color-ink-2)]',
            )}
          >
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-md text-sm shadow-e1 transition-colors',
                allSelected
                  ? 'bg-[var(--color-brand-600)] text-white'
                  : 'bg-[var(--color-surface)] text-[var(--color-ink-3)] border border-[var(--color-line-2)]',
              )}
              aria-hidden="true"
            >
              <Icon icon="ri-checkbox-multiple-line" />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  'block text-sm font-semibold truncate',
                  allSelected ? 'text-[var(--color-brand-700)]' : 'text-[var(--color-ink-2)]',
                )}
              >
                {allOptionLabel ?? tAccess('locationAll')}
              </span>
            </span>
            {allSelected && (
              <span
                aria-hidden="true"
                className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white text-sm shadow-e1"
              >
                <Icon icon="ri-check-line" />
              </span>
            )}
          </button>
        )}

        {needsToggle && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            disabled={disabled}
            className="col-span-full inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-3)] bg-[var(--color-wash)] px-3 py-2 text-sm font-semibold text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon icon={showAll ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} className="text-base" />
            {showAll
              ? tAccess('showLess')
              : tAccess('showMore', { count: options.length - cap })}
          </button>
        )}
      </div>

      {disabled && (
        <p className="pl-10 text-sm text-[var(--color-ink-3)] italic">
          {tAccess('publicDisabledHint')}
        </p>
      )}

      {footerHint && !disabled && (
        <p className="pl-10 text-xs text-[var(--color-ink-3)] italic">{footerHint}</p>
      )}
    </AccessRow>
  );
}
