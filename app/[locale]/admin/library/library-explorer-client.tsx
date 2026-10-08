'use client';

import * as React from 'react';
import { useLocations } from '@/services/locations/hooks';
import { useCategories } from '@/services/categories/hooks';
import { useStations } from '@/services/stations/hooks';
import { useBrowseProcedures } from '@/services/library/hooks';
import { LibraryProcedureExplorer } from '@/components/admin/library-procedure-explorer';
import { LibraryExplorerSkeleton } from '@/components/admin/library-explorer-skeleton';

/**
 * Client data layer for the admin library explorer.
 *
 * The page renders its header instantly; the explorer's categories,
 * stations and procedures resolve through TanStack Query — cached for
 * 5 minutes, so navigating out and back in is instant with no skeleton
 * at all. Only the first-ever visit (or an invalidated cache) shows
 * the skeleton.
 */
export function LibraryExplorerClient({ locale }: { locale: string }): React.ReactElement {
  const locationsQuery = useLocations();
  const locationId = locationsQuery.data?.locations?.[0]?.id;
  const categoriesQuery = useCategories(locationId);
  const stationsQuery = useStations({ locationId });
  const proceduresQuery = useBrowseProcedures();

  const isLoading = proceduresQuery.isLoading || categoriesQuery.isLoading;

  if (isLoading) {
    return <LibraryExplorerSkeleton />;
  }

  return (
    <LibraryProcedureExplorer
      procedures={proceduresQuery.data ?? []}
      categories={categoriesQuery.data ?? []}
      stations={stationsQuery.data ?? []}
      locale={locale}
    />
  );
}
