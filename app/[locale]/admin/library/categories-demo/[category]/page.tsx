import * as React from 'react';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { listCategories, listLocations, ApiException, fetchMe } from '@/lib/api';
import type { Category } from '@/lib/types';
import { CategoryDemoClient } from './category-demo-client';

interface PageProps {
  params: Promise<{ locale: string; category: string }>;
}

export const dynamic = 'force-dynamic';

async function readFirstManagedLocation(cookieHeader: string): Promise<string | null> {
  try {
    const res = await listLocations(cookieHeader);
    return res.locations[0]?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Demo drilldown at `/[locale]/admin/library/categories-demo/[category]`.
 *
 * Mirrors the production `/categories/[slug]` page (list of subcategories
 * with one expanded accordion) but adds the new station-tagging affordances:
 *
 *   - Aggregated stations strip at the top of the header recomputes live
 *     from the procedures below.
 *   - Each procedure row carries removable station chips and an
 *     "Add station" popover picker.
 *
 * The drilldown only renders the add-station demo when the category has
 * the demo fixture data (Recipes → Plating). For other categories the
 * accordion still works — the row just shows a small note that the
 * add-station demo is only wired for the Plating subcategory today.
 *
 * Lives under `categories-demo/...` and is hidden from the sidebar.
 */
export default async function CategoryDemoPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale, category: slug } = await params;
  setRequestLocale(locale);

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

  let category: Category | null = null;
  if (locationId) {
    try {
      const result = await listCategories(
        locationId,
        { includeArchived: true },
        cookieHeader,
      );
      category = result.categories.find((c) => c.slug === slug) ?? null;
    } catch {
      // Fall through to notFound().
    }
  }

  if (!category) {
    notFound();
  }

  return <CategoryDemoClient category={category} locale={locale} />;
}
