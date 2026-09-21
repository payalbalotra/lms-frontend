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
import { FilterChips } from '@/components/ui/filter-chips';

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

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let stations: Station[] = [];
  let locations: Location[] = [];
  try {
    const l = await listLocations(cookieHeader);
    locations = l.locations;
    // Resolve the active location: explicit ?locationId=, else first real location.
    const requested = sp.locationId;
    const activeId =
      (requested && locations.some((loc) => loc.id === requested) ? requested : null) ??
      locations[0]?.id ??
      null;
    if (activeId) {
      const s = await listStations(activeId, cookieHeader, { includeArchived: true });
      stations = s.stations;
    }
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
  const activeLocation =
    locations.find((l) => l.id === sp.locationId) ?? locations[0] ?? null;

  if (!activeLocation) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t('noLocations')}
        </p>
        <Link
          href={`/${locale}/admin/settings/locations`}
          className="text-sm font-semibold text-[var(--color-brand-700)] underline-offset-4 hover:underline"
        >
          {t('navLocations')} →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {locations.length > 1 ? (
        <div className="space-y-2">
          <span className="block text-sm font-semibold text-[var(--color-ink-3)]">
            {t('settingsLocationEyebrow')}
          </span>
          <FilterChips
            label={t('settingsLocationSub')}
            value={activeLocation.id}
            chips={locations.map((l) => ({
              value: l.id,
              label: l.name,
              href: `/${locale}/admin/settings/stations?locationId=${encodeURIComponent(l.id)}`,
            }))}
          />
        </div>
      ) : null}

      <StationsManager
        locale={locale}
        initialStations={stations}
        locations={locations}
        locationId={activeLocation.id}
      />
    </div>
  );
}