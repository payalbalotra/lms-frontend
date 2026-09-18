import * as React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ApiException, fetchMe, listCategories, listProcedures } from '@/lib/api';
import type { Category, Procedure } from '@/lib/types';
import { LuArrowLeft } from 'react-icons/lu';
import { TabBar } from '@/components/employee/tab-bar';
import { ProceduresClientList } from './procedures-client-list';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string }>;
}

export const dynamic = 'force-dynamic';

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
  await Promise.all([
    listCategories(employee.locationId, {}, cookieHeader).then((r) => { categories = r.categories; }).catch(() => {}),
    listProcedures({}, cookieHeader).then((r) => { procedures = r.procedures; }).catch(() => {}),
  ]);

  const readsSpanish = employee.languagePref === 'es';

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

        <ProceduresClientList
          initialCategories={categories}
          initialProcedures={procedures}
          initialQuery={q}
          initialCategory={category}
          locationId={employee.locationId}
          locale={locale}
          readsSpanish={readsSpanish}
        />
      </main>

      <TabBar
        locale={locale}
        active="procedures"
        labels={{
          ask: t('tabAsk'),
          procedures: t('tabProcedures'),
          training: t('tabTraining'),
          soon: t('tabSoon'),
          nav: t('tabsNav'),
        }}
      />
    </>
  );
}
