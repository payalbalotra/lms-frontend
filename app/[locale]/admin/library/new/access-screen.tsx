'use client';

/**
 * Access step on the new-procedure wizard.
 *
 * Top-level: AccessLevelSelector (Everyone / Restricted). When
 * "Everyone" is selected, the four rows below render inert and stay
 * inert until the manager flips back to Restricted — the selected sets
 * are preserved either way.
 *
 * Below that: four compact rows (Locations, Roles, Stations, People).
 * Each row is a thin wrapper around the same `AccessRow` layout — only
 * the option list and the picker affordance differ (Add button for the
 * first three, search input for People).
 *
 * Lives in its own file so the wizard renders `<AccessScreen />` without
 * any of the row / picker markup being interleaved with the wizard's
 * other step markup. Merge conflicts only touch the import + JSX in the
 * wizard.
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AccessBlock } from './access-block';
import { AccessAssignBlock } from './access-assign-block';
import { AccessLevelSelector, type AccessLevel } from './access-level-selector';
import { ACCESS_LOCATIONS, ACCESS_ROLES, ACCESS_STATIONS } from './access-data';
import { Icon } from '@/components/ui/icon';

interface AccessScreenProps {
  selectedLocations: Set<string>;
  selectedRoles: Set<string>;
  selectedStations: Set<string>;
  assignedEmployees: Set<string>;
  accessLevel: AccessLevel;
  onToggleLocation: (id: string) => void;
  onToggleRole: (id: string) => void;
  onToggleStation: (id: string) => void;
  onToggleEmployee: (id: string) => void;
  onChangeAccessLevel: (next: AccessLevel) => void;
}

export function AccessScreen({
  selectedLocations,
  selectedRoles,
  selectedStations,
  assignedEmployees,
  accessLevel,
  onToggleLocation,
  onToggleRole,
  onToggleStation,
  onToggleEmployee,
  onChangeAccessLevel,
}: AccessScreenProps): React.ReactElement {
  const tAccess = useTranslations('admin.library.new.access');

  const isRestricted = accessLevel === 'restricted';

  return (
    <div className="space-y-8">
      {/* Page-level heading */}
      <header className="flex items-start gap-3">
        <div className="flex size-tap-admin shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] text-lg">
          <Icon icon="ri-shield-user-line" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-[var(--color-ink-3)]">
            {tAccess('accessEyebrow')}
          </p>
          <h2 className="mt-0.5 font-[family-name:var(--font-ui)] text-md font-bold tracking-snug text-[var(--color-ink)]">
            {tAccess('accessTitle')}
          </h2>
          <p className="mt-0.5 text-sm text-[var(--color-ink-2)]">
            {tAccess('accessSubtitle')}
          </p>
        </div>
      </header>

      {/* Access-level choice */}
      <AccessLevelSelector value={accessLevel} onChange={onChangeAccessLevel} />

      {/* Restricted access rows */}
      <section
        aria-disabled={!isRestricted}
        className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-e1 transition-opacity"
      >
        <header className="mb-4">
          <p className="text-xs font-bold uppercase text-[var(--color-ink-3)]">
            {tAccess('restrictedEyebrow')}
          </p>
          <h3 className="mt-1 text-md font-bold tracking-snug text-[var(--color-ink)]">
            {tAccess('restrictedSectionTitle')}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-ink-2)]">
            {tAccess('restrictedSectionSubtitle')}
          </p>
        </header>

        <div className={isRestricted ? '' : 'pointer-events-none opacity-50'}>
          <AccessBlock
            icon="ri-map-pin-line"
            title={tAccess('locationTitle')}
            emptyLabel={tAccess('locationEmpty')}
            countLabel={(count) => tAccess('rowSelected', { count })}
            options={ACCESS_LOCATIONS}
            selected={selectedLocations}
            onToggle={onToggleLocation}
            columns={2}
          />

          <AccessBlock
            icon="ri-user-star-line"
            title={tAccess('roleTitle')}
            emptyLabel={tAccess('roleEmpty')}
            countLabel={(count) => tAccess('rowSelected', { count })}
            options={ACCESS_ROLES}
            selected={selectedRoles}
            onToggle={onToggleRole}
            columns={3}
          />

          <AccessBlock
            icon="ri-store-2-line"
            title={tAccess('stationTitle')}
            emptyLabel={tAccess('stationEmpty')}
            countLabel={(count) => tAccess('rowSelected', { count })}
            options={ACCESS_STATIONS}
            selected={selectedStations}
            onToggle={onToggleStation}
            columns={3}
          />

          <AccessAssignBlock
            title={tAccess('assignTitle')}
            emptyLabel={tAccess('assignEmpty')}
            countLabel={(count) => tAccess('rowSelected', { count })}
            selected={assignedEmployees}
            onToggle={onToggleEmployee}
          />
        </div>

        {!isRestricted && (
          <p className="mt-4 text-xs text-[var(--color-ink-3)] italic">
            {tAccess('publicDisabledHint')}
          </p>
        )}
      </section>
    </div>
  );
}
