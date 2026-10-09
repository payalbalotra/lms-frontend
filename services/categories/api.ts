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
    kind: input.kind,
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
    kind: input.kind,
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

// ---------------------------------------------------------------------------
// Backend-backed reads (GET /api/v1/categories — any logged-in employee).
// The mock store above holds demo/seed rows only; real categories live in
// the backend since the pagination update. These mappers translate the
// backend shape (no slug, no embedded subcategories) to the frontend
// Category used by the explorer's filters and counts.
// ---------------------------------------------------------------------------

const CATEGORIES_ENDPOINTS = {
  LIST: '/api/v1/categories',
} as const;

/** Backend ("Recipes") and mock ("Recipe") names for the same shelf rarely
 *  share a slug. Two slugs match when equal or when one contains the other
 *  after normalization (`recipe`/`recipes`, `cleaning`/`cleaning-schedules`,
 *  `opening-closing`/`opening-and-closing`). Tight enough for a single-digit
 *  category domain; exact equality is checked first. */
export function categorySlugsMatch(a: string | undefined, b: string | undefined): boolean {
  const norm = (s: string): string => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const x = norm(a ?? '');
  const y = norm(b ?? '');
  if (!x || !y) return false;
  if (x === y) return true;
  return x.includes(y) || y.includes(x);
}

/** Backend categories carry no slug — derive it the same way the mock
 *  creator does so backend and mock rows share one stable handle space. */
export function backendSlug(nameEn: string): string {
  return (nameEn || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function makeBackendHeaders(cookieHeader?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)lms_token=([^;]+)/);
    if (tokenMatch) {
      headers['Authorization'] = `Bearer ${decodeURIComponent(tokenMatch[1])}`;
    }
  }
  return headers;
}

export interface BackendCategoryOptions {
  search?: string;
  page?: number;
  /** Backend defaults to 10 — pass explicitly so the list never truncates. */
  limit?: number;
}

const inFlightBackendCategories = new Map<string, Promise<Category[]>>();
const cachedBackendCategories = new Map<string, { data: Category[]; expiresAt: number }>();
const BACKEND_CATEGORIES_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour in-memory cache

export async function fetchBackendCategories(
  options: BackendCategoryOptions = {},
  cookieHeader?: string,
): Promise<Category[]> {
  const cacheKey = `${cookieHeader || 'client'}::${options.search || ''}::${options.page || 1}::${options.limit || 100}`;
  const now = Date.now();

  const cached = cachedBackendCategories.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const inFlight = inFlightBackendCategories.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const promise = (async () => {
    try {
      const headers = makeBackendHeaders(cookieHeader);
      const { default: http } = await import('@/lib/http');
      const { data } = await http.get<{
        success: boolean;
        data: {
          categories: Array<{
            id: string;
            nameEn: string;
            nameEs: string;
            categoryType: string;
            categoryIcon: string;
          }>;
          meta?: { total: number };
        };
      }>(CATEGORIES_ENDPOINTS.LIST, {
        headers: Object.keys(headers).length ? headers : undefined,
        params: {
          search: options.search || undefined,
          page: options.page ?? 1,
          limit: options.limit ?? 100,
        },
      });

      const rawList = Array.isArray(data.data?.categories) ? data.data.categories : [];
      const res = rawList.map(
        (c): Category => ({
          id: c.id,
          slug: backendSlug(c.nameEn),
          nameEn: c.nameEn,
          nameEs: c.nameEs,
          icon: c.categoryIcon || undefined,
          isArchived: false,
          kind: 'general',
          subcategories: [],
        }),
      );

      cachedBackendCategories.set(cacheKey, { data: res, expiresAt: Date.now() + BACKEND_CATEGORIES_CACHE_TTL_MS });
      return res;
    } finally {
      inFlightBackendCategories.delete(cacheKey);
    }
  })();

  inFlightBackendCategories.set(cacheKey, promise);
  return promise;
}
