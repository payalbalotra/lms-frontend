import * as React from 'react';
import { cookies } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';
import { listCategories, listLocations, ApiException } from '@/lib/api';
import type { Category } from '@/lib/types';
import { ProcedureEditor } from '@/components/admin/procedure-editor';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

export default async function AdminLibraryNewPage({ params }: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let categories: Category[] = [];
  try {
    const { locations } = await listLocations(cookieHeader);
    if (locations[0]) categories = (await listCategories(locations[0].id, {}, cookieHeader)).categories;
  } catch (err) {
    if (!(err instanceof ApiException)) throw err;
  }

  return <ProcedureEditor locale={locale} categories={categories} />;
}
