import * as React from 'react';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { ApiException, fetchMe, getProcedureBySlug } from '@/lib/api';
import type { Procedure } from '@/lib/types';
import { AdminProcedureView } from '@/components/admin/admin-procedure-view';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function AdminLibraryDetailPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let procedure: Procedure | null = null;
  try {
    const result = await getProcedureBySlug(id, cookieHeader);
    procedure = result.procedure;
  } catch (err) {
    if (err instanceof ApiException && err.code === 'PROCEDURE_NOT_FOUND') {
      notFound();
    }
    throw err;
  }

  if (!procedure) notFound();
  let employee;
  try {
    const me = await fetchMe(cookieHeader);
    employee = me.employee;
  } catch (err) {
    if (err instanceof ApiException) {
      notFound();
    }
    throw err;
  }

  return (
    // Matches the demo procedure view reading column width (`max-w-doc`).
    <div className="mx-auto max-w-doc space-y-6 pb-12">
      <AdminProcedureView
        locale={locale}
        procedure={procedure}
        employee={employee}
      />
    </div>
  );
}
