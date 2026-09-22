import type { Category } from './types';
import {
  LuBrush,
  LuBuilding2,
  LuChefHat,
  LuClipboardList,
  LuFileLock2,
  LuFolder,
  LuPackage,
  LuShieldCheck,
  LuTruck,
  LuUtensils,
  LuWrench,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';

const ICON_MAP: Readonly<Record<string, IconType>> = {
  LuFolder,
  LuUtensils,
  LuBuilding2,
  LuWrench,
  LuBrush,
  LuFileLock2,
  LuTruck,
  LuShieldCheck,
  LuClipboardList,
  LuChefHat,
  LuPackage,
  recipes: LuUtensils,
  equipment: LuWrench,
  station: LuBuilding2,
  cleaning: LuBrush,
  admin: LuFileLock2,
  delivery: LuTruck,
  'food-safety': LuShieldCheck,
};

export function getCategoryIcon(category: Pick<Category, 'slug'> & { icon?: string }): IconType {
  if (category.icon && ICON_MAP[category.icon]) {
    return ICON_MAP[category.icon];
  }
  return ICON_MAP[category.slug] ?? LuFolder;
}
