'use client';

/**
 * Access step on the new-procedure wizard.
 *
 * Composes four blocks: Location → Role → Station → Assign. Multi-select on
 * every block; assignments are local component state and are not persisted
 * (this is the demo surface described in the brief).
 *
 * Lives in its own file so the wizard can render `<AccessScreen />` without
 * any of the block code being interleaved with the wizard's other step
 * markup. Merge conflicts only touch the import line in the wizard.
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AccessBlock } from './access-block';
import { AccessAssignBlock } from './access-assign-block';
import {
  ACCESS_LOCATIONS,
  ACCESS_ROLES,
  ACCESS_STATIONS,
  toggleSet,
} from './access-data';

export function AccessScreen(): React.ReactElement {
  const tAccess = useTranslations('admin.library.new.access');

  const [selectedLocations, setSelectedLocations] = React.useState<Set<string>>(new Set());
  const [selectedRoles, setSelectedRoles] = React.useState<Set<string>>(new Set());
  const [selectedStations, setSelectedStations] = React.useState<Set<string>>(new Set());
  const [assignedEmployees, setAssignedEmployees] = React.useState<Set<string>>(new Set());
  const [assignSearch, setAssignSearch] = React.useState('');

  return (
    <div className="space-y-6">
      {/* Page-level heading for the access step */}
      <header className="flex items-start justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] text-lg">
            <i aria-hidden="true" className="ri-shield-user-line" />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-ui)] text-[length:var(--text-md)] font-bold tracking-[-0.01em] text-[var(--color-ink)]">
              {tAccess('title')}
            </h2>
            <p className="mt-0.5 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
              {tAccess('subtitle')}
            </p>
          </div>
        </div>
      </header>

      <AccessBlock
        icon="ri-map-pin-line"
        title={tAccess('locationTitle')}
        subtitle={tAccess('locationSubtitle')}
        count={selectedLocations.size}
        emptyLabel={tAccess('locationEmpty')}
        items={ACCESS_LOCATIONS}
        selected={selectedLocations}
        onToggle={(id) => setSelectedLocations((prev) => toggleSet(prev, id))}
        hint={tAccess('locationHint')}
      />

      <AccessBlock
        icon="ri-user-star-line"
        title={tAccess('roleTitle')}
        subtitle={tAccess('roleSubtitle')}
        count={selectedRoles.size}
        emptyLabel={tAccess('roleEmpty')}
        items={ACCESS_ROLES}
        selected={selectedRoles}
        onToggle={(id) => setSelectedRoles((prev) => toggleSet(prev, id))}
        hint={tAccess('roleHint')}
      />

      <AccessBlock
        icon="ri-store-2-line"
        title={tAccess('stationTitle')}
        subtitle={tAccess('stationSubtitle')}
        count={selectedStations.size}
        emptyLabel={tAccess('stationEmpty')}
        items={ACCESS_STATIONS}
        selected={selectedStations}
        onToggle={(id) => setSelectedStations((prev) => toggleSet(prev, id))}
        hint={tAccess('stationHint')}
      />

      <AccessAssignBlock
        title={tAccess('assignTitle')}
        subtitle={tAccess('assignSubtitle')}
        emptyLabel={tAccess('assignEmpty')}
        searchPlaceholder={tAccess('assignSearchPlaceholder')}
        hint={tAccess('assignHint')}
        selectedCount={assignedEmployees.size}
        selectedLabel={(count) => tAccess('assignSelected', { count })}
        selected={assignedEmployees}
        onToggle={(id) => setAssignedEmployees((prev) => toggleSet(prev, id))}
        search={assignSearch}
        onSearchChange={setAssignSearch}
      />
    </div>
  );
}
