import * as React from 'react';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getProcedureBySlug, listCategories, listLocations, ApiException } from '@/lib/api';
import type { Category, Procedure } from '@/lib/types';
import { NewProcedureForm } from '../../new/new-procedure-form';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function AdminLibraryEditPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  // Load the procedure to edit
  let procedure: Procedure | null = null;
  try {
    const result = await getProcedureBySlug(id, cookieHeader);
    procedure = result.procedure;
  } catch (err) {
    if (err instanceof ApiException && err.code === 'PROCEDURE_NOT_FOUND') {
      notFound();
    }
    throw err;
  }

  if (!procedure) notFound();

  // Load categories for the form's category picker
  const locations = await readActiveLocations(cookieHeader);
  const categories: Category[] =
    locations.length === 0 ? [] : await readCategories(locations[0], cookieHeader);

  return (
    <div className="w-full">
      <NewProcedureForm
        locale={locale}
        categories={categories}
        initialProcedure={procedure}
      />
    </div>
  );
}

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
