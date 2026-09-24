import type { ReactNode } from 'react';
import * as React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ApiException, fetchMe, listLocations, logout } from '@/lib/api';
import { readViewAs } from '@/lib/view-as-server';
import { AdminShell } from '@/app/[locale]/admin/admin-shell';
import { EmployeeTopBar } from '@/components/employee/employee-top-bar';

/**
 * Procedures routes are shared between admin and employee (both link here from
 * their own surfaces), so they live outside both the /admin and /employee
 * sub-trees. Procedures are reading content — every viewer gets the focused
 * phone-shaped reading chrome by default, so admins reading a procedure don't
 * end up inside a desktop `AdminShell` for a one-column document.
 *
 * `?as=admin` opts into the `AdminShell` (sidebar + sticky top bar) when an
 * admin explicitly wants the library nav context while reading. The demo seed
 * always resolves as admin, but the chrome here is driven by the override,
 * not the session, so both surfaces work pre-login. The proxy copies the
 * query value into `x-lms-view-as` request headers (see `proxy.ts`);
 * layouts don't receive searchParams, so we read it back from headers here.
 * See `lib/view-as`.
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

  // View-as override: `?as=admin` swaps the shell in for this request. We
  // still use `employee` (the real session) for fetching data, but the
  // chrome decision follows the override and defaults to employee — these
  // pages are reading content, and a logged-in admin clicking a procedure
  // from /admin/library should land in the focused reading view, not inside
  // a second AdminShell. Read from headers because layouts don't get
  // searchParams; the proxy injects the header (see proxy.ts).
  const viewOverride = await readViewAs();
  const effectiveRole = viewOverride ?? 'employee';

  async function signOut(): Promise<void> {
    'use server';
    await logout();
    redirect(`/${locale}/login`);
  }

  if (effectiveRole !== 'admin') {
    // Employees (or admins masquerading as employees via ?as=employee) get the
    // same top bar the /employee pages wear, with the per-page `TabBar` below.
    // Without it a cook reading a procedure had no theme switch and no way to
    // sign out, on the pages they spend the longest on.
    const t = await getTranslations('employee');
    const tCommon = await getTranslations('app');
    return (
      <div className="flex min-h-screen flex-col bg-[var(--color-bg)]">
        <EmployeeTopBar
          locale={locale}
          name={employee.name}
          isAdmin={employee.role === 'admin'}
          signOutAction={signOut}
          labels={{
            signedInAs: t('signedInAs', { name: employee.name }),
            signOut: t('signOut'),
            admin: tCommon('admin'),
            toDark: tCommon('themeToDark'),
            toLight: tCommon('themeToLight'),
          }}
        />
        <div className="flex-1">{children}</div>
      </div>
    );
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

  return (
    <AdminShell
      locale={locale}
      employee={{ id: employee.id, name: employee.name, role: effectiveRole }}
      workspace={workspace}
      signOutAction={signOut}
    >
      {children}
    </AdminShell>
  );
}
