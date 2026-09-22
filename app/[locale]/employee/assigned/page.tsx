import * as React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ApiException, fetchMe, listCategories, listProcedures, listRoles, listStations } from '@/lib/api';
import type { Category, Procedure } from '@/lib/types';
import { Ask, CategoryGrid, ProcedureRows, WhoBar } from './components/EmployeeHome';
import { allergenWords, factsOf } from './components/procedure-facts';
import { TabBar } from '@/components/employee/tab-bar';

/**
 * The cook's home. Four things, in the order a phone is used mid-shift: who is
 * signed in, search, the categories of the library, and what is new.
 *
 * Note on data: the library list comes from the admin endpoint, which is what
 * exists today. The backend still owes an employee-scoped
 * `GET /api/procedures` filtered by clearance; until then a cook's home would
 * show 403 against the real API.
 */

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

const DAY = 24 * 60 * 60 * 1000;

export default async function EmployeeHomePage({ params }: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('employee.home');

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
    throw err;
  }

  // Each of these is optional context: a failure narrows the page, it does not
  // break it. A cook mid-shift needs the search box more than the trimmings.
  let categories: Category[] = [];
  let procedures: Procedure[] = [];
  let roleName: string | null = null;
  let stationName: string | null = null;
  // Pull the primary assignment off the (new) array shape. First entry is
  // the primary — see lib/api.ts createEmployee which seeds roleIds[0] /
  // stationIds[0] into the legacy single-column backend storage.
  const primaryRoleId = employee.roleIds[0];
  const primaryStationId = employee.stationIds[0];
  await Promise.all([
    listCategories(employee.locationId, {}, cookieHeader).then((r) => { categories = r.categories; }).catch(() => {}),
    listProcedures({}, cookieHeader).then((r) => { procedures = r.procedures; }).catch(() => {}),
    primaryRoleId
      ? listRoles(cookieHeader).then((r) => { roleName = r.roles.find((x) => x.id === primaryRoleId)?.name ?? null; }).catch(() => {})
      : Promise.resolve(),
    primaryStationId
      ? listStations(employee.locationId, cookieHeader)
          .then((r) => { stationName = r.stations.find((s) => s.id === primaryStationId)?.name ?? null; })
          .catch(() => {})
      : Promise.resolve(),
  ]);

  const published = procedures.filter((p) => p.status === 'published');
  const titleOf = (p: Procedure): string => (locale === 'es' ? p.titleEs || p.titleEn : p.titleEn || p.titleEs);
  const coverOf = (p: Procedure): string | undefined => {
    const body = p.bodyEn.blocks.length ? p.bodyEn : p.bodyEs;
    for (const b of body.blocks) if (b.kind === 'image' && b.src) return b.src;
    return undefined;
  };
  const categoryName = (c: Category | null): string =>
    c ? (locale === 'es' ? c.nameEs || c.nameEn : c.nameEn || c.nameEs) : t('uncategorised');

  const now = Date.now();
  const fresh = published
    .filter((p) => now - new Date(p.createdAt).getTime() <= 30 * DAY)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const rel = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const daysAgo = (iso: string): string => rel.format(Math.round((new Date(iso).getTime() - now) / DAY), 'day');

  // Changed since it was written: the laminated sheet at the station is the old
  // one, so a procedure that moved is worth reading again.
  const changed = published
    .filter((p) => p.updatedAt !== p.createdAt && now - new Date(p.updatedAt).getTime() <= 30 * DAY)
    .filter((p) => !fresh.some((f) => f.id === p.id))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  // Everything the two lists above did not show. A cook who is looking for a
  // procedure they read last month should not have to go to another screen for
  // it, and a short library is better shown than hidden behind "All procedures".
  const rest = published
    .filter((p) => !fresh.some((f) => f.id === p.id) && !changed.some((c) => c.id === p.id))
    .sort((a, b) => titleOf(a).localeCompare(titleOf(b), locale));

  const allLink = { href: `/${locale}/procedures`, label: t('browseAll') };
  const readsSpanish = employee.languagePref === 'es';
  const isEs = locale === 'es';
  const withWords = (f: ReturnType<typeof factsOf>) => ({
    ...f,
    allergens: allergenWords(f.allergens, isEs ? 'es' : 'en'),
  });
  const flagLabels = {
    allergen: (list: string) => t('flagAllergen', { list }),
    critical: t('flagCritical'),
    english: t('flagEnglishOnly'),
  };
  const row = (p: Procedure, meta: string) => ({
    procedure: p,
    cover: coverOf(p),
    title: titleOf(p),
    meta,
    flags: withWords(factsOf(p, readsSpanish)),
  });

  return (
    <>
      <main className="mx-auto w-full max-w-doc px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <WhoBar
          name={employee.name}
          line={[roleName, stationName].filter(Boolean).join(' · ') || t('noStation')}
        />

        <Ask
          locale={locale}
          heading={t('askHeading')}
          label={t('searchLabel')}
          placeholder={t('searchPlaceholder')}
          hint={t('searchHint')}
        />

        <CategoryGrid
          locale={locale}
          heading={t('categoriesHeading')}
          categories={categories.filter((c) => !c.isArchived)}
          countOf={(c) => published.filter((p) => p.category?.id === c.id).length}
          countLabel={(n) => t('categoryCount', { count: n })}
          empty={t('categoriesEmpty')}
        />

        {/* A heading over nothing is a heading a cook has to read to learn there
            is nothing there, so an empty list simply does not appear — except
            when all three are empty, where the first one carries the message.
            The link to the library rides on whichever section comes first. */}
        {fresh.length > 0 || (changed.length === 0 && rest.length === 0) ? (
          <ProcedureRows
            locale={locale}
            heading={t('newHeading')}
            all={allLink}
            rows={fresh.map((p) => row(p, `${categoryName(p.category)} · ${daysAgo(p.createdAt)}`))}
            flagLabels={flagLabels}
            empty={t('newEmpty')}
          />
        ) : null}

        {changed.length > 0 ? (
          <ProcedureRows
            locale={locale}
            heading={t('changedHeading')}
            all={fresh.length === 0 ? allLink : undefined}
            rows={changed.map((p) => row(p, `${categoryName(p.category)} · ${t('changedAgo', { when: daysAgo(p.updatedAt) })}`))}
            flagLabels={flagLabels}
            empty={t('newEmpty')}
          />
        ) : null}

        {rest.length > 0 ? (
          <ProcedureRows
            locale={locale}
            heading={t('restHeading')}
            all={fresh.length === 0 && changed.length === 0 ? allLink : undefined}
            rows={rest.map((p) => row(p, categoryName(p.category)))}
            flagLabels={flagLabels}
            empty={t('restEmpty')}
          />
        ) : null}

      </main>

      <TabBar
        locale={locale}
        active="ask"
        labels={{ ask: t('tabAsk'), procedures: t('tabProcedures'), training: t('tabTraining'), soon: t('tabSoon'), nav: t('tabsNav') }}
      />
    </>
  );
}
