'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ProcedureEditor } from '@/components/admin/procedure-editor';
import { PageHeader } from '@/components/admin/page-header';
import { getProcedureById, listCategories } from '@/lib/api';
import type { Category, Procedure } from '@/lib/types';

/**
 * Loads the procedure in the browser, where the library keeps its working copy
 * until the backend holds it, then hands it to the same editor a new one uses.
 */
export function EditProcedureLoader({ locale, id }: { locale: string; id: string }): React.ReactElement {
  const t = useTranslations('admin.library.editor');
  const [state, setState] = React.useState<
    { kind: 'loading' } | { kind: 'missing' } | { kind: 'ready'; procedure: Procedure; categories: Category[] }
  >({ kind: 'loading' });

  React.useEffect(() => {
    let alive = true;
    Promise.all([getProcedureById(id), listCategories('loc-main', { includeArchived: false })])
      .then(([{ procedure }, { categories }]) => alive && setState({ kind: 'ready', procedure, categories }))
      .catch(() => alive && setState({ kind: 'missing' }));
    return () => {
      alive = false;
    };
  }, [id]);

  if (state.kind === 'ready') {
    return <ProcedureEditor key={state.procedure.id} locale={locale} categories={state.categories} initial={state.procedure} />;
  }
  return (
    <div className="mx-auto max-w-page">
      <PageHeader
        eyebrow={t('back')}
        eyebrowHref={`/${locale}/admin/library`}
        title={t('titleEdit')}
        subtitle={state.kind === 'loading' ? t('loading') : t('notFound')}
      />
    </div>
  );
}
