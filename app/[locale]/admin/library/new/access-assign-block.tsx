'use client';

/**
 * People row on the Access step.
 *
 * Renders employees as compact cards in a 2-3 column grid so the manager
 * can scan the roster at a glance instead of scrolling a long list. Each
 * card carries the avatar (initials), name, role, and station.
 *
 * When at least one station is picked on the step above, employees from
 * that station float to the top of the grid under a small "On this
 * station" eyebrow. The rest of the roster follows underneath.
 *
 * The trigger slot holds a search input that filters the list in-place.
 * Selected employees are always rendered — they are the manager's intent.
 *
 * Lives in its own file because the employee card carries an avatar
 * (initials) instead of an icon — sharing one file with AccessBlock
 * would mean branching on the affordance.
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AccessRow } from './access-row';
import { ACCESS_EMPLOYEES, ACCESS_STATIONS, filterEmployees } from './access-data';
import { Icon } from '@/components/ui/icon';

export interface AccessAssignBlockProps {
  title: string;
  emptyLabel: string;
  countLabel: (count: number) => string;
  selected: Set<string>;
  onToggle: (id: string) => void;
  /** Stations picked on the step above. Employees whose `station` field
   *  matches any of these are floated to the top of the grid under a
   *  "On this station" eyebrow so the manager sees the right cooks first. */
  selectedStations?: Set<string>;
  /** Cap on how many unselected employees render before the "Show N more"
   *  toggle appears. Defaults to 9 — the grid view tolerates more rows
   *  than the list view did. */
  maxVisible?: number;
  disabled?: boolean;
}

export function AccessAssignBlock({
  title,
  emptyLabel,
  countLabel,
  selected,
  onToggle,
  selectedStations,
  maxVisible = 9,
  disabled = false,
}: AccessAssignBlockProps): React.ReactElement {
  const tAccess = useTranslations('admin.library.new.access');
  const [search, setSearch] = React.useState('');
  const [showAll, setShowAll] = React.useState(false);

  // Labels of the picked stations. `ACCESS_STATIONS[i].label` matches the
  // employee `station` field — that's how we know who works where.
  const pickedStationLabels = React.useMemo(() => {
    if (!selectedStations || selectedStations.size === 0) return new Set<string>();
    return new Set(
      ACCESS_STATIONS.filter((s) => selectedStations.has(s.id)).map((s) => s.label),
    );
  }, [selectedStations]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return ACCESS_EMPLOYEES;
    return filterEmployees(search);
  }, [search]);

  // Order:
  //   1. Selected employees (the manager's intent, regardless of station)
  //   2. Employees from a picked station (surfaced at the top under the
  //      "On this station" eyebrow below)
  //   3. Everyone else
  const ordered = React.useMemo(() => {
    const isPickedStation = (e: (typeof ACCESS_EMPLOYEES)[number]): boolean =>
      pickedStationLabels.has(e.station);
    const selectedEmps = filtered.filter((e) => selected.has(e.id));
    const stationEmps = filtered.filter((e) => !selected.has(e.id) && isPickedStation(e));
    const otherEmps = filtered.filter((e) => !selected.has(e.id) && !isPickedStation(e));
    return { selectedEmps, stationEmps, otherEmps };
  }, [filtered, selected, pickedStationLabels]);

  const flatOrdered: typeof ACCESS_EMPLOYEES = React.useMemo(
    () => [...ordered.selectedEmps, ...ordered.stationEmps, ...ordered.otherEmps],
    [ordered],
  );

  const cap = maxVisible;
  const needsToggle = flatOrdered.length > cap;
  const visible = needsToggle && !showAll ? flatOrdered.slice(0, cap) : flatOrdered;

  // Which of the visible entries fall into the "On this station" group?
  // Used to insert the eyebrow above the first non-selected station member.
  const visibleSelectedCount = ordered.selectedEmps.length;
  const stationEyebrowAt = pickedStationLabels.size > 0
    ? Math.min(visibleSelectedCount, visible.length)
    : -1;
  const otherEyebrowAt = pickedStationLabels.size > 0 && ordered.stationEmps.length > 0
    ? Math.min(visibleSelectedCount + ordered.stationEmps.length, visible.length)
    : -1;

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
      <div className={cn('pl-10 pt-1', disabled && 'pointer-events-none')}>
        {visible.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-3 text-center text-sm text-[var(--color-ink-3)] italic">
            {tAccess('rowNoMatch', { query: search })}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((emp, idx) => {
              const isAssigned = selected.has(emp.id);
              const showStationEyebrow = idx === stationEyebrowAt;
              const showOtherEyebrow = idx === otherEyebrowAt;
              return (
                <React.Fragment key={emp.id}>
                  {showStationEyebrow && (
                    <p className="col-span-full pt-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-3)]">
                      {tAccess('assignStationGroup', {
                        count: ordered.stationEmps.length,
                        station: Array.from(pickedStationLabels).join(', '),
                      })}
                    </p>
                  )}
                  {showOtherEyebrow && (
                    <p className="col-span-full pt-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-3)]">
                      {tAccess('assignOtherGroup')}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => onToggle(emp.id)}
                    disabled={disabled}
                    aria-pressed={isAssigned}
                    className={cn(
                      'group flex items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2 text-left transition-all min-h-10',
                      isAssigned
                        ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-tint)] shadow-e1 ring-2 ring-[var(--color-brand-tint-2)]'
                        : 'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)]',
                      disabled && 'cursor-not-allowed hover:bg-[var(--color-surface)] hover:border-[var(--color-line-2)]',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase shadow-e1',
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
                      <span className="block text-xs text-[var(--color-ink-3)] truncate">
                        {emp.role} · {emp.station}
                      </span>
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        )}

        {needsToggle && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            disabled={disabled}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-3)] bg-[var(--color-wash)] px-3 py-2 text-sm font-semibold text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-brand-600)] hover:bg-[var(--color-surface)] hover:text-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon icon={showAll ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} className="text-base" />
            {showAll
              ? tAccess('showLess')
              : tAccess('showMore', { count: flatOrdered.length - cap })}
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
