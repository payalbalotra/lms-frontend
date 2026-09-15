import * as React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { fetchMe, ApiException, listStations } from '@/lib/api';
import { cn } from '@/lib/utils';
import { WelcomeHero } from './components/WelcomeHero';
import { LibrarySearchHero } from './components/LibrarySearchHero';
import { CategoryTileGrid } from './components/CategoryTileGrid';
import { RecentlyReadList } from './components/RecentlyReadList';
import { NewThisMonthList } from './components/NewThisMonthList';
import { SideRail } from './components/SideRail';

/**
 * Employee dashboard — "what needs me", never "% complete" (DESIGN.md §8).
 *
 * Composition across viewports (DESIGN.md §5):
 *   - Phone (default):    single column, narrow, centered max-w
 *   - Tablet (md:):       two columns — main on the left, side rail
 *                         sticky on the right
 *   - Desktop (lg:):      wider container, same two-column composition
 *
 * Stage 2 status: the procedures endpoints aren't built yet, so the
 * "Recently read" and "New this month" lists render their honest empty
 * states. The side rail's "Procedure of the day" is also empty until
 * the manager-pinning feature ships. The page reads as designed either
 * way.
 */

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

export default async function EmployeeDashboardPage({
  params,
}: PageProps): Promise<React.ReactElement> {
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

  let stationName: string | null = null;
  if (employee.stationId) {
    try {
      const result = await listStations(employee.locationId, cookieHeader);
      stationName = result.stations.find((s) => s.id === employee.stationId)?.name ?? null;
    } catch {
      stationName = null;
    }
  }

  const t = await getTranslations('employee.dashboard');

  const recentlyRead: Parameters<typeof RecentlyReadList>[0]['rows'] = [];
  const newThisMonth: Parameters<typeof NewThisMonthList>[0]['rows'] = [];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Main column */}
        <div className="space-y-6 md:col-span-2 lg:col-span-1">
          <WelcomeHero
            name={employee.name}
            stationName={stationName}
            roleName={employee.roleId}
          />

          <LibrarySearchHero locale={locale} />

          <CategoryTileGrid locale={locale} />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <RecentlyReadList locale={locale} rows={recentlyRead} />
            <NewThisMonthList locale={locale} rows={newThisMonth} />
          </div>

          <div className="flex justify-center pt-2 sm:justify-start">
            <Link
              href={`/${locale}/procedures`}
              className={cn(
                'inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-pill)]',
                'bg-[var(--color-brand-600)] px-8 text-[length:var(--text-sm)] font-semibold text-white',
                'transition-colors duration-[180ms] ease-[var(--ease)]',
                'hover:bg-[var(--color-brand-700)] active:translate-y-px',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint-2)] focus-visible:ring-offset-2',
              )}
            >
              <i aria-hidden="true" className="ri-book-open-line text-[length:var(--text-lg)]" />
              {t('browseAll')}
            </Link>
          </div>
        </div>

        {/* Side rail — hidden on phone, appears at md+ as the right column.
            It is the place to put shift context that the main flow doesn't
            carry. On phone the rail drops below the main column via the
            grid; it doesn't disappear. */}
        <aside className="md:col-span-1 lg:col-span-1">
          <SideRail />
        </aside>
      </div>
    </main>
  );
}