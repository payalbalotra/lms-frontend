import * as React from 'react';
import { cookies } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';
import { listRoles, ApiException } from '@/lib/api';
import type { Role } from '@/lib/types';
import { RolesManager } from './roles-manager';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function RolesSettingsPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let roles: Role[] = [];
  try {
    const result = await listRoles(cookieHeader);
    roles = result.roles;
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

  return <RolesManager locale={locale} initialRoles={roles} />;
}