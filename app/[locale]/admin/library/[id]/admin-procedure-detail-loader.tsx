'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCachedProcedure, getProcedureBySlug } from '@/lib/api';
import { PROCEDURES_QUERY_KEY } from '@/services/library/hooks';
import { AdminProcedureView } from '@/components/admin/admin-procedure-view';
import type { Employee, Procedure } from '@/lib/types';

/**
 * Client data layer for the admin procedure detail.
 *
 * First paint: whichever list the manager came from — the TanStack
 * browse cache (the library already fetched every procedure) or the
 * on-device store. `useQuery` then revalidates in the background, so a
 * repeat open is instant and still fresh. Only a cold open (no cache,
 * direct link) shows the document skeleton; a miss renders the same
 * kind of "not available" message the employee view uses.
 */
export function AdminProcedureDetailLoader({
  locale,
  id,
  employee,
}: {
  locale: string;
  id: string;
  employee: Employee;
}): React.ReactElement {
  const queryClient = useQueryClient();

  const cached = React.useMemo(() => {
    const browse = queryClient.getQueryData<Procedure[]>([...PROCEDURES_QUERY_KEY, 'browse']);
    return browse?.find((p) => p.id === id || p.slug === id) ?? getCachedProcedure(id);
    // Only the first paint matters — the query keeps the row fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const query = useQuery<Procedure, Error>({
    queryKey: [...PROCEDURES_QUERY_KEY, 'detail', id],
    queryFn: () => getProcedureBySlug(id).then((r) => r.procedure),
    initialData: cached ?? undefined,
  });

  if (query.isLoading && !query.data) {
    return <AdminProcedureDetailSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <div className="mx-auto max-w-card space-y-4">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-ink)]">
            {locale === 'es' ? 'Este procedimiento no está disponible' : 'This procedure isn’t available'}
          </h1>
          <p className="text-base text-[var(--color-ink-2)]">
            {locale === 'es'
              ? 'Puede que se haya quitado o movido.'
              : 'It may have been removed or moved.'}
          </p>
          <div className="pt-4">
            <Link
              href={`/${locale}/admin/library`}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-600)] px-5 py-3 text-sm font-semibold text-white shadow-e1 hover:bg-[var(--color-brand-hover)]"
            >
              {locale === 'es' ? 'Volver a la biblioteca' : 'Back to library'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <AdminProcedureView locale={locale} procedure={query.data} employee={employee} />;
}

/** Document-shaped skeleton for cold opens — mirrors the article frame
 *  (back row, title, meta, cover, body lines) so the swap to content is
 *  a fade, not a jump. */
function AdminProcedureDetailSkeleton(): React.ReactElement {
  return (
    <div aria-hidden="true" className="space-y-6 pt-2">
      <div className="animate-pulse h-5 w-32 rounded-[var(--radius-md)] bg-[var(--color-panel-2)]" />
      <div className="space-y-3">
        <div className="animate-pulse h-9 w-3/5 rounded-[var(--radius-md)] bg-[var(--color-panel-2)]" />
        <div className="flex items-center gap-2">
          <div className="animate-pulse h-4 w-28 rounded-[var(--radius-sm)] bg-[var(--color-panel-2)]" />
          <div className="animate-pulse h-4 w-16 rounded-[var(--radius-sm)] bg-[var(--color-panel-2)]" />
        </div>
        <div className="animate-pulse h-4 w-4/5 rounded-[var(--radius-sm)] bg-[var(--color-panel)]" />
      </div>
      <div className="animate-pulse aspect-[16/9] w-full rounded-[var(--radius-lg)] bg-[var(--color-panel-2)]" />
      <div className="space-y-3">
        <div className="animate-pulse h-4 w-full rounded-[var(--radius-sm)] bg-[var(--color-panel)]" />
        <div className="animate-pulse h-4 w-11/12 rounded-[var(--radius-sm)] bg-[var(--color-panel)]" />
        <div className="animate-pulse h-4 w-4/5 rounded-[var(--radius-sm)] bg-[var(--color-panel)]" />
      </div>
    </div>
  );
}
