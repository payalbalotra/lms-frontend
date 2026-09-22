import type { Category, Subcategory } from '@/lib/types';

export type { Category, Subcategory };

export interface SubcategoryInput {
  nameEn: string;
  nameEs: string;
  isStationSpecific?: boolean;
}

export interface CreateCategoryInput {
  nameEn: string;
  nameEs: string;
  icon?: string;
  sortOrder?: number;
  subcategories?: SubcategoryInput[];
}

export interface UpdateCategoryInput {
  nameEn?: string;
  nameEs?: string;
  icon?: string;
  sortOrder?: number;
  isArchived?: boolean;
  subcategories?: SubcategoryInput[];
}
