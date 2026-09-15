import * as React from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  listLocations,
  listStations,
  ApiException,
} from '@/lib/api';
import type { Location, Station } from '@/lib/types';
import { StationsManager } from './stations-manager';

const DEFAULT_LOCATION = 'loc-main';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ locationId?: string }>;
}

export default async function StationsSettingsPage({
  params,
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const locationId = sp.locationId ?? DEFAULT_LOCATION;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let stations: Station[] = [];
  let locations: Location[] = [];
  try {
    const s = await listStations(locationId, cookieHeader, { includeArchived: true });
    stations = s.stations;
    const l = await listLocations(cookieHeader);
    locations = l.locations;
  } catch (err) {
    if (err instanceof ApiException) {
      return (
        <p role="alert" className="text-sm text-[var(--color-bad)]">
          {err.code}
        </p>
      );
    }
    throw err;
  }

  const t = await getTranslations('admin');
  const currentLocation = locations.find((l) => l.id === locationId) ?? locations[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t('settingsLocationLabel')}: <span className="font-mono">{locationId}</span>
          {currentLocation && currentLocation.id !== locationId
            ? ` (${currentLocation.name})`
            : null}
        </p>
        {locations.length > 1 ? (
          <div className="flex flex-wrap gap-2 text-sm">
            {locations.map((l) => {
              const active = l.id === locationId;
              return (
                <Link
                  key={l.id}
                  href={`/${locale}/admin/settings/stations?locationId=${encodeURIComponent(l.id)}`}
                  className={
                    active
                      ? 'inline-flex items-center rounded-full bg-[var(--color-brand-600)] px-3 py-1 text-xs font-medium text-white'
                      : 'inline-flex items-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-panel)]'
                  }
                >
                  {l.name}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>

      <StationsManager
        locale={locale}
        initialStations={stations}
        locations={locations}
        locationId={locationId}
      />
    </div>
  );
}