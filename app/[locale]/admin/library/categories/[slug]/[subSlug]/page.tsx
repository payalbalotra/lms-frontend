import * as React from 'react';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { listCategories, listLocations, ApiException, fetchMe } from '@/lib/api';
import type { Category, Subcategory } from '@/lib/types';
import { SubcategoryDetailClient } from './subcategory-detail-client';

interface PageProps {
  params: Promise<{ locale: string; slug: string; subSlug: string }>;
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
 * Dedicated subcategory page. The category page lists every subcategory
 * inline; clicking one lands here so the manager sees only that
 * subcategory's procedures (filtered by the `?station=` picked on the
 * categories page) with an "Add procedure" button and nothing else —
 * no add-station affordances, since the station is already determined
 * by the URL.
 */
export default async function AdminSubcategoryDetailPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale, slug, subSlug } = await params;
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
  let subcategory: Subcategory | null = null;

  if (locationId) {
    try {
      const result = await listCategories(
        locationId,
        { includeArchived: true },
        cookieHeader,
      );
      const match = result.categories.find((c) => c.slug === slug);
      if (match) {
        const sub = (match.subcategories ?? []).find((s) => s.slug === subSlug);
        if (sub) {
          category = match;
          subcategory = sub;
        }
      }
    } catch {
      // Fall through to notFound().
    }
  }

  if (!category || !subcategory) {
    notFound();
  }

  return (
    <SubcategoryDetailClient
      category={category}
      subcategory={subcategory}
      locale={locale}
    />
  );
}
