import * as React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { listProcedures, listCategories, listLocations, fetchMe, ApiException } from '@/lib/api';
import type { Procedure, Category } from '@/lib/types';
import { LibraryProcedureExplorer } from '@/components/admin/library-procedure-explorer';
import { LuBook, LuFolders, LuPlus } from 'react-icons/lu';
import { PageHeader } from '@/components/admin/page-header';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-recipes', slug: 'recipes', nameEn: 'Recipes', nameEs: 'Recetas', isArchived: false },
  { id: 'cat-station', slug: 'station', nameEn: 'Station Procedures', nameEs: 'Procedimientos de Estación', isArchived: false },
  { id: 'cat-cleaning', slug: 'cleaning', nameEn: 'Cleaning Schedules', nameEs: 'Horarios de Limpieza', isArchived: false },
  { id: 'cat-admin', slug: 'admin', nameEn: 'General Procedures', nameEs: 'Procedimientos Generales', isArchived: false },
  { id: 'cat-delivery', slug: 'delivery', nameEn: 'Delivery & Receiving', nameEs: 'Entrega y Recepción', isArchived: false },
  { id: 'cat-safety', slug: 'food-safety', nameEn: 'Food Safety', nameEs: 'Seguridad Alimentaria', isArchived: false },
  { id: 'cat-equipment', slug: 'equipment', nameEn: 'Equipment Handling', nameEs: 'Manejo de Equipos', isArchived: false },
  { id: 'cat-other', slug: 'other', nameEn: 'Other', nameEs: 'Otros', isArchived: false },
];

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

export default async function AdminLibraryPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.library');

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let procedures: Procedure[] = [];
  let categories: Category[] = [];
  let loadError: string | null = null;

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

  try {
    const procResult = await listProcedures({}, cookieHeader);
    procedures = procResult.procedures;

    if (locationId) {
      try {
        const catResult = await listCategories(locationId, {}, cookieHeader);
        categories = catResult.categories;
      } catch {
        // Keep fallback categories
      }
    }
  } catch (err) {
    if (err instanceof ApiException) {
      loadError = err.code;
    } else {
      throw err;
    }
  }

  const finalCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  return (
    <div className="mx-auto max-w-page space-y-6 pb-12">
      {/* No eyebrow: the sidebar already says Library, and this page is inside it.
          No "Categories" button either — Categories is a row in that same sidebar,
          two taps away by its own name. A page header carries what the page does
          that nothing else offers, which here is one thing: start a procedure. */}
      <PageHeader
        title={t('pageTitle')}
        subtitle={t('pageSubtitle')}
        actions={
          <Link href={`/${locale}/admin/library/new`}>
            <Button icon={LuPlus}>{t('newProcedure')}</Button>
          </Link>
        }
      />

      {loadError ? (
        <p role="alert" className="text-sm text-[var(--color-bad)]">
          {loadError}
        </p>
      ) : (
        <LibraryProcedureExplorer
          procedures={procedures}
          categories={finalCategories}
          locale={locale}
        />
      )}
    </div>
  );
}

function EmptyLibrary({
  heading,
  body,
}: {
  heading: string;
  body: string;
}): React.ReactElement {
  return (
    <article
      className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] px-6 py-16 text-center"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-12 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-panel)] text-[var(--color-ink-2)]"
      >
        <LuBook className="text-2xl" />
      </span>
      <div className="space-y-1">
        <h2 className="font-[family-name:var(--font-ui)] text-lg font-semibold tracking-tight text-[var(--color-ink)]">
          {heading}
        </h2>
        <p className="max-w-note text-sm text-[var(--color-ink-2)]">
          {body}
        </p>
      </div>
    </article>
  );
}
