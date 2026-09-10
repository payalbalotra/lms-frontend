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
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3 sm:px-6">
        <nav className="flex items-center gap-4 text-sm">
          <Link href={`/${locale}/admin/employees`} className="font-medium underline-offset-4 hover:underline">
            {t('navEmployees')}
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/employee/assigned`}
            className="text-xs text-[var(--color-muted-foreground)] underline-offset-4 hover:underline"
          >
            ← {t('backToApp')}
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              {t('signOut')}
            </Button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}