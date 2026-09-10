import * as React from 'react';
import { cookies } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';
import { listLocations, ApiException } from '@/lib/api';
import type { Location } from '@/lib/types';
import { LocationsManager } from './locations-manager';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function LocationsSettingsPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let locations: Location[] = [];
  try {
    const result = await listLocations(cookieHeader);
    locations = result.locations;
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

  return <LocationsManager locale={locale} initialLocations={locations} />;
}