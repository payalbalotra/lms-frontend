import * as React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ApiException, fetchMe, getProcedureBySlug } from '@/lib/api';
import type { Procedure } from '@/lib/types';
import { readViewAs } from '@/lib/view-as-server';
import { ProcedureViewClient } from './procedure-view-client';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function ProcedurePage({ params }: PageProps): Promise<React.ReactElement> {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('employee.doc');

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

  // ?as= override: procedures are reading content, so the page renders in
  // employee chrome by default. `?as=admin` opts into the admin chrome for
  // anyone who wants the library nav context while here. The proxy injects
  // the value as the x-lms-view-as request header. See lib/view-as.
  const viewAs = await readViewAs();
  const effectiveRole = viewAs ?? 'employee';

  let proc: Procedure | null = null;
  try {
    const result = await getProcedureBySlug(id, cookieHeader);
    proc = result.procedure;
  } catch {
    // If not found on server (e.g. created in client-side localStorage),
    // proc remains null and ProcedureViewClient will check localStorage on client mount.
  }

  const labels = {
    back: t('back'),
    uncategorised: t('uncategorised'),
    factCategory: t('factCategory'),
    factStatus: t('factStatus'),
    factUpdated: t('factUpdated'),
    factLanguages: t('factLanguages'),
    published: t('published'),
    draft: t('draft'),
    englishOnly: t('englishOnly'),
    ctlReference: t('ctlReference'),
    ctlUpdated: t('ctlUpdated'),
    ctlStatus: t('ctlStatus'),
    ctlLanguages: t('ctlLanguages'),
    tabHome: t('tabHome'),
    tabProcedures: t('tabProcedures'),
    tabTraining: t('tabTraining'),
    tabSoon: t('tabSoon'),
    tabsNav: t('tabsNav'),
  };

  return (
    <ProcedureViewClient
      slugOrId={id}
      initialProcedure={proc}
      employee={employee}
      effectiveRole={effectiveRole}
      viewAs={viewAs}
      locale={locale}
      labels={labels}
    />
  );
}
