import type { ReactNode } from 'react';
import * as React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { fetchMe, logout, ApiException } from '@/lib/api';
import type { Employee } from '@/lib/types';
import { Button } from '@/components/ui/button';

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
      <header className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 sm:px-6">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t('signedInAs', { name: employee.name })}
        </p>
        <div className="flex items-center gap-3">
          {employee.clearanceLevel === 'master' ? (
            <Link
              href={`/${locale}/admin/employees`}
              className="text-xs font-medium text-[var(--color-ink-2)] hover:text-[var(--color-brand-600)]"
            >
              {tCommon('admin')}
            </Link>
          ) : null}
          <form action={signOut}>
            <Button type="submit" variant="neutral" size="sm">
              {t('signOut')}
            </Button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}