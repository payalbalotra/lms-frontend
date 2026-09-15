import type { ReactNode } from 'react';
import * as React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';
import { fetchMe, logout } from '@/lib/api';
import { AdminShell } from './admin-shell';

/**
 * Admin layout — server-side auth + locale, then hands the rendered
 * children to the client AdminShell which owns the sidebar / drawer.
 *
 * The auth check stays here (server) so the cookie is read on the
 * server with `cookies()` and we can `redirect()` before any client
 * code runs. The shell stays client because it owns drawer state.
 */

interface AdminLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AdminLayout({ children, params }: AdminLayoutProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let employee;
  try {
    const me = await fetchMe(cookieHeader);
    employee = me.employee;
  } catch {
    redirect(`/${locale}/login`);
  }

  if (employee.clearanceLevel !== 'master') {
    redirect(`/${locale}/employee/assigned`);
  }

  async function signOut(): Promise<void> {
    'use server';
    await logout();
    redirect(`/${locale}/login`);
  }

  return (
    <AdminShell
      locale={locale}
      employee={{ id: employee.id, name: employee.name, clearanceLevel: employee.clearanceLevel }}
      signOutAction={signOut}
    >
      {children}
    </AdminShell>
  );
}