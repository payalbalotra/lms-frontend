import type { ReactNode } from 'react';
import * as React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { fetchMe, logout, ApiException } from '@/lib/api';
import type { Employee } from '@/lib/types';
import { LuArrowUpRight, LuLogOut } from 'react-icons/lu';

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
              href={`/${locale}/admin`}
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-ink-2)] hover:text-[var(--color-brand-600)]"
            >
              {tCommon('admin')}
              {/* The same mark the admin bar uses on the link back here. */}
              <LuArrowUpRight aria-hidden="true" />
            </Link>
          ) : null}
          <form action={signOut}>
            {/* Sign out carries its own mark and stays quiet at rest: red is what
                a wrong tap looks like, not what the control looks like sitting
                there. It turns red on hover and on focus, where the intent is
                already there. */}
            <button
              type="submit"
              className="inline-flex min-h-tap-admin items-center gap-2 rounded-full px-4 text-sm font-medium text-[var(--color-ink-2)] transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)] focus-visible:bg-[var(--color-bad-tint)] focus-visible:text-[var(--color-bad)]"
            >
              <LuLogOut aria-hidden="true" className="text-md" />
              {t('signOut')}
            </button>
          </form>
        </div>
      </header>

      {/* A div, not a second <main>: the page inside brings its own, and a document
          has one main. The page also brings its own padding and its own reading
          column, so this one only has to fill the height. */}
      <div className="flex-1">{children}</div>
    </div>
  );
}