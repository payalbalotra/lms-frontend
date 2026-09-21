'use client';

/**
 * Compact People row on the Access step.
 *
 * Same small-tab affordance as Locations / Roles / Stations — every
 * employee renders as a tab in a 4-column grid showing initials (or a
 * check icon when assigned) plus their name. Clicking a tab toggles
 * assignment.
 *
 * The row's trigger slot holds a search input that filters the tab
 * list in-place so the manager can quickly narrow a long roster down
 * to one or two tabs. When the search is empty, every employee is
 * shown. The grid wraps responsively (2-up → 3-up → 4-up).
 *
 * Lives in its own file because the employee tab carries an avatar
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
  disabled?: boolean;
}

export function AccessAssignBlock({
  title,
  emptyLabel,
  countLabel,
  selected,
  onToggle,
  disabled = false,
}: AccessAssignBlockProps): React.ReactElement {
  const tAccess = useTranslations('admin.library.new.access');
  const [search, setSearch] = React.useState('');

  const filtered = React.useMemo(() => {
    if (!search.trim()) return ACCESS_EMPLOYEES;
    return filterEmployees(search);
  }, [search]);

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
      <div
        className={cn(
          'grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 pl-10 pt-1',
          disabled && 'pointer-events-none',
        )}
      >
        {filtered.length === 0 ? (
          <p className="col-span-full rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-3 text-center text-sm text-[var(--color-ink-3)] italic">
            {tAccess('rowNoMatch', { query: search })}
          </p>
        ) : (
          filtered.map((emp) => {
            const isAssigned = selected.has(emp.id);
            return (
              <button
                key={emp.id}
                type="button"
                onClick={() => onToggle(emp.id)}
                disabled={disabled}
                aria-pressed={isAssigned}
                className={cn(
                  'group relative flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-left transition-all min-h-10',
                  isAssigned
                    ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] shadow-e1 ring-2 ring-[var(--color-brand-tint-2)]'
                    : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)]',
                  disabled && 'cursor-not-allowed hover:bg-[var(--color-surface)] hover:border-[var(--color-line-2)] hover:text-[var(--color-ink)]',
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase shadow-e1',
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
                </span>
              </button>
            );
          })
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
