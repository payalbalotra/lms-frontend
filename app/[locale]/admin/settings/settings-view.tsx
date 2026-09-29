'use client';

import * as React from 'react';
import Link from 'next/link';
import { LuCheck, LuPencil, LuPlus } from 'react-icons/lu';
import { cn } from '@/lib/utils';
import type { Location, Role, Station } from '@/lib/types';
import {
  LocationsManager,
  type LocationsManagerLabels,
  type LocationsManagerState,
} from './locations/locations-manager';
import {
  RolesManager,
  type RolesManagerLabels,
  type RolesManagerState,
} from './roles/roles-manager';
import {
  StationsManager,
  type StationsManagerLabels,
  type StationsManagerState,
} from './stations/stations-manager';

const DEMO_COUNTS: Record<string, number> = {
  'stn-gm': 2,
  'stn-grill': 3,
  'stn-expo': 1,
  'stn-prep': 2,
  'stn-dish': 0,
  'role-exec': 1,
  'role-sous': 1,
  'role-cook': 4,
  'role-prep': 2,
  'role-pastry': 0,
  'role-dish': 0,
  'loc-main': 7,
  'loc-express': 2,
};

export interface SettingsViewLabels {
  stationsHeading: string;
  rolesHeading: string;
  locationsHeading: string;
  addStation: string;
  addRole: string;
  addLocation: string;
  archivedBadge: string;
  emptyStations: string;
  emptyRoles: string;
  emptyLocations: string;
  employeesPlaceholder: string;
  drawerClose: string;
  rowActionsLabel: string;
  errorGeneric: string;
  errorNotFound: string;
  /** Picked / total indicator on each card. */
  selectedCount: string;
  selectAll: string;
  clearSelection: string;
}

interface SettingsViewProps {
  stations: Station[];
  roles: Role[];
  locations: Location[];
  locationId: string | null;
  labels: SettingsViewLabels & StationsManagerLabels & RolesManagerLabels & LocationsManagerLabels;
}

type Chip = { id: string; name: string; count?: number; isArchived?: boolean };

/**
 * Settings page — Stations / Roles / Locations as three side-by-side panels.
 *
 * Each panel is a `MultiSelectCard`: a list of checkbox-style chips the
 * manager can pick to assemble a working subset (e.g. stations that share
 * a recipe). Clicking the chip body still opens the edit drawer for that
 * single entity — the checkbox on the left toggles selection only.
 *
 * Selection state is tracked per-panel. No bulk mutation is wired in this
 * view: it is the visual contract the rest of the product reads as
 * "select N of M". Wiring a bulk action is a future change.
 */
