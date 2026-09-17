import type { Category } from './types';

/** Slug → remix-icon class. Centralises the icon the manager sees for each
 *  category across every surface — manager page, employee tiles, public
 *  reader header, dropdown chips. When a new category is added, register
 *  its slug here alongside the seed step in the categories migration.
 *  Unknown slugs fall back to a generic folder icon. */
const ICON_BY_SLUG: Readonly<Record<string, string>> = {
  recipes: 'ri-restaurant-line',
  equipment: 'ri-tools-line',
  station: 'ri-community-line',
  cleaning: 'ri-brush-line',
  admin: 'ri-file-shield-2-line',
  delivery: 'ri-truck-line',
};

export function getCategoryIcon(category: Pick<Category, 'slug'>): string {
  return ICON_BY_SLUG[category.slug] ?? 'ri-folder-line';
}
