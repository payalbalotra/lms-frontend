import * as React from 'react';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  listLocations,
  listRoles,
  listStations,
  ApiException,
} from '@/lib/api';
import type { Location, Role, Station } from '@/lib/types';
import { PageHeader } from '@/components/admin/page-header';
import { FilterChips } from '@/components/ui/filter-chips';
import { SettingsView } from './settings-view';

interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Admin Settings — a single page that shows Stations / Roles / Locations
 * inline as three side-by-side panels. The subroute folders
 * (`stations/`, `roles/`, `locations/`) were folded into this view in the
 * same change so the Settings sidebar entry stays a single row.
 *
 * The fetch is parallel and failure-tolerant — the spec says a cook mid-shift
 * needs the page more than the trimmings, and the same logic applies to a
 * manager mid-config: a Stations outage should not blank the Roles panel.
 */
export default async function SettingsPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let stations: Station[] = [];
  let roles: Role[] = [];
  let locations: Location[] = [];
  let firstLocationId: string | null = null;
  let loadError: string | null = null;

  await Promise.all([
    listRoles(cookieHeader)
      .then((r) => {
        roles = r.roles;
      })
      .catch((err: unknown) => {
        if (err instanceof ApiException) loadError = err.code;
        else loadError = 'UNKNOWN';
      }),
    listLocations(cookieHeader)
      .then(async (r) => {
        locations = r.locations;
        firstLocationId = locations[0]?.id ?? null;
        if (firstLocationId) {
          try {
            const s = await listStations(firstLocationId, cookieHeader, {
              includeArchived: true,
            });
            stations = s.stations;
          } catch {
            // Stations fetch failing shouldn't blank the other panels.
          }
        }
      })
      .catch((err: unknown) => {
        if (err instanceof ApiException) loadError = err.code;
        else loadError = 'UNKNOWN';
      }),
  ]);

  const t = await getTranslations('admin');

  return (
    <>
      <PageHeader title={t('settingsHeading')} subtitle={t('settingsSubtitle')} />

      <FilterChips
        label={t('settingsHeading')}
        value="setup"
        chips={[{ value: 'setup', label: t('settingsEyebrow') }]}
      />

      {loadError ? (
        <p role="alert" className="text-sm text-[var(--color-bad)]">
          {loadError}
        </p>
      ) : null}

      <SettingsView
        stations={stations}
        roles={roles}
        locations={locations}
        locationId={firstLocationId}
        labels={{
          stationsHeading: t('settingsTabStations'),
          rolesHeading: t('settingsTabRoles'),
          locationsHeading: t('settingsTabLocations'),
          addStation: t('settingsAddStation'),
          addRole: t('settingsAddRole'),
          addLocation: t('settingsAddLocation'),
          archivedBadge: t('stationArchivedBadge'),
          emptyStations: t('stationsEmpty'),
          emptyRoles: t('rolesEmpty'),
          emptyLocations: t('locationsEmpty'),
          employeesPlaceholder: t('settingsPanelEmployeesPlaceholder'),
          drawerClose: t('drawerClose'),
          stationName: t('stationsFieldName'),
          stationLocation: t('stationsFieldLocation'),
          stationCreateHeading: t('stationsCreateHeading'),
          stationCreate: t('stationsCreate'),
          stationCreating: t('stationsCreating'),
          stationCancel: t('actionsCancel'),
          stationSave: t('actionsSave'),
          stationErrorLocationNotFound: t('stationsErrorLocationNotFound'),
          stationArchive: t('actionsArchive'),
          stationUnarchive: t('actionsUnarchive'),
          stationEdit: t('actionsEdit'),
          errorGeneric: t('errorGeneric'),
          errorNotFound: t('errorNotFound'),
          roleCreateHeading: t('rolesCreateHeading'),
          roleCreate: t('rolesCreate'),
          roleCreating: t('rolesCreating'),
          roleCancel: t('actionsCancel'),
          roleSave: t('actionsSave'),
          roleName: t('rolesFieldName'),
          roleDelete: t('actionsDelete'),
          roleEdit: t('actionsEdit'),
          roleErrorInUse: t('rolesErrorInUse'),
          locationCreateHeading: t('locationsCreateHeading'),
          locationCreate: t('locationsCreate'),
          locationCreating: t('locationsCreating'),
          locationCancel: t('actionsCancel'),
          locationSave: t('actionsSave'),
          locationName: t('locationsFieldName'),
          locationDelete: t('actionsDelete'),
          locationEdit: t('actionsEdit'),
          locationErrorInUse: t('locationsErrorInUse'),
          rowActionsLabel: t('rowActionsLabel'),
        }}
      />
    </>
  );
}
