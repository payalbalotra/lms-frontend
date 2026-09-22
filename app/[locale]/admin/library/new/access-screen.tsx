'use client';

/**
 * Access step on the new-procedure wizard.
 *
 * Top-level AccessLevelSelector (Everyone / Restricted) sits above four
 * compact rows: Locations (dropdown), Access level (single-select tier),
 * Job role (multi-select), Stations (multi-select with "All" shortcut),
 * and Assign (search + multi-select). When "Everyone" is picked, the
 * rows render inert and selections stay in state for the audit trail.
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AccessBlock } from './access-block';
import { AccessAssignBlock } from './access-assign-block';
import { AccessTierRow } from './access-tier-row';
import { AccessLevelSelector, type AccessLevel } from './access-level-selector';
import {
  ACCESS_LOCATIONS,
  ACCESS_JOB_ROLES,
  ACCESS_STATIONS,
} from './access-data';
import { Icon } from '@/components/ui/icon';

interface AccessScreenProps {
  selectedLocations: Set<string>;
  selectedTier: string | null;
  selectedJobRoles: Set<string>;
  selectedStations: Set<string>;
  assignedEmployees: Set<string>;
  accessLevel: AccessLevel;
  onToggleLocation: (id: string) => void;
  onChangeTier: (id: string | null) => void;
  onToggleJobRole: (id: string) => void;
  onToggleStation: (id: string) => void;
  onToggleEmployee: (id: string) => void;
  onChangeAccessLevel: (next: AccessLevel) => void;
}

export function AccessScreen({
  selectedLocations,
  selectedTier,
  selectedJobRoles,
  selectedStations,
  assignedEmployees,
  accessLevel,
  onToggleLocation,
  onChangeTier,
  onToggleJobRole,
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
          <p className="text-sm font-semibold uppercase text-[var(--color-ink-3)]">
            {tAccess('accessEyebrow')}
          </p>
          <h2 className="mt-0.5 font-[family-name:var(--font-ui)] text-md font-semibold tracking-snug text-[var(--color-ink)]">
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
          <p className="text-sm font-semibold uppercase text-[var(--color-ink-3)]">
            {tAccess('restrictedEyebrow')}
          </p>
          <h3 className="mt-1 text-md font-semibold tracking-snug text-[var(--color-ink)]">
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
            variant="dropdown"
          />

          {/* Access Level — single-select tier ("what can they do in the LMS?"). */}
          <AccessTierRow
            title={tAccess('tierTitle')}
            emptyLabel={tAccess('tierEmpty')}
            countLabel={(count) => tAccess('rowSelected', { count })}
            value={selectedTier}
            onChange={onChangeTier}
          />

          {/* Job Role — multi-select ("what is their job?"). */}
          <AccessBlock
            icon="ri-knife-line"
            title={tAccess('roleTitle')}
            emptyLabel={tAccess('roleEmpty')}
            countLabel={(count) => tAccess('rowSelected', { count })}
            options={ACCESS_JOB_ROLES}
            selected={selectedJobRoles}
            onToggle={onToggleJobRole}
            columns={3}
            maxVisible={6}
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
            allOption
            allOptionLabel={tAccess('stationAll')}
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
          <p className="mt-4 text-sm text-[var(--color-ink-3)] italic">
            {tAccess('publicDisabledHint')}
          </p>
        )}
      </section>
    </div>
  );
}
