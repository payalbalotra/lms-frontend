import * as React from 'react';
import { cookies } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';
import { listLocations, listRoles, listStations, ApiException } from '@/lib/api';
import { NewEmployeeForm } from './new-employee-form';
import type { Location, Role, Station } from '@/lib/types';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewEmployeePage({ params }: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const [locationsRes, rolesRes, stationsRes] = await Promise.all([
    listLocations(cookieHeader),
    listRoles(cookieHeader),
    listStations('loc-main', cookieHeader).catch(() => ({ stations: [] as Station[] })),
  ]);

  const locations: Location[] =
    locationsRes.locations.length > 0 ? locationsRes.locations : [{ id: 'loc-main', name: 'Main' }];
  const roles: Role[] = rolesRes.roles;
  const stations: Station[] = stationsRes.stations;

  if (roles.length === 0) {
    return (
      <p className="text-center text-sm text-[var(--color-muted-foreground)]">
        No roles seeded. Run <code className="rounded-md bg-[var(--color-panel)] px-1 py-0.5 text-xs">pnpm admin bootstrap</code> first.
      </p>
    );
  }

  return (
    <NewEmployeeForm
      locale={locale}
      locations={locations}
      roles={roles}
      initialStations={stations}
    />
  );

  // suppress unused-error if the catch wasn't reached (keeps types tidy)
  void ApiException;
}