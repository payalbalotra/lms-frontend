import * as React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { listProcedures, listCategories, listLocations, fetchMe, ApiException } from '@/lib/api';
import type { Procedure, Category } from '@/lib/types';
import { LibraryProcedureExplorer } from '@/components/admin/library-procedure-explorer';

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
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100/90 text-[#E0533C] text-2xl shadow-2xs">
            <i aria-hidden="true" className="ri-article-line" />
          </div>
          <div className="space-y-0.5">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-balck-900 dark:text-black">
              {locale === 'es' ? 'Biblioteca de procedimientos' : 'Procedures Library'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {locale === 'es'
                ? 'Gestiona y organiza todos los procedimientos de tu restaurante.'
                : 'Manage and organize all your restaurant procedures.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href={`/${locale}/admin/library/categories`}>
            <Button variant="secondary" size="sm" className="rounded-xl border-gray-200 bg-white hover:bg-gray-50 font-semibold shadow-2xs text-gray-700 gap-1.5">
              <i aria-hidden="true" className="ri-folders-line text-base text-gray-500" />
              <span>{t('manageCategories')}</span>
            </Button>
          </Link>
          <Link href={`/${locale}/admin/library/new`}>
            <Button size="sm" className="rounded-xl bg-[#E0533C] hover:bg-[#d04530] text-white font-semibold shadow-2xs gap-1.5">
              <i aria-hidden="true" className="ri-add-line text-base" />
              <span>{t('newProcedure')}</span>
            </Button>
          </Link>
        </div>
      </header>

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
        className="inline-flex size-14 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]"
      >
        <i className="ri-book-3-line text-[length:var(--text-2xl)]" />
      </span>
      <div className="space-y-1">
        <h2 className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
          {heading}
        </h2>
        <p className="max-w-md text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          {body}
        </p>
      </div>
    </article>
  );
}
