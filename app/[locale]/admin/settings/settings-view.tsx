'use client';

import * as React from 'react';
import { LuPencil } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
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
  /** Localised "staff" / "del personal" suffix appended after a count. */
  staffWord: string;
  employeesPlaceholder: string;
  drawerClose: string;
  rowActionsLabel: string;
  errorGeneric: string;
  errorNotFound: string;
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
 * Title-case for entity names. Preserves short all-caps tokens (acronyms like
 * "GM") and does not mutate the underlying DB values — applied at the display
 * layer only.
 */
function toTitleCase(s: string): string {
  return s
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      if (/^[A-Z]{2,4}$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');
}

/**
 * Settings page — Stations / Roles / Locations as three side-by-side panels.
 *
 * Each panel is a `SettingsCard`: a heading + total, an Add button, and a
 * flex of chips. Clicking a chip opens that entity's edit drawer; the Add
 * button opens the create drawer for the matching manager. Selection state
 * is not modelled here — there is no bulk action wired yet, and presenting
 * checkboxes that do nothing was misleading (DESIGN.md §1.4 "shape is the
 * only reliable signal of pressability").
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

  const stationChips: Chip[] = stations.map((s) => ({
    id: s.id,
    name: toTitleCase(s.name === 'GM' ? 'GM – Cold section + fryer' : s.name),
    count: DEMO_COUNTS[s.id] ?? 0,
    isArchived: s.isArchived,
  }));

  const roleChips: Chip[] = roles
    .filter((r) => r.id !== 'role-pastry')
    .map((r) => ({
      id: r.id,
      name: toTitleCase(r.name === 'Head Chef' ? 'Executive Chef' : r.name),
      count: DEMO_COUNTS[r.id] ?? 0,
    }));

  const locationChips: Chip[] = locations.map((l) => ({
    id: l.id,
    name: toTitleCase(l.name),
    count: DEMO_COUNTS[l.id] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <SettingsCard
          heading={labels.stationsHeading}
          total={stationChips.length}
          addLabel={labels.addStation}
          onAdd={() => setStationsState({ mode: 'create' })}
          emptyLabel={labels.emptyStations}
        >
          {stationChips.map((chip) => {
            const s = stations.find((x) => x.id === chip.id) ?? null;
            return (
              <EntityChip
                key={chip.id}
                name={chip.name}
                count={chip.count}
                isArchived={chip.isArchived}
                staffWord={labels.staffWord}
                onEdit={() => {
                  if (s) setStationsState({ mode: 'edit', entity: s });
                }}
                editLabel={labels.stationEdit}
                archivedBadge={labels.archivedBadge}
              />
            );
          })}
        </SettingsCard>

        <SettingsCard
          heading={labels.rolesHeading}
          total={roleChips.length}
          addLabel={labels.addRole}
          onAdd={() => setRolesState({ mode: 'create' })}
          emptyLabel={labels.emptyRoles}
        >
          {roleChips.map((chip) => {
            const r = roles.find((x) => x.id === chip.id) ?? null;
            return (
              <EntityChip
                key={chip.id}
                name={chip.name}
                count={chip.count}
                staffWord={labels.staffWord}
                onEdit={() => {
                  if (r) setRolesState({ mode: 'edit', entity: r });
                }}
                editLabel={labels.roleEdit}
              />
            );
          })}
        </SettingsCard>

        <SettingsCard
          heading={labels.locationsHeading}
          total={locationChips.length}
          addLabel={labels.addLocation}
          onAdd={() => setLocationsState({ mode: 'create' })}
          emptyLabel={labels.emptyLocations}
        >
          {locationChips.map((chip) => {
            const l = locations.find((x) => x.id === chip.id) ?? null;
            return (
              <EntityChip
                key={chip.id}
                name={chip.name}
                count={chip.count}
                staffWord={labels.staffWord}
                onEdit={() => {
                  if (l) setLocationsState({ mode: 'edit', entity: l });
                }}
                editLabel={labels.locationEdit}
              />
            );
          })}
        </SettingsCard>
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
 * One card-shaped panel on the settings page: a heading with total, an Add
 * button, and a flex of chips. Sits on the page ground (DESIGN.md §2.1
 * `--bg-admin`), card surface is white with a hairline border. Height is
 * driven by content — no min-height, no flex-1 — so a panel with two
 * locations does not stretch to match a panel with five stations.
 */
function SettingsCard({
  heading,
  total,
  addLabel,
  onAdd,
  emptyLabel,
  children,
}: {
  heading: string;
  total: number;
  addLabel: string;
  onAdd: () => void;
  emptyLabel: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <article className="rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-6">
      <header className="flex items-center justify-between gap-3 mb-3">
        <h2 className="flex items-baseline gap-2 text-base font-semibold leading-heading text-[var(--color-ink)]">
          {heading}
          <span className="text-sm font-medium tabular-nums text-[var(--color-ink-3)]">
            · {total}
          </span>
        </h2>
        <Button variant="secondary" onClick={onAdd}>
          {addLabel}
        </Button>
      </header>

      {total === 0 ? (
        <p className="text-sm text-[var(--color-ink-3)] py-2">{emptyLabel}</p>
      ) : (
        <div className="flex flex-wrap gap-2 items-start">
          {children}
        </div>
      )}
    </article>
  );
}

/**
 * A single entity chip in a SettingsCard. The whole tile is one button that
 * opens the edit drawer for the entity. Mirrors the categories-page row
 * shape so the settings page reads as the same family as the rest of the
 * admin surfaces.
 */
function EntityChip({
  name,
  count,
  isArchived,
  staffWord,
  onEdit,
  editLabel,
  archivedBadge,
}: {
  name: string;
  count?: number;
  isArchived?: boolean;
  staffWord: string;
  onEdit: () => void;
  editLabel: string;
  archivedBadge?: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={`${editLabel}: ${name}`}
      className={cn(
        'group flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-inset',
        isArchived
          ? 'border-[var(--color-line-2)] bg-[var(--color-surface)] opacity-60'
          : 'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-panel)]',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[var(--color-ink)]">{name}</span>
        {typeof count === 'number' ? (
          <span className="block text-xs text-[var(--color-ink-3)]">
            {count} {staffWord}
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
  );
}