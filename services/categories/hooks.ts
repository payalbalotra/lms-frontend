import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCategories, fetchBackendCategories, createCategory, updateCategory, archiveCategory } from './api';
import type { CreateCategoryInput, UpdateCategoryInput } from './types';

export const CATEGORIES_QUERY_KEY = ['categories'] as const;

export function useCategories(locationId?: string, includeArchived = false) {
  return useQuery({
    queryKey: [...CATEGORIES_QUERY_KEY, { locationId, includeArchived }],
    queryFn: () => fetchCategories(locationId, includeArchived),
  });
}

/**
 * Real categories from the backend (GET /api/v1/categories, limit 100).
 * Joins the 5-minute query cache; the explorer merges these with the mock
 * store rows so backend-created categories filter and count correctly.
 */
export function useBackendCategories() {
  return useQuery({
    queryKey: [...CATEGORIES_QUERY_KEY, 'backend'],
    queryFn: () => fetchBackendCategories(),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCategoryInput & { locationId: string }) => createCategory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      updateCategory(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    },
  });
}

export function useArchiveCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    },
  });
}
