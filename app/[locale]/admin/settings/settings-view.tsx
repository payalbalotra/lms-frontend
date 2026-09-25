'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { LuX, LuTriangleAlert } from 'react-icons/lu';
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

type PanelKey = 'stations' | 'roles' | 'locations';

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
}

interface SettingsViewProps {
  stations: Station[];
  roles: Role[];
  locations: Location[];
  locationId: string | null;
  labels: SettingsViewLabels & StationsManagerLabels & RolesManagerLabels & LocationsManagerLabels;
}

type Chip = { id: string; name: string; count?: number; isArchived?: boolean };

export function SettingsView({
  stations,
  roles,
  locations,
  locationId,
  labels,
}: SettingsViewProps): React.ReactElement {
  const [expanded, setExpanded] = React.useState<Record<PanelKey, string | null>>({
    stations: null,
    roles: null,
    locations: null,
  });
  const [stationsState, setStationsState] = React.useState<StationsManagerState>({ mode: 'closed' });
  const [rolesState, setRolesState] = React.useState<RolesManagerState>({ mode: 'closed' });
  const [locationsState, setLocationsState] = React.useState<LocationsManagerState>({ mode: 'closed' });

  const stationChips: Chip[] = stations.map((s) => ({
    id: s.id,
    name: s.name,
    count: DEMO_COUNTS[s.id] ?? 0,
    isArchived: s.isArchived,
  }));
  const roleChips: Chip[] = roles.map((r) => ({
    id: r.id,
    name: r.name,
    count: DEMO_COUNTS[r.id] ?? 0,
  }));
  const locationChips: Chip[] = locations.map((l) => ({
    id: l.id,
    name: l.name,
    count: DEMO_COUNTS[l.id] ?? 0,
  }));

  function toggleChip(panel: PanelKey, id: string): void {
    setExpanded((prev) => ({ ...prev, [panel]: prev[panel] === id ? null : id }));
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:items-stretch">
        <SettingsPanel
          heading={labels.stationsHeading}
          chips={stationChips}
          archivedBadge={labels.archivedBadge}
          emptyText={labels.emptyStations}
          expandedId={expanded.stations}
          onChipClick={(id) => toggleChip('stations', id)}
          onChipEdit={(id) => {
            const s = stations.find((x) => x.id === id) ?? null;
            if (s) setStationsState({ mode: 'edit', entity: s });
          }}
          onChipDelete={(id) => {
            const s = stations.find((x) => x.id === id) ?? null;
            if (s) setStationsState({ mode: 'edit', entity: s });
          }}
          expansionPlaceholder={labels.employeesPlaceholder}
          addLabel={labels.addStation}
          onAdd={() => setStationsState({ mode: 'create' })}
          addInputPlaceholder="Station name"
          addSubmitLabel="Create"
          addCancelLabel="Cancel"
          deleteConfirmLabel="Remove this station?"
          deleteCancelLabel="Keep"
          deleteActionLabel="Remove"
        />
        <SettingsPanel
          heading={labels.rolesHeading}
          chips={roleChips}
          archivedBadge={labels.archivedBadge}
          emptyText={labels.emptyRoles}
          expandedId={expanded.roles}
          onChipClick={(id) => toggleChip('roles', id)}
          onChipEdit={(id) => {
            const r = roles.find((x) => x.id === id) ?? null;
            if (r) setRolesState({ mode: 'edit', entity: r });
          }}
          onChipDelete={(id) => {
            const r = roles.find((x) => x.id === id) ?? null;
            if (r) setRolesState({ mode: 'edit', entity: r });
          }}
          expansionPlaceholder={labels.employeesPlaceholder}
          addLabel={labels.addRole}
          onAdd={() => setRolesState({ mode: 'create' })}
          addInputPlaceholder="Role name"
          addSubmitLabel="Create"
          addCancelLabel="Cancel"
          deleteConfirmLabel="Remove this role?"
          deleteCancelLabel="Keep"
          deleteActionLabel="Remove"
        />
        <SettingsPanel
          heading={labels.locationsHeading}
          chips={locationChips}
          archivedBadge={labels.archivedBadge}
          emptyText={labels.emptyLocations}
          expandedId={expanded.locations}
          onChipClick={(id) => toggleChip('locations', id)}
          onChipEdit={(id) => {
            const l = locations.find((x) => x.id === id) ?? null;
            if (l) setLocationsState({ mode: 'edit', entity: l });
          }}
          onChipDelete={(id) => {
            const l = locations.find((x) => x.id === id) ?? null;
            if (l) setLocationsState({ mode: 'edit', entity: l });
          }}
          expansionPlaceholder={labels.employeesPlaceholder}
          addLabel={labels.addLocation}
          onAdd={() => setLocationsState({ mode: 'create' })}
          addInputPlaceholder="Location name"
          addSubmitLabel="Create"
          addCancelLabel="Cancel"
          deleteConfirmLabel="Remove this location?"
          deleteCancelLabel="Keep"
          deleteActionLabel="Remove"
        />
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
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared backdrop + Escape-key hook
// ---------------------------------------------------------------------------

function useEscapeKey(onEscape: () => void): void {
  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onEscape();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onEscape]);
}