export function SettingsView({
  stations,
  roles,
  locations,
  locationId,
  labels,
}: SettingsViewProps): React.ReactElement {
  const [stationsState, setStationsState] = React.useState<StationsManagerState>({ mode: 'closed' });
  const [rolesState, setRolesState] = React.useState<RolesManagerState>({ mode: 'closed' });
  const [locationsState, setLocationsState] = React.useState<LocationsManagerState>({ mode: 'closed' });

  // Per-panel selection — sets of ids the manager has ticked. The edit
  // drawer and the selection checkbox are independent affordances, so
  // opening a drawer does not clear the selection.
  const [pickedStations, setPickedStations] = React.useState<ReadonlySet<string>>(new Set());
  const [pickedRoles, setPickedRoles] = React.useState<ReadonlySet<string>>(new Set());
  const [pickedLocations, setPickedLocations] = React.useState<ReadonlySet<string>>(new Set());

  // Map station chips, normalizing display name for GM if needed
  const stationChips: Chip[] = stations.map((s) => ({
    id: s.id,
    name: s.name === 'GM' ? 'GM – Cold section + fryer' : s.name,
    count: DEMO_COUNTS[s.id] ?? 0,
    isArchived: s.isArchived,
  }));

  // Map role chips, normalizing Head Chef to Executive Chef and excluding unused pastry if present
  const roleChips: Chip[] = roles
    .filter((r) => r.id !== 'role-pastry')
    .map((r) => ({
      id: r.id,
      name: r.name === 'Head Chef' ? 'Executive Chef' : r.name,
      count: DEMO_COUNTS[r.id] ?? 0,
    }));

  const locationChips: Chip[] = locations.map((l) => ({
    id: l.id,
    name: l.name,
    count: DEMO_COUNTS[l.id] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 items-stretch">
        <MultiSelectCard
          heading={labels.stationsHeading}
          total={stationChips.length}
          picked={pickedStations}
          onToggle={(id) =>
            setPickedStations((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onSelectAll={() =>
            setPickedStations(new Set(stationChips.filter((c) => !c.isArchived).map((c) => c.id)))
          }
          onClear={() => setPickedStations(new Set())}
          labels={{
            selectedCount: labels.selectedCount,
            selectAll: labels.selectAll,
            clearSelection: labels.clearSelection,
            empty: labels.emptyStations,
          }}
        >
          {stationChips.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-3)] py-2">{labels.emptyStations}</p>
          ) : (
            stationChips.map((chip) => {
              const s = stations.find((x) => x.id === chip.id) ?? null;
              return (
                <MultiSelectChip
                  key={chip.id}
                  name={chip.name}
                  count={chip.count}
                  isArchived={chip.isArchived}
                  isPicked={pickedStations.has(chip.id)}
                  onToggle={() => {
                    setPickedStations((prev) => {
                      const next = new Set(prev);
                      if (next.has(chip.id)) next.delete(chip.id);
                      else next.add(chip.id);
                      return next;
                    });
                  }}
                  onEdit={() => {
                    if (s) setStationsState({ mode: 'edit', entity: s });
                  }}
                  editLabel={labels.stationEdit}
                  archivedBadge={labels.archivedBadge}
                />
              );
            })
          )}
        </MultiSelectCard>

        <MultiSelectCard
          heading={labels.rolesHeading}
          total={roleChips.length}
          picked={pickedRoles}
          onToggle={(id) =>
            setPickedRoles((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onSelectAll={() => setPickedRoles(new Set(roleChips.map((c) => c.id)))}
          onClear={() => setPickedRoles(new Set())}
          labels={{
            selectedCount: labels.selectedCount,
            selectAll: labels.selectAll,
            clearSelection: labels.clearSelection,
            empty: labels.emptyRoles,
          }}
        >
          {roleChips.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-3)] py-2">{labels.emptyRoles}</p>
          ) : (
            roleChips.map((chip) => {
              const r = roles.find((x) => x.id === chip.id) ?? null;
              return (
                <MultiSelectChip
                  key={chip.id}
                  name={chip.name}
                  count={chip.count}
                  isPicked={pickedRoles.has(chip.id)}
                  onToggle={() => {
                    setPickedRoles((prev) => {
                      const next = new Set(prev);
                      if (next.has(chip.id)) next.delete(chip.id);
                      else next.add(chip.id);
                      return next;
                    });
                  }}
                  onEdit={() => {
                    if (r) setRolesState({ mode: 'edit', entity: r });
                  }}
                  editLabel={labels.roleEdit}
                />
              );
            })
          )}
        </MultiSelectCard>

        <MultiSelectCard
          heading={labels.locationsHeading}
          total={locationChips.length}
          picked={pickedLocations}
          onToggle={(id) =>
            setPickedLocations((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onSelectAll={() => setPickedLocations(new Set(locationChips.map((c) => c.id)))}
          onClear={() => setPickedLocations(new Set())}
          labels={{
            selectedCount: labels.selectedCount,
            selectAll: labels.selectAll,
            clearSelection: labels.clearSelection,
            empty: labels.emptyLocations,
          }}
        >
          {locationChips.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-3)] py-2">{labels.emptyLocations}</p>
          ) : (
            locationChips.map((chip) => {
              const l = locations.find((x) => x.id === chip.id) ?? null;
              return (
                <MultiSelectChip
                  key={chip.id}
                  name={chip.name}
                  count={chip.count}
                  isPicked={pickedLocations.has(chip.id)}
                  onToggle={() => {
                    setPickedLocations((prev) => {
                      const next = new Set(prev);
                      if (next.has(chip.id)) next.delete(chip.id);
                      else next.add(chip.id);
                      return next;
                    });
                  }}
                  onEdit={() => {
                    if (l) setLocationsState({ mode: 'edit', entity: l });
                  }}
                  editLabel={labels.locationEdit}
                />
              );
            })
          )}
        </MultiSelectCard>
      </div>

      <StationsManager
        state={stationsState}
        onStateChange={setStationsState}
        locations={locations}
        locationId={locationId}
        labels={labels}
      />
      <RolesManager state={rolesState} onStateChange={setRolesState} labels={labels} />
      <LocationsManager state={locationsState} onStateChange={setLocationsState} labels={labels} />
    </div>
  );
}

/**
 * One card-shaped panel on the settings page: a heading, an optional
 * select-all / clear toolbar that shows when something is picked, a flex
 * of chips, and a dashed "+ Add" footer.
 *
 * The card sits on `bg-admin` (DESIGN.md §3.3) so its outline is a card
 * edge, not the page edge — same family as the filter panels elsewhere.
 */
function MultiSelectCard({
  heading,
  total,
  picked,
  onSelectAll,
  onClear,
  labels,
  children,
}: {
  heading: string;
  total: number;
  picked: ReadonlySet<string>;
  onToggle?: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  labels: { selectedCount: string; selectAll: string; clearSelection: string; empty: string };
  children: React.ReactNode;
}): React.ReactElement {
  const pickedCount = picked.size;
  const allPicked = pickedCount > 0 && pickedCount === total;
  return (
    <article className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-6 min-h-[280px] shadow-e1">
      <header className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold leading-heading text-[var(--color-ink)]">
          {heading}
        </h2>
        <span className="text-xs font-medium tabular-nums text-[var(--color-ink-3)]">
          {total}
        </span>
      </header>

      {pickedCount > 0 ? (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-brand-tint)] bg-[var(--color-brand-tint)]/40 px-3 py-2">
          <p className="text-xs font-medium text-[var(--color-brand-700)]">
            {labels.selectedCount.replace('{picked}', String(pickedCount)).replace('{total}', String(total))}
          </p>
          <div className="flex items-center gap-2">
            {!allPicked ? (
              <button
                type="button"
                onClick={onSelectAll}
                className="text-xs font-medium text-[var(--color-brand-700)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] rounded-sm"
              >
                {labels.selectAll}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-[var(--color-brand-700)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] rounded-sm"
            >
              {labels.clearSelection}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 items-center content-start flex-1">
        {children}
      </div>
    </article>
  );
}

/**
 * A single chip in a MultiSelectCard. Mirrors the categories-page
 * `StationsPanel` card so picking stations looks the same in both places.
 *
 * Two affordances live on one tile: the checkbox on the left toggles
 * selection; the body opens the edit drawer. They are intentionally
 * separate so a manager can pick five stations and then open one of them
 * to edit without losing the others.
 */
function MultiSelectChip({
  name,
  count,
  isArchived,
  isPicked,
  onToggle,
  onEdit,
  editLabel,
  archivedBadge,
}: {
  name: string;
  count?: number;
  isArchived?: boolean;
  isPicked: boolean;
  onToggle: () => void;
  onEdit: () => void;
  editLabel: string;
  archivedBadge?: string;
}): React.ReactElement {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 transition-colors',
        'focus-within:ring-2 focus-within:ring-[var(--color-ring)] focus-within:ring-inset',
        isPicked
          ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-tint)]'
          : 'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-panel)]',
        isArchived && 'opacity-60',
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={isPicked}
        aria-label={name}
        onClick={onToggle}
        className={cn(
          'inline-flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1',
          isPicked
            ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white'
            : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-transparent',
        )}
      >
        <LuCheck className="text-[10px]" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none"
        aria-label={`${editLabel}: ${name}`}
      >
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate text-sm',
              isPicked ? 'font-semibold text-[var(--color-brand-700)]' : 'font-medium text-[var(--color-ink)]',
            )}
          >
            {name}
          </span>
          {typeof count === 'number' ? (
            <span className="block text-xs text-[var(--color-ink-3)]">
              {count}
            </span>
          ) : null}
        </span>
        {isArchived && archivedBadge ? (
          <span className="rounded-[var(--radius-sm)] bg-[var(--color-panel)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-ink-2)]">
            {archivedBadge}
          </span>
        ) : null}
        <LuPencil
          aria-hidden="true"
          className="size-3.5 shrink-0 text-[var(--color-ink-3)] group-hover:text-[var(--color-ink-2)]"
        />
      </button>
    </div>
  );
}
