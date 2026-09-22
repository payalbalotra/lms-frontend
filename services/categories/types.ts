import type { Category } from '@/lib/types';

export type { Category };

export interface CreateCategoryInput {
  nameEn: string;
  nameEs: string;
  icon?: string;
  sortOrder?: number;
}

export interface UpdateCategoryInput {
  nameEn?: string;
  nameEs?: string;
  icon?: string;
  sortOrder?: number;
  isArchived?: boolean;
}
