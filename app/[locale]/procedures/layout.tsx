import type { ReactNode } from 'react';
import * as React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';
import { ApiException, fetchMe, listLocations, logout } from '@/lib/api';
import { AdminShell } from '@/app/[locale]/admin/admin-shell';

/**
 * Procedures routes are shared between admin and employee (both link here from
 * their own surfaces), so they live outside both the /admin and /employee
 * sub-trees. This layout picks the right shell by role: admins get the
 * `AdminShell` (sidebar + sticky top bar) so they keep the library nav
 * context; employees get the bare page and rely on the per-page `TabBar` they
 * already render. The pages themselves stay role-aware and skip the
 * `TabBar` when the role is admin.
 *
 * Force per-request SSR — the cookie-based auth check has to run on the
 * server, and a cached build-time redirect would log every user out.
 */
export const dynamic = 'force-dynamic';

interface ProceduresLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function ProceduresLayout({ children, params }: ProceduresLayoutProps): Promise<React.ReactElement> {
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
  } catch (err) {
    if (err instanceof ApiException) redirect(`/${locale}/login`);
    redirect(`/${locale}/login`);
  }

  if (employee.role !== 'admin') {
    // Employees keep the page as-is — the per-page `TabBar` is their chrome.
    return <>{children}</>;
  }

  // Workspace name for the sidebar brand block. A failure here shouldn't
  // block the page — the sidebar falls back to its own title label, matching
  // the behaviour of /admin/layout.
  let workspace = '';
  try {
    const { locations } = await listLocations(cookieHeader);
    workspace =
      (locations.find((l) => l.id === employee.locationId) ?? locations[0])?.name ?? '';
  } catch {
    workspace = '';
  }

  async function signOut(): Promise<void> {
    'use server';
    await logout();
    redirect(`/${locale}/login`);
  }

  return (
    <AdminShell
      locale={locale}
      employee={{ id: employee.id, name: employee.name, role: employee.role }}
      workspace={workspace}
      signOutAction={signOut}
    >
      {children}
    </AdminShell>
  );
}
