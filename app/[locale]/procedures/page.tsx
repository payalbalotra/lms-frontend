import * as React from 'react';
import { fold } from '@/lib/utils';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ApiException, fetchMe, listCategories, listProcedures } from '@/lib/api';
import { getCategoryIcon } from '@/lib/category-icons';
import { Icon } from '@/components/ui/icon';
import type { Category, Procedure } from '@/lib/types';
import { LuArrowLeft, LuSearch } from 'react-icons/lu';
import { TabBar } from '@/components/employee/tab-bar';
import { ProcedureRow } from '@/components/employee/procedure-row';
import { allergenWords, factsOf } from '@/app/[locale]/employee/assigned/components/procedure-facts';

/**
 * The library, as a cook sees it: a search field, the categories as filters, and
 * a list of results. This is where the home's search box lands — it used to
 * point here and the route did not exist, so every search ended on a 404.
 *
 * Matching ignores case and accents, so "jalapeno" finds "jalapeño" and
 * "sanitisar" finds what a cook typed without the accent.
 */

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string }>;
}

export const dynamic = 'force-dynamic';

// The same fold the admin search uses, so the two never disagree about whether
// "Limpieza" matches "limpieza".

export default async function ProceduresPage({ params, searchParams }: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  const { q = '', category = '' } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('employee.browse');

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

  let categories: Category[] = [];
  let procedures: Procedure[] = [];
  // The library list still comes from the admin endpoint, which is what exists
  // today: the backend owes an employee-scoped GET /api/procedures. Until it
  // lands, a cook's request is refused — and a refusal shown as "No procedures"
  // sends them to look for a paper copy of a library that is actually there. So
  // the failure is kept and said out loud.
  let libraryFailed = false;
  await Promise.all([
    listCategories(employee.locationId, {}, cookieHeader).then((r) => { categories = r.categories; }).catch(() => {}),
    listProcedures({}, cookieHeader)
      .then((r) => { procedures = r.procedures; })
      .catch(() => { libraryFailed = true; }),
  ]);

  const titleOf = (p: Procedure): string => (locale === 'es' ? p.titleEs || p.titleEn : p.titleEn || p.titleEs);
  const purposeOf = (p: Procedure): string => (locale === 'es' ? p.purposeEs || p.purposeEn : p.purposeEn || p.purposeEs);
  const nameOf = (c: Category): string => (locale === 'es' ? c.nameEs || c.nameEn : c.nameEn || c.nameEs);
  const coverOf = (p: Procedure): string | undefined => {
    const body = p.bodyEn.blocks.length ? p.bodyEn : p.bodyEs;
    for (const b of body.blocks) if (b.kind === 'image' && b.src) return b.src;
    return undefined;
  };

  const needle = fold(q.trim());
  const results = procedures
    .filter((p) => p.status === 'published')
    .filter((p) => (category ? p.category?.slug === category : true))
    .filter((p) => (needle ? fold(`${titleOf(p)} ${purposeOf(p)} ${p.slug}`).includes(needle) : true))
    .sort((a, b) => titleOf(a).localeCompare(titleOf(b), locale));

  const tHome = await getTranslations('employee.home');
  const readsSpanish = employee.languagePref === 'es';
  const flagLabels = {
    allergen: (list: string) => tHome('flagAllergen', { list }),
    critical: tHome('flagCritical'),
    english: tHome('flagEnglishOnly'),
  };

  const chip = 'inline-flex min-h-tap items-center gap-2 rounded-full px-4 text-base font-semibold whitespace-nowrap';

  return (
    <>
      <main className="mx-auto w-full max-w-doc px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
      <Link
        href={`/${locale}/employee/assigned`}
        className="inline-flex min-h-tap items-center gap-2 text-base font-semibold text-[var(--color-ink-2)]"
      >
        <LuArrowLeft aria-hidden="true" />
        {t('back')}
      </Link>

      <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold leading-display tracking-tight text-[var(--color-ink)]">
        {t('heading')}
      </h1>

      <form action={`/${locale}/procedures`} role="search" className="mt-5">
        <label htmlFor="q" className="sr-only">
          {t('searchLabel')}
        </label>
        <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line-3)] bg-[var(--color-surface)] px-4 py-2 transition-colors duration-[var(--dur)] ease-[var(--ease)] focus-within:border-[var(--color-brand-600)] focus-within:outline focus-within:outline-2 focus-within:outline-[var(--color-brand-tint-2)]">
          <LuSearch aria-hidden="true" className="text-lg text-[var(--color-ink-2)]" />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder={t('searchPlaceholder')}
            className="h-tap min-w-0 flex-1 border-0 bg-transparent text-md text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
          />
        </div>
        {category ? <input type="hidden" name="category" value={category} /> : null}
      </form>

      {/* Categories as filters. The row scrolls sideways on a phone rather than
          wrapping into four lines of chips above the results. */}
      <div className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2">
          <Link
            href={`/${locale}/procedures${q ? `?q=${encodeURIComponent(q)}` : ''}`}
            aria-current={category ? undefined : 'true'}
            className={`${chip} ${category ? 'bg-[var(--color-panel)] text-[var(--color-ink)]' : 'bg-[var(--color-ink)] text-white'}`}
          >
            {t('all')}
          </Link>
          {categories
            .filter((c) => !c.isArchived)
            .map((c) => {
              const on = category === c.slug;
              const href = `/${locale}/procedures?category=${encodeURIComponent(c.slug)}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
              return (
                <Link
                  key={c.id}
                  href={href}
                  aria-current={on ? 'true' : undefined}
                  className={`${chip} ${on ? 'bg-[var(--color-ink)] text-white' : 'bg-[var(--color-panel)] text-[var(--color-ink)]'}`}
                >
                  <Icon icon={getCategoryIcon(c)} />
                  {nameOf(c)}
                </Link>
              );
            })}
        </div>
      </div>

      {libraryFailed ? null : (
        <p className="mt-5 text-base text-[var(--color-ink-2)]" aria-live="polite">
          {t('count', { count: results.length })}
        </p>
      )}

      {libraryFailed ? (
        <p role="alert" className="mt-4 rounded-[var(--radius-lg)] bg-[var(--color-bad-tint)] p-4 text-md text-[var(--color-bad)]">
          {t('unavailable')}
        </p>
      ) : results.length === 0 ? (
        <p className="mt-4 text-md text-[var(--color-ink)]">{q ? t('noneFor', { query: q.trim() }) : t('none')}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {results.map((p) => {
            const cover = coverOf(p);
            return (
              <li key={p.id}>
                <ProcedureRow
                  href={`/${locale}/procedures/${p.slug}`}
                  cover={cover}
                  category={p.category}
                  title={titleOf(p)}
                  meta={p.category ? nameOf(p.category) : t('uncategorised')}
                  flags={{
                    ...factsOf(p, readsSpanish),
                    allergens: allergenWords(factsOf(p, readsSpanish).allergens, locale === 'es' ? 'es' : 'en'),
                  }}
                  flagLabels={flagLabels}
                />
              </li>
            );
          })}
        </ul>
      )}
      </main>

      <TabBar
        locale={locale}
        active="procedures"
        labels={{ ask: t('tabAsk'), procedures: t('tabProcedures'), training: t('tabTraining'), soon: t('tabSoon'), nav: t('tabsNav') }}
      />
    </>
  );
}
