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

/** Mirror of `SEED_CATEGORIES` in `lib/api.ts`. Used as a fallback when
 *  localStorage hasn't seeded yet (e.g. SSR or a freshly cleared store).
 *  Kept in sync with the seed so the explorer renders identically whether
 *  data comes from the API or this constant. */
const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-onboarding',
    slug: 'onboarding',
    nameEn: 'Onboarding',
    nameEs: 'Inducción y Capacitación',
    isArchived: false,
    subcategories: [
      { id: 'sub-culture', slug: 'culture', nameEn: 'Culture', nameEs: 'Cultura' },
      { id: 'sub-uniform', slug: 'uniform', nameEn: 'Uniform', nameEs: 'Uniforme' },
      { id: 'sub-conduct', slug: 'conduct', nameEn: 'Employee Conduct', nameEs: 'Conducta del Empleado' },
    ],
  },
  {
    id: 'cat-safety',
    slug: 'food-safety',
    nameEn: 'Food Safety',
    nameEs: 'Seguridad Alimentaria',
    isArchived: false,
    subcategories: [
      { id: 'sub-hygiene', slug: 'hygiene', nameEn: 'Hygiene', nameEs: 'Higiene' },
      { id: 'sub-cross-contamination', slug: 'cross-contamination', nameEn: 'Cross-Contamination', nameEs: 'Contaminación Cruzada' },
      { id: 'sub-labeling-dating', slug: 'labeling-dating', nameEn: 'Labeling & Dating', nameEs: 'Etiquetado y Fechado' },
      { id: 'sub-allergy', slug: 'allergy', nameEn: 'Allergy', nameEs: 'Alergias' },
    ],
  },
  {
    id: 'cat-kitchen-ops',
    slug: 'kitchen-operations',
    nameEn: 'Kitchen Operations',
    nameEs: 'Operaciones de Cocina',
    isArchived: false,
    subcategories: [
      { id: 'sub-station-setup', slug: 'station-setup', nameEn: 'Station Setup', nameEs: 'Montaje de Estación', isStationSpecific: true },
      { id: 'sub-kitchen-comm', slug: 'kitchen-communication', nameEn: 'Kitchen Communication', nameEs: 'Comunicación en Cocina' },
    ],
  },
  {
    id: 'cat-cleaning',
    slug: 'cleaning',
    nameEn: 'Cleaning',
    nameEs: 'Limpieza',
    isArchived: false,
    subcategories: [
      { id: 'sub-dishwashing', slug: 'dishwashing', nameEn: 'Dishwashing', nameEs: 'Lavadiscos' },
      { id: 'sub-chemical', slug: 'chemical-handling', nameEn: 'Chemical Handling', nameEs: 'Manejo de Químicos' },
      { id: 'sub-waste', slug: 'waste-disposal', nameEn: 'Waste Disposal', nameEs: 'Disposición de Desechos' },
    ],
  },
  {
    id: 'cat-opening-closing',
    slug: 'opening-closing',
    nameEn: 'Opening and Closing',
    nameEs: 'Apertura y Cierre',
    isArchived: false,
    subcategories: [
      {
        id: 'sub-opening',
        slug: 'opening-procedures',
        nameEn: 'Opening Procedures',
        nameEs: 'Procedimientos de Apertura',
        isStationSpecific: true,
        stations: ['stn-gm', 'stn-grill', 'stn-expo', 'stn-prep', 'stn-dish'],
      },
      {
        id: 'sub-closing',
        slug: 'closing-procedures',
        nameEn: 'Closing Procedures',
        nameEs: 'Procedimientos de Cierre',
        isStationSpecific: true,
        stations: ['stn-gm', 'stn-grill', 'stn-expo', 'stn-prep', 'stn-dish'],
      },
      {
        id: 'sub-end-day',
        slug: 'end-of-day-checks',
        nameEn: 'End of Day Checks',
        nameEs: 'Verificaciones de Fin de Día',
        isStationSpecific: true,
        stations: ['stn-gm', 'stn-grill', 'stn-expo', 'stn-prep', 'stn-dish'],
      },
    ],
  },
  {
    id: 'cat-equipment',
    slug: 'equipment',
    nameEn: 'Equipment',
    nameEs: 'Equipamiento',
    isArchived: false,
    subcategories: [
      {
        id: 'sub-operation',
        slug: 'operation',
        nameEn: 'Operation',
        nameEs: 'Operación',
        isStationSpecific: true,
        stations: ['stn-gm', 'stn-grill', 'stn-expo', 'stn-prep', 'stn-dish'],
      },
      {
        id: 'sub-eq-safety',
        slug: 'equipment-safety',
        nameEn: 'Safety',
        nameEs: 'Seguridad',
        isStationSpecific: true,
        stations: ['stn-gm', 'stn-grill', 'stn-expo', 'stn-prep', 'stn-dish'],
      },
      {
        id: 'sub-eq-cleaning',
        slug: 'equipment-cleaning',
        nameEn: 'Cleaning',
        nameEs: 'Limpieza',
        isStationSpecific: true,
        stations: ['stn-gm', 'stn-grill', 'stn-expo', 'stn-prep', 'stn-dish'],
      },
    ],
  },
  {
    id: 'cat-recipes',
    slug: 'recipes',
    nameEn: 'Recipes',
    nameEs: 'Recetas',
    isArchived: false,
    subcategories: [
      {
        id: 'sub-plating',
        slug: 'plating',
        nameEn: 'Plating',
        nameEs: 'Emplatado',
        isStationSpecific: true,
        stations: ['stn-gm', 'stn-grill', 'stn-expo'],
      },
      {
        id: 'sub-cooking',
        slug: 'cooking',
        nameEn: 'Cooking',
        nameEs: 'Cocción',
        isStationSpecific: true,
        stations: ['stn-gm', 'stn-grill'],
      },
      {
        id: 'sub-portion',
        slug: 'portion-standards',
        nameEn: 'Portion Standards',
        nameEs: 'Estándares de Porción',
      },
    ],
  },
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
