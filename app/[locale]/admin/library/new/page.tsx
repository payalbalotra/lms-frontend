import * as React from 'react';
import { cookies } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';
import { listCategories, listLocations, ApiException } from '@/lib/api';
import type { Category } from '@/lib/types';
import { NewProcedureForm } from './new-procedure-form';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

export default async function AdminLibraryNewPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  // The editor dropdown is a single location's active categories. We need a
  // locationId; the manager's employee carries one. Without it, fall back
  // to an empty list (the form still renders an "Uncategorised" choice).
  const locations = await readActiveLocations(cookieHeader);
  const categories: Category[] = locations.length === 0 ? [] : await readCategories(locations[0], cookieHeader);

  return (
    <div className="w-full">
      <NewProcedureForm locale={locale} categories={categories} />
    </div>
  );
}

// Returns the locations the signed-in admin manages, so we know which
// location's category list to pull.
async function readActiveLocations(cookieHeader: string): Promise<string[]> {
  try {
    const res = await listLocations(cookieHeader);
    return res.locations.map((l) => l.id);
  } catch {
    return [];
  }
}

async function readCategories(locationId: string, cookieHeader: string): Promise<Category[]> {
  try {
    const result = await listCategories(locationId, {}, cookieHeader);
    return result.categories;
  } catch (err) {
    if (err instanceof ApiException) return [];
    throw err;
  }
}
