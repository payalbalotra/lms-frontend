'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchEmployees } from './api';
import type { AdminEmployee, EmployeeFilterOptions } from './types';

export function useEmployees(options: EmployeeFilterOptions = {}) {
  const [employees, setEmployees] = useState<AdminEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchEmployees(options);
      setEmployees(res.employees);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch employees'));
    } finally {
      setIsLoading(false);
    }
  }, [options.status]);

  useEffect(() => {
    void load();
  }, [load]);

  return { employees, isLoading, error, refetch: load };
}
