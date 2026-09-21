import * as React from 'react';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { listCategories, listLocations, ApiException, fetchMe } from '@/lib/api';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CategoriesClientList } from './categories-client-list';
import { CreateCategoryButton } from './category-actions';
import { PageHeader } from '@/components/admin/page-header';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

async function readFirstManagedLocation(
  cookieHeader: string,
): Promise<string | null> {
  try {
    const res = await listLocations(cookieHeader);
    return res.locations[0]?.id ?? null;
  } catch {
    return null;
  }
}

export default async function AdminLibraryCategoriesPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.library.categories');

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let locationId: string | null = null;
  try {
    const me = await fetchMe(cookieHeader);
    locationId = me.employee.locationId;
  } catch (err) {
    if (!(err instanceof ApiException)) throw err;
    locationId = await readFirstManagedLocation(cookieHeader);
  }
  if (!locationId) {
    locationId = await readFirstManagedLocation(cookieHeader);
  }

  let categories: Category[] = [];
  let loadError: string | null = null;
  if (locationId) {
    try {
      const result = await listCategories(locationId, { includeArchived: true }, cookieHeader);
      categories = result.categories;
    } catch (err) {
      loadError = err instanceof ApiException ? err.message : 'LOAD_FAILED';
    }
  }

  const isEs = locale === 'es';

  return (
    <div className="mx-auto max-w-page space-y-6">
      <PageHeader
        title={t('pageTitle')}
        subtitle={t('pageSubtitle')}
        actions={locationId ? <CreateCategoryButton locationId={locationId} /> : null}
      />

      {loadError ? (
        <p
          role="alert"
          className={cn(
            'rounded-[var(--radius-md)] bg-[var(--color-bad-tint)]',
            'px-3 py-2 text-sm text-[var(--color-bad)]',
          )}
        >
          {loadError}
        </p>
      ) : null}

      <CategoriesClientList
        initialCategories={categories}
        locationId={locationId}
        locale={locale}
      />

      <span className="sr-only">{isEs ? 'es' : 'en'}</span>
    </div>
  );
}
