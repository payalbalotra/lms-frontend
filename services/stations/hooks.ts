'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchStations } from './api';
import type { Station, StationFilterOptions } from './types';

export function useStations(options: StationFilterOptions = {}) {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchStations(options);
      setStations(res.stations);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch stations'));
    } finally {
      setIsLoading(false);
    }
  }, [options.locationId, options.includeArchived]);

  useEffect(() => {
    void load();
  }, [load]);

  return { stations, isLoading, error, refetch: load };
}
