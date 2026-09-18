import type { ReactNode } from 'react';
import * as React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';
import { fetchMe, ApiException, listLocations, logout } from '@/lib/api';
import { AdminShell } from './admin-shell';

/**
 * Admin layout — server-side auth + locale, then hands the rendered
 * children to the client AdminShell which owns the sidebar / drawer.
 *
 * The auth check stays here (server) so the cookie is read on the
 * server with `cookies()` and we can `redirect()` before any client
 * code runs. The shell stays client because it owns drawer state.
 *
 * The redirect-to-login path fires ONLY on a `SESSION_INVALID` reply
 * from the backend (401). Any other failure (transient network,
 * upstream 5xx, database blip) renders an inline error instead of
 * bouncing the user — a SESSION_INVALID on one parallel SSR fetch
 * shouldn't log a working user out.
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
  } catch (err) {
    if (!(err instanceof ApiException) || err.code !== 'SESSION_INVALID') {
      // Transient / unknown error — don't bounce the user to /login.
      // The page will render its own DashboardError panel.
      return <AuthGateError />;
    }
    redirect(`/${locale}/login`);
  }

  // The workspace name for the sidebar. A failure here is not worth blocking the
  // admin area for: the sidebar then shows only the section name.
  let workspace = '';
  try {
    const { locations } = await listLocations(cookieHeader);
    workspace = (locations.find((l) => l.id === employee.locationId) ?? locations[0])?.name ?? '';
  } catch {
    workspace = '';
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
      workspace={workspace}
      signOutAction={signOut}
    >
      {children}
    </AdminShell>
  );
}

/**
 * Inline error shown when the auth check fails for a reason other than
 * `SESSION_INVALID`. Avoids bouncing the user to /login on a transient
 * backend blip while still making the failure visible.
 */
function AuthGateError(): React.ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-admin)] px-4 py-12">
      <article className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-bad-tint)] bg-[var(--color-bad-tint)] p-6">
        <p className="text-sm font-semibold text-[var(--color-bad)]">
          Auth check failed
        </p>
        <p className="mt-1 text-sm text-[var(--color-ink)]">
          We couldn&rsquo;t confirm your session just now. Refresh the page to try again.
        </p>
      </article>
    </div>
  );
}