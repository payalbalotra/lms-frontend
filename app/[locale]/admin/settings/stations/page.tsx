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
        <p role="alert" className="text-sm text-red-600">
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
            {locations.map((l) => (
              <Link
                key={l.id}
                href={`/${locale}/admin/settings/stations?locationId=${encodeURIComponent(l.id)}`}
                className={
                  l.id === locationId
                    ? 'rounded-full bg-[var(--color-primary)] px-3 py-1 text-[var(--color-primary-foreground)]'
                    : 'rounded-full border border-[var(--color-border)] px-3 py-1 hover:bg-[var(--color-muted)]'
                }
              >
                {l.name}
              </Link>
            ))}
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