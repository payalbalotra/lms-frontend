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

/**
 * The admin-side procedure detail page. Same article body the cook sees,
 * surfaced inside the AdminShell, with the manager's Edit / Publish / Draft /
 * Archive / Delete actions stacked above. Edit target lives at
 * `/admin/library/[id]/edit`; this page is the read view.
 *
 * Procedure not found renders Next.js' built-in 404; the explorer's "View"
 * link always targets an id that exists at click time, so the
 * `PROCEDURE_NOT_FOUND` path is reserved for hand-typed URLs and stale tabs.
 */
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

  // The viewer is needed by the body's Watermark (confidential / master
  // recipes carry the reader's name on the page). The AdminShell already
  // gates this route to admins; we still pull the cookie-resolved employee
  // here so the same name renders whether the cook route or this one opened
  // the document.
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
    // Standard admin page width. The chrome bar (back + actions) spans the
    // full width; the title and body underneath sit in the doc reading
    // column (`max-w-doc`) so the H1 lands directly above the body's own
    // DocHead. See AdminProcedureView.
    <div className="mx-auto max-w-page space-y-6 pb-12">
      <AdminProcedureView
        locale={locale}
        procedure={procedure}
        employee={employee}
      />
    </div>
  );
}
