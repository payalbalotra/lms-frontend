'use client';

import * as React from 'react';
import { useLocations } from '@/services/locations/hooks';
import { useCategories, useBackendCategories } from '@/services/categories/hooks';
import { useStations } from '@/services/stations/hooks';
import { useBrowseProcedures } from '@/services/library/hooks';
import { LibraryProcedureExplorer } from '@/components/admin/library-procedure-explorer';

/**
 * Client data layer for the admin library explorer.
 *
 * Progressive paint: the header (page) is already instant, and the explorer
 * renders its filter bar as soon as the component mounts — only the rows
 * skeletonize while the procedures query resolves. Nothing waits for every
 * query before painting; each dataset lands when it lands (React Query
 * cache makes repeat visits fully instant with no skeleton at all).
 */
const EMPTY_PROCEDURES: any[] = [];
const EMPTY_STATIONS: any[] = [];

export function LibraryExplorerClient({ locale }: { locale: string }): React.ReactElement {
  const locationsQuery = useLocations();
  const locationId = locationsQuery.data?.locations?.[0]?.id;
  const categoriesQuery = useCategories(locationId);
  const backendCategoriesQuery = useBackendCategories();
  const stationsQuery = useStations({ locationId });
  const proceduresQuery = useBrowseProcedures();

  // Backend rows first (real data wins on slug clashes), mock store rows
  // after for demo/seed content. The explorer dedupes by slug.
  const categories = React.useMemo(
    () => [...(backendCategoriesQuery.data ?? []), ...(categoriesQuery.data ?? [])],
    [backendCategoriesQuery.data, categoriesQuery.data],
  );

  return (
    <LibraryProcedureExplorer
      procedures={proceduresQuery.data ?? EMPTY_PROCEDURES}
      categories={categories}
      stations={stationsQuery.data ?? EMPTY_STATIONS}
      locale={locale}
      proceduresLoading={proceduresQuery.isLoading}
    />
  );
}
