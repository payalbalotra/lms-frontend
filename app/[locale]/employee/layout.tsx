import type { ReactNode } from 'react';
import * as React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { fetchMe, logout, ApiException } from '@/lib/api';
import type { Employee } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface EmployeeLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function EmployeeLayout({ children, params }: EmployeeLayoutProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  // Server-side auth check. The proxy.ts also short-circuits unauthenticated
  // requests, but the backend is the only authority — re-validate every render.
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

  // Server action: clears the cookie via the backend, then bounces to /login.
  async function signOut(): Promise<void> {
    'use server';
    await logout();
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations('employee');

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3 sm:px-6">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t('signedInAs', { name: employee.name })}
        </p>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            {t('signOut')}
          </Button>
        </form>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}