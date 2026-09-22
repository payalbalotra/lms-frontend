'use client';

/**
 * Compact People row on the Access step.
 *
 * Renders employees as compact rows (avatar · name + role/station ·
 * checkbox) inside a single column. The row format keeps a long roster
 * scannable — cards stacked in a grid waste space when each entry carries
 * the same shape.
 *
 * The row's trigger slot holds a search input that filters the list
 * in-place so the manager can quickly narrow a long roster down to one
 * or two entries. When the search is empty, every employee is shown.
 *
 * Overflow: when the filtered list is longer than `maxVisible` (default
 * 6), the picker collapses behind a "Show N more" toggle. The toggle
 * collapses against the *filtered* count so search results still respect
 * the cap. Selected employees are always rendered — they're the manager's
 * intent and should never hide behind a toggle.
 *
 * Lives in its own file because the employee row carries an avatar
 * (initials) instead of an icon — sharing one file with AccessBlock
 * would mean branching on the affordance.
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AccessRow } from './access-row';
import { ACCESS_EMPLOYEES, filterEmployees } from './access-data';
import { Icon } from '@/components/ui/icon';

export interface AccessAssignBlockProps {
  title: string;
  emptyLabel: string;
  countLabel: (count: number) => string;
  selected: Set<string>;
  onToggle: (id: string) => void;
  /** Cap on how many unselected employees render before the "Show N more"
   *  toggle appears. Defaults to 6 — same threshold as Roles and Stations. */
  maxVisible?: number;
  disabled?: boolean;
}

export function AccessAssignBlock({
  title,
  emptyLabel,
  countLabel,
  selected,
  onToggle,
  maxVisible = 6,
  disabled = false,
}: AccessAssignBlockProps): React.ReactElement {
  const tAccess = useTranslations('admin.library.new.access');
  const [search, setSearch] = React.useState('');
  const [showAll, setShowAll] = React.useState(false);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return ACCESS_EMPLOYEES;
    return filterEmployees(search);
  }, [search]);

  // Always render selected employees, even when they're outside the visible
  // window. Their ids float to the top so the manager sees their picks.
  const ordered = React.useMemo(() => {
    return [
      ...filtered.filter((e) => selected.has(e.id)),
      ...filtered.filter((e) => !selected.has(e.id)),
    ];
  }, [filtered, selected]);

  const cap = maxVisible;
  const needsToggle = ordered.length > cap;
  const visible = needsToggle && !showAll ? ordered.slice(0, cap) : ordered;

  return (
    <AccessRow
      icon="ri-team-line"
      title={title}
      count={selected.size}
      emptyLabel={emptyLabel}
      countLabel={countLabel}
      disabled={disabled}
      trigger={
        <div className="relative w-field-md">
          <Icon icon="ri-search-line" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-3)]" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
            placeholder={tAccess('rowSearchPlaceholder')}
            className="h-8 pl-8 pr-8 text-sm bg-[var(--color-surface)] border-[var(--color-line-2)] focus:border-[var(--color-brand-600)] disabled:cursor-not-allowed"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label={tAccess('clearSearch')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
            >
              <Icon icon="ri-close-line" className="text-sm" />
            </button>
          )}
        </div>
      }
    >
      <div className={cn('pl-10 pt-1 space-y-2', disabled && 'pointer-events-none')}>
        {visible.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-3 text-center text-sm text-[var(--color-ink-3)] italic">
            {tAccess('rowNoMatch', { query: search })}
          </p>
        ) : (
          visible.map((emp) => {
            const isAssigned = selected.has(emp.id);
            return (
              <button
                key={emp.id}
                type="button"
                onClick={() => onToggle(emp.id)}
                disabled={disabled}
                aria-pressed={isAssigned}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-4 py-2 text-left transition-all min-h-10',
                  isAssigned
                    ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-tint)] shadow-e1 ring-2 ring-[var(--color-brand-tint-2)]'
                    : 'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)]',
                  disabled && 'cursor-not-allowed hover:bg-[var(--color-surface)] hover:border-[var(--color-line-2)]',
                )}
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase shadow-e1',
                    isAssigned
                      ? 'bg-[var(--color-brand-600)] text-white'
                      : 'bg-[var(--color-panel)] text-[var(--color-ink-2)] border border-[var(--color-line-2)]',
                  )}
                  aria-hidden="true"
                >
                  {isAssigned ? <Icon icon="ri-check-line" /> : emp.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-sm font-semibold truncate',
                      isAssigned ? 'text-[var(--color-brand-700)]' : 'text-[var(--color-ink)]',
                    )}
                  >
                    {emp.name}
                  </span>
                  <span className="block text-sm text-[var(--color-ink-2)] truncate">
                    {emp.role} · {emp.station}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors',
                    isAssigned
                      ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white'
                      : 'border-[var(--color-line-3)] bg-[var(--color-surface)] text-transparent group-hover:border-[var(--color-brand-600)]',
                  )}
                >
                  {isAssigned && <Icon icon="ri-check-line" className="text-sm" />}
                </span>
              </button>
            );
          })
        )}

        {needsToggle && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            disabled={disabled}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-3)] bg-[var(--color-wash)] px-3 py-2 text-sm font-semibold text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-brand-600)] hover:bg-[var(--color-surface)] hover:text-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon icon={showAll ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} className="text-base" />
            {showAll
              ? tAccess('showLess')
              : tAccess('showMore', { count: ordered.length - cap })}
          </button>
        )}
      </div>

      {disabled && (
        <p className="pl-10 text-sm text-[var(--color-ink-3)] italic">
          {tAccess('publicDisabledHint')}
        </p>
      )}
    </AccessRow>
  );
}
