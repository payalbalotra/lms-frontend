'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchLocations } from './api';
import type { Location } from './types';

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchLocations();
      setLocations(res.locations);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch locations'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { locations, isLoading, error, refetch: load };
}
