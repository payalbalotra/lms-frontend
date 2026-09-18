import type { Category } from './types';
import { LuBrush, LuBuilding2, LuFileLock2, LuFolder, LuTruck, LuUtensils, LuWrench } from 'react-icons/lu';
import type { IconType } from 'react-icons';

/** Slug → remix-icon class. Centralises the icon the manager sees for each
 *  category across every surface — manager page, employee tiles, public
 *  reader header, dropdown chips. When a new category is added, register
 *  its slug here alongside the seed step in the categories migration.
 *  Unknown slugs fall back to a generic folder icon. */
const ICON_BY_SLUG: Readonly<Record<string, IconType>> = {
  recipes: LuUtensils,
  equipment: LuWrench,
  station: LuBuilding2,
  cleaning: LuBrush,
  admin: LuFileLock2,
  delivery: LuTruck,
};

export function getCategoryIcon(category: Pick<Category, 'slug'>): IconType {
  return ICON_BY_SLUG[category.slug] ?? LuFolder;
}
