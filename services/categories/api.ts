import { apiClient } from '../api-client';
import { CATEGORIES_ENDPOINTS } from './endpoints';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from './types';

export async function fetchCategories(
  locationId?: string,
  includeArchived = false
): Promise<Category[]> {
  const endpoint = includeArchived
    ? CATEGORIES_ENDPOINTS.LIST_ADMIN
    : CATEGORIES_ENDPOINTS.LIST_PUBLIC;

  const response = await apiClient.get<{ categories: Category[] }>(endpoint, {
    params: { locationId, includeArchived },
  });
  return response.data.categories;
}

export async function createCategory(
  input: CreateCategoryInput & { locationId: string }
): Promise<Category> {
  const response = await apiClient.post<{ category: Category }>(
    CATEGORIES_ENDPOINTS.CREATE,
    input
  );
  return response.data.category;
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput
): Promise<Category> {
  const response = await apiClient.patch<{ category: Category }>(
    CATEGORIES_ENDPOINTS.UPDATE(id),
    input
  );
  return response.data.category;
}

export async function archiveCategory(id: string): Promise<Category> {
  const response = await apiClient.post<{ category: Category }>(
    CATEGORIES_ENDPOINTS.ARCHIVE(id)
  );
  return response.data.category;
}
