import type { ReactNode } from 'react';
import * as React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { fetchMe, logout, ApiException } from '@/lib/api';
import type { Employee } from '@/lib/types';
import { Button } from '@/components/ui/button';

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

  let employee: Employee;
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

  const t = await getTranslations('admin');

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-admin)]">
      <header className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 sm:px-6">
        <nav className="flex items-center gap-5 text-sm">
          <Link
            href={`/${locale}/admin/employees`}
            className="font-medium text-[var(--color-ink-2)] hover:text-[var(--color-brand-600)]"
          >
            {t('navEmployees')}
          </Link>
          <Link
            href={`/${locale}/admin/settings/stations`}
            className="font-medium text-[var(--color-ink-2)] hover:text-[var(--color-brand-600)]"
          >
            {t('navSettings')}
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/employee/assigned`}
            className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-brand-600)]"
          >
            ← {t('backToApp')}
          </Link>
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