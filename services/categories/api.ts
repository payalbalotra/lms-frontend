/**
 * Categories data layer.
 *
 * Mirrors the previous axios-backed shape (`fetchCategories`, `createCategory`,
 * `updateCategory`, `archiveCategory`) but routes every call through the
 * localStorage mock store in `lib/api.ts`. The wizard, the categories list,
 * and the category detail page all share this module — switching it to the
 * real backend later is a single-file change.
 */

import {
  listCategories,
  createCategory as mockCreateCategory,
  updateCategory as mockUpdateCategory,
  archiveCategory as mockArchiveCategory,
} from '@/lib/api';
import type { Category } from '@/lib/types';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from './types';

const DEFAULT_LOCATION = 'loc-main';

export async function fetchCategories(
  locationId?: string,
  includeArchived = false
): Promise<Category[]> {
  const { categories } = await listCategories(locationId ?? DEFAULT_LOCATION, {
    includeArchived,
  });
  return categories;
}

export async function createCategory(
  input: CreateCategoryInput & { locationId: string }
): Promise<Category> {
  const { category } = await mockCreateCategory({
    locationId: input.locationId,
    nameEn: input.nameEn,
    nameEs: input.nameEs,
    icon: input.icon,
    subcategories: input.subcategories,
  });
  return category;
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput
): Promise<Category> {
  const { category } = await mockUpdateCategory(id, {
    nameEn: input.nameEn,
    nameEs: input.nameEs,
    icon: input.icon,
    isArchived: input.isArchived,
    subcategories: input.subcategories,
  });
  return category;
}

export async function archiveCategory(id: string): Promise<Category> {
  const { category } = await mockArchiveCategory(id);
  return category;
}
