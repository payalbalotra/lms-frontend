'use client';

import * as React from 'react';
import { useLocations } from '@/services/locations/hooks';
import { useCategories } from '@/services/categories/hooks';
import { ProcedureEditor } from '@/components/admin/procedure-editor';

/**
 * Client data layer for the new-procedure wizard.
 *
 * The page shell renders instantly; the location (which scopes the
 * category picker) and the categories themselves resolve through
 * TanStack Query — cached for 5 minutes, so reopening the wizard
 * is immediate. The editor mounts with an empty picker and fills
 * in when the queries resolve.
 */
import { SEED_CATEGORIES } from '@/lib/api';

export function NewProcedureLoader({ locale }: { locale: string }): React.ReactElement {
  const { data: locationsData } = useLocations();
  const locationId = locationsData?.locations?.[0]?.id ?? 'loc-main';
  const { data: categories = [] } = useCategories(locationId);

  const effectiveCategories = categories.length > 0 ? categories : SEED_CATEGORIES;

  return <ProcedureEditor locale={locale} categories={effectiveCategories} />;
}
