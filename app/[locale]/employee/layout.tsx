import type { ReactNode } from 'react';
import * as React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { fetchMe, logout, ApiException } from '@/lib/api';
import type { Employee } from '@/lib/types';
import { EmployeeTopBar } from '@/components/employee/employee-top-bar';

// Force per-request SSR — without this Next.js prerenders the layout at build
// time when no dynamic API is observed at module-init, and the build-time
// `redirect('/login')` (because there are no cookies during build) gets
// cached and served to every request regardless of the incoming session.
export const dynamic = 'force-dynamic';

interface EmployeeLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function EmployeeLayout({ children, params }: EmployeeLayoutProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let employee: Employee;
  try {
    const me = await fetchMe(cookieHeader);
    employee = me.employee;
  } catch (err) {
    if (err instanceof ApiException) {
      redirect(`/${locale}/login`);
    }
    redirect(`/${locale}/login`);
  }

  async function signOut(): Promise<void> {
    'use server';
    await logout();
    redirect(`/${locale}/login`);
  }

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

      {/* A div, not a second <main>: the page inside brings its own, and a document
          has one main. The page also brings its own padding and its own reading
          column, so this one only has to fill the height. */}
      <div className="flex-1">{children}</div>
    </div>
  );
}