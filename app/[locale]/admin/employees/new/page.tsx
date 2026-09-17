import * as React from 'react';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { listLocations, listRoles } from '@/lib/api';
import { NewEmployeeForm } from './new-employee-form';
import type { Location, Role } from '@/lib/types';

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

  const t = await getTranslations('admin');

  const [locationsRes, rolesRes] = await Promise.all([
    listLocations(cookieHeader),
    listRoles(cookieHeader),
  ]);

  const locations: Location[] = locationsRes.locations;
  const roles: Role[] = rolesRes.roles;

  if (locations.length === 0) {
    return (
      <p className="text-center text-sm text-[var(--color-muted-foreground)]">
        {t('noLocations')}
      </p>
    );
  }

  if (roles.length === 0) {
    return (
      <p className="text-center text-sm text-[var(--color-muted-foreground)]">
        {t('noRoles')}
      </p>
    );
  }

  return (
    <NewEmployeeForm
      locale={locale}
      locations={locations}
      roles={roles}
    />
  );
}