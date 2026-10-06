'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchJobs, fetchRoles } from './api';
import type { Job, Role } from './types';

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchJobs();
      setJobs(res.jobs);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch jobs'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { jobs, isLoading, error, refetch: load };
}

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchRoles();
      setRoles(res.roles);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch roles'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { roles, isLoading, error, refetch: load };
}
