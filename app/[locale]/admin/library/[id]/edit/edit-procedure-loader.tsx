'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocations } from '@/services/locations/hooks';
import { useCategories } from '@/services/categories/hooks';
import { getCachedProcedure, getProcedureBySlug, SEED_CATEGORIES } from '@/lib/api';
import { PROCEDURES_QUERY_KEY } from '@/services/library/hooks';
import { ProcedureEditor } from '@/components/admin/procedure-editor';
import type { Procedure } from '@/lib/types';

/**
 * Client data layer for the procedure editor.
 *
 * The server hands in the procedure when it can see it; when it can't
 * (cached-only procedure, backend down), the query resolves it here:
 * TanStack cache → on-device store → API. The editor mounts as soon as
 * the procedure is known; the category picker fills in behind it.
 * A terminal miss renders a not-found state instead of the editor
 * silently opening in "new" mode.
 */
export function EditProcedureLoader({
  locale,
  id,
  initial,
}: {
  locale: string;
  id: string;
  initial: Procedure | null;
}): React.ReactElement {
  const queryClient = useQueryClient();

  const cached = React.useMemo(() => {
    if (initial) return initial;
    const browse = queryClient.getQueryData<Procedure[]>([...PROCEDURES_QUERY_KEY, 'browse']);
    return browse?.find((p) => p.id === id || p.slug === id) ?? getCachedProcedure(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, id]);

  const procedureQuery = useQuery<Procedure, Error>({
    queryKey: [...PROCEDURES_QUERY_KEY, 'edit', id],
    queryFn: () => getProcedureBySlug(id).then((r) => r.procedure),
    initialData: cached ?? undefined,
    enabled: !initial,
  });

  const procedure = initial ?? procedureQuery.data ?? null;

  const { data: locationsData } = useLocations();
  const locationId = locationsData?.locations?.[0]?.id ?? 'loc-main';
  const { data: categories = [] } = useCategories(locationId);

  // Picker categories come from the query, seed list until it lands.
  const effectiveCategories = categories.length > 0 ? categories : SEED_CATEGORIES;

  if (!procedure && procedureQuery.isLoading) {
    return <EditProcedureSkeleton />;
  }

  if (!procedure) {
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

  return <ProcedureEditor locale={locale} categories={effectiveCategories} initial={procedure} />;
}

/** Editor-shaped skeleton while the procedure resolves client-side —
 *  title row + big form canvas + a couple of field lines. */
function EditProcedureSkeleton(): React.ReactElement {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-doc space-y-6 px-4 pt-6 sm:px-6">
      <div className="animate-pulse h-8 w-1/2 rounded-[var(--radius-md)] bg-[var(--color-panel-2)]" />
      <div className="animate-pulse h-64 w-full rounded-[var(--radius-lg)] bg-[var(--color-panel)]" />
      <div className="animate-pulse h-4 w-full rounded-[var(--radius-md)] bg-[var(--color-panel-2)]" />
      <div className="animate-pulse h-4 w-2/3 rounded-[var(--radius-md)] bg-[var(--color-panel-2)]" />
    </div>
  );
}
