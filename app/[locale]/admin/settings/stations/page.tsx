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
          className="text-[length:var(--text-sm)] font-semibold text-[var(--color-brand-700)] underline-offset-4 hover:underline"
        >
          {t('navLocations')} →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-brand-700)]">
            {t('settingsLocationEyebrow')}
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-[length:var(--text-xl)] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
            {activeLocation.name}
          </h2>
          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            {t('settingsLocationSub')}
          </p>
        </div>
        {locations.length > 1 ? (
          <div className="flex flex-wrap gap-2 text-sm">
            {locations.map((l) => {
              const active = l.id === activeLocation.id;
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
      </header>

      <StationsManager
        locale={locale}
        initialStations={stations}
        locations={locations}
        locationId={activeLocation.id}
      />
    </div>
  );
}