// ---------------------------------------------------------------------------
// AddPopover â€” inline create form anchored above the Add button
// ---------------------------------------------------------------------------

interface AddPopoverProps {
  inputPlaceholder: string;
  submitLabel: string;
  cancelLabel: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

function AddPopover({
  inputPlaceholder,
  submitLabel,
  cancelLabel,
  onSubmit,
  onCancel,
}: AddPopoverProps): React.ReactElement {
  const [value, setValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEscapeKey(onCancel);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) onSubmit(value.trim());
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" aria-hidden="true" onClick={onCancel} />
      {/* Popover â€” anchored above the Add button */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={inputPlaceholder}
        className="absolute bottom-full left-0 right-0 z-50 mb-2 rounded-2xl border border-[#e2ded4] bg-white p-5 shadow-xl"
      >
        <p className="mb-4 text-sm font-semibold text-[#1c1b19]">{inputPlaceholder}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={inputPlaceholder}
            maxLength={120}
            className="w-full rounded-xl border border-[#e2ded4] bg-[#faf9f6] px-4 py-2.5 text-sm text-[#1c1b19] placeholder:text-[#b0a99f] outline-none transition-colors focus:border-[#c94327] focus:ring-2 focus:ring-[#c94327]/15"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-[#e2ded4] bg-white py-2.5 text-sm font-medium text-[#1c1b19] transition-colors hover:bg-[#f4f1ea] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="flex-1 rounded-xl bg-[#c94327] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#b03920] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c94327]/40 disabled:opacity-40"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// DeleteConfirmPopover â€” bigger, polished confirmation dialog
// ---------------------------------------------------------------------------

interface DeleteConfirmPopoverProps {
  chipName: string;
  confirmLabel: string;
  cancelLabel: string;
  actionLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmPopover({
  chipName,
  confirmLabel,
  cancelLabel,
  actionLabel,
  onConfirm,
  onCancel,
}: DeleteConfirmPopoverProps): React.ReactElement {
  useEscapeKey(onCancel);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" aria-hidden="true" onClick={onCancel} />
      {/* Popover */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={confirmLabel}
        className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-[#e2ded4] bg-white p-5 shadow-xl"
      >
        {/* Icon + title */}
        <div className="mb-3 flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#fef2f2]">
            <LuTriangleAlert className="size-4 text-[#b91c1c]" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#1c1b19]">{confirmLabel}</p>
            <p className="mt-0.5 truncate text-xs text-[#7a7670]">{chipName}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="mb-4 border-t border-[#f0ece4]" />

        {/* Action buttons â€” full width */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full rounded-xl bg-[#b91c1c] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#991b1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c]/40"
          >
            {actionLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-xl border border-[#e2ded4] bg-white py-2.5 text-sm font-medium text-[#1c1b19] transition-colors hover:bg-[#f4f1ea] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// SettingsPanel
// ---------------------------------------------------------------------------

interface SettingsPanelProps {
  heading: string;
  chips: Chip[];
  archivedBadge: string;
  emptyText: string;
  expandedId: string | null;
  onChipClick: (id: string) => void;
  onChipEdit: (id: string) => void;
  onChipDelete: (id: string) => void;
  expansionPlaceholder: string;
  addLabel: string;
  onAdd: () => void;
  addInputPlaceholder: string;
  addSubmitLabel: string;
  addCancelLabel: string;
  deleteConfirmLabel: string;
  deleteCancelLabel: string;
  deleteActionLabel: string;
}

/**
 * One panel: heading + count pill, chip list with delete popover,
 * expansion slot, and an Add button that shows an inline create popover.
 */
function SettingsPanel({
  heading,
  chips,
  archivedBadge,
  emptyText,
  expandedId,
  onChipClick,
  onChipEdit,
  onChipDelete,
  expansionPlaceholder,
  addLabel,
  onAdd,
  addInputPlaceholder,
  addSubmitLabel,
  addCancelLabel,
  deleteConfirmLabel,
  deleteCancelLabel,
  deleteActionLabel,
}: SettingsPanelProps): React.ReactElement {
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
  const [showAddPopover, setShowAddPopover] = React.useState(false);

  return (
    <Card className="flex h-full flex-col rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-card)] shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="flex flex-1 flex-col gap-5 px-6 py-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-base font-bold leading-none tracking-tight text-[var(--color-ink)]">
            {heading}
          </h2>
          <span className="rounded-full bg-[#f4f1ea] px-2.5 py-0.5 text-xs font-medium tabular-nums text-[#7a7670]">
            {chips.length}
          </span>
        </div>

        {/* Chips */}
        {chips.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-2)]">{emptyText}</p>
        ) : (
          <ul role="list" className="flex flex-wrap gap-5">
            {chips.map((chip) => {
              const isExpanded = expandedId === chip.id;
              const isConfirming = pendingDeleteId === chip.id;

              return (
                <li key={chip.id} className="relative inline-flex">
                  <span
                    className={
                      'inline-flex items-center gap-3 rounded-full border px-6 py-3.5 text-base font-medium transition-colors ' +
                      (isExpanded
                        ? 'border-[var(--color-brand-700)] bg-[var(--color-brand-600)] text-white shadow-sm'
                        : 'border-[#ecd6be] bg-[var(--color-brand-tint)] text-[#1c1b19] hover:border-[#ddc4a4] hover:bg-[var(--color-brand-tint-2)]')
                    }
                  >
                    {/* Chip body */}
                    <button
                      type="button"
                      onClick={() => onChipClick(chip.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`chip-panel-${chip.id}`}
                      title={chip.name}
                      aria-label={chip.name}
                      className="inline-flex items-center gap-3"
                    >
                      <span className="max-w-[220px] truncate leading-none">{chip.name}</span>
                      {chip.isArchived ? (
                        <StatusPill tone="neutral" className="ml-0.5">
                          {archivedBadge}
                        </StatusPill>
                      ) : null}
                      {typeof chip.count === 'number' ? (
                        <span
                          className={
                            'inline-flex h-7 min-w-[28px] items-center justify-center rounded-full border px-2 text-sm font-normal leading-none ' +
                            (isExpanded
                              ? 'border-white/30 bg-white/20 text-white'
                              : 'border-[#ddd9cf] bg-white text-[#7a7670]')
                          }
                        >
                          {chip.count}
                        </span>
                      ) : null}
                    </button>

                    {/* Ã— remove button */}
                    <button
                      type="button"
                      aria-label={`Remove ${chip.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAddPopover(false);
                        setPendingDeleteId(isConfirming ? null : chip.id);
                      }}
                      className={
                        'inline-flex size-6 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] ' +
                        (isExpanded
                          ? 'bg-white/20 text-white hover:bg-white/30'
                          : 'bg-black/5 text-[#1c1b19]/70 hover:bg-black/10 hover:text-[#1c1b19]')
                      }
                    >
                      <LuX aria-hidden="true" className="size-3.5" />
                    </button>
                  </span>

                  {/* Delete confirmation popover */}
                  {isConfirming ? (
                    <DeleteConfirmPopover
                      chipName={chip.name}
                      confirmLabel={deleteConfirmLabel}
                      cancelLabel={deleteCancelLabel}
                      actionLabel={deleteActionLabel}
                      onConfirm={() => {
                        setPendingDeleteId(null);
                        onChipDelete(chip.id);
                      }}
                      onCancel={() => setPendingDeleteId(null)}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {/* Expansion slot */}
        {expandedId ? (
          <div
            id={`chip-panel-${expandedId}`}
            className="rounded-xl border border-dashed border-[var(--color-line-2)] bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-ink-2)]"
          >
            {expansionPlaceholder}
          </div>
        ) : null}

        {/* Add button + inline popover */}
        <div className="relative mt-auto pt-1">
          <button
            type="button"
            onClick={() => {
              setPendingDeleteId(null);
              setShowAddPopover((v) => !v);
            }}
            className="flex w-full items-center justify-start gap-2 rounded-xl border border-dashed border-[#dcd9cd] bg-transparent px-4 py-3 text-sm font-medium text-[#c94327] transition-colors hover:border-[#c94327]/40 hover:bg-[#fce8d4]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          >
            <span className="text-base font-bold leading-none">+</span>
            <span>{addLabel.startsWith('+') ? addLabel.slice(1).trim() : addLabel}</span>
          </button>

          {showAddPopover ? (
            <AddPopover
              inputPlaceholder={addInputPlaceholder}
              submitLabel={addSubmitLabel}
              cancelLabel={addCancelLabel}
              onSubmit={(_name) => {
                setShowAddPopover(false);
                // Route to the real drawer create flow which handles the API call
                onAdd();
              }}
              onCancel={() => setShowAddPopover(false)}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
