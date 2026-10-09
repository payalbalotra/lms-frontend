'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { deleteProcedure, listCategories, listProcedures, clearLibraryListCache, canPublishProcedure, setProcedureState } from '@/lib/api';
import type { Procedure, Category, ProcedureStatus, Station, Subcategory, ProcedureBlock } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/custom-select';
import {
  LuArchive,
  LuArchiveRestore,
  LuCircleCheck,
  LuCircleDashed,
  LuFilePen,
  LuFileSearch,
  LuLock,
  LuPencil,
  LuPlus,
  LuFilter,
  LuRefreshCw,
  LuSearch,
  LuX,
} from 'react-icons/lu';
import {
  PiBookOpenText,
  PiBookOpenUser,
  PiCookingPot,
  PiDoorOpen,
  PiFileText,
  PiFolder,
  PiFolders,
  PiShieldCheck,
  PiSparkle,
  PiSquaresFour,
  PiToolbox,
} from 'react-icons/pi';
import type { IconType } from 'react-icons';
import { StatusPill } from '@/components/ui/status-pill';
import { FilterChips } from '@/components/ui/filter-chips';
import { Skeleton } from '@/components/ui/skeleton';
import { IconTile } from '@/components/ui/icon-tile';
import { HoverImagePreview } from '@/components/ui/hover-image-preview';
import { EmptyState } from '@/components/ui/empty-state';
import { RowActions, type RowActionItem } from '@/components/ui/row-actions';
import { useQueryClient } from '@tanstack/react-query';
import { PROCEDURES_QUERY_KEY } from '@/services/library/hooks';
import { getProcedureIcon } from '@/lib/category-icons';
import { backendSlug } from '@/services/categories/api';
import { LibraryExplorerSkeleton } from '@/components/admin/library-explorer-skeleton';

interface LibraryProcedureExplorerProps {
  procedures: Procedure[];
  categories: Category[];
  /** Stations at the manager's location — drives the Station filter dropdown.
   *  Optional so callers that don't need the filter can keep passing the
   *  existing shape; when omitted the filter is hidden. */
  stations?: Station[];
  locale: string;
  isLoading?: boolean;
  /** Procedures query still resolving — the filter bar renders immediately
   *  with whatever catalog arrived, and only the list area shows a skeleton.
   *  The page no longer waits for every query before painting anything. */
  proceduresLoading?: boolean;
}

/**
 * The library, for a manager: category filters with counts, a search and sort
 * bar, and the procedures as a list or a grid.
 *
 * Every category wears the same neutral badge — the panel with ink-2 on it — and
 * is told apart by its icon and its name rather than by a colour of its own. A
 * palette of one hue per category was the first version; with eight categories it
 * turned the page into a chart of colours that mean nothing to a reader who has
 * not learnt the key.
 */
export function getCategoryTheme(slug: string): {
  icon: IconType;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
} {
  const normalized = (slug || '').toLowerCase();
  switch (normalized) {
    case 'recipes':
    case 'recipe':
      return {
        icon: PiBookOpenText,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'station':
    case 'station-procedures':
      return {
        icon: PiSquaresFour,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'cleaning':
    case 'cleaning-schedules':
      return {
        icon: PiSparkle,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'admin':
    case 'general':
    case 'general-procedures':
      return {
        icon: PiFileText,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'delivery':
    case 'delivery-receiving':
      return {
        icon: PiFolders,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'food-safety':
    case 'safety':
      return {
        icon: PiShieldCheck,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'equipment':
    case 'equipment-handling':
      return {
        icon: PiToolbox,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'kitchen-operations':
      return {
        icon: PiCookingPot,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'opening-closing':
      return {
        icon: PiDoorOpen,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'onboarding':
      return {
        icon: PiBookOpenUser,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    default:
      return {
        icon: PiFileText,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
  }
}

/** Rows revealed per "Show more" press. The list grows in place instead of
 *  paging, so filters, counts and search always see the whole dataset. */
const PAGE_SIZE = 25;

export function LibraryProcedureExplorer({
  procedures,
  categories,
  stations,
  locale,
  isLoading = false,
  proceduresLoading = false,
}: LibraryProcedureExplorerProps): React.ReactElement {
  if (isLoading) {
    return <LibraryExplorerSkeleton />;
  }

  const isEs = locale === 'es';
  const router = useRouter();

  const [liveCategories, setLiveCategories] = React.useState<Category[]>(categories ?? []);
  const [liveProcedures, setLiveProcedures] = React.useState<Procedure[]>(procedures ?? []);
  const [liveStations, setLiveStations] = React.useState<Station[]>(stations ?? []);

  React.useEffect(() => {
    if (categories) setLiveCategories(categories);
  }, [categories]);
  React.useEffect(() => {
    if (procedures) setLiveProcedures(procedures);
  }, [procedures]);
  React.useEffect(() => {
    if (stations) setLiveStations(stations);
  }, [stations]);

  React.useEffect(() => {
    let isMounted = true;
    async function syncData() {
      try {
        // Independent reads — awaiting one after the other doubles the
        // wait on every cross-tab refresh.
        const [catRes, procRes] = await Promise.all([
          listCategories('loc-main', {
            includeArchived: true,
          }),
          listProcedures({}),
        ]);
        if (isMounted) {
          if (catRes.categories && catRes.categories.length > 0) {
            setLiveCategories(catRes.categories);
          }
          if (procRes.procedures && procRes.procedures.length > 0) {
            setLiveProcedures(procRes.procedures);
          }
        }
      } catch {
        // Fallback
      }
    }

    window.addEventListener('lms_categories_updated', syncData);
    window.addEventListener('lms_procedures_updated', syncData);
    window.addEventListener('storage', syncData);
    return () => {
      isMounted = false;
      window.removeEventListener('lms_categories_updated', syncData);
      window.removeEventListener('lms_procedures_updated', syncData);
      window.removeEventListener('storage', syncData);
    };
  }, []);

  const act = React.useCallback(async (id: string, change: { status?: ProcedureStatus; isArchived?: boolean }) => {
    const updated = await setProcedureState(id, change);
    setLiveProcedures((list) => list.map((p) => (p.id === id ? updated : p)));
  }, []);

  const queryClient = useQueryClient();

  /** Archive through the real backend API (POST /procedures/:id/archive).
   *  Optimistic: the row leaves the list instantly (archived rows are
   *  filtered out of the default view) and rolls back from the server list
   *  if the call fails. Freshness caches are cleared so the next read —
   *  server or React Query — sees the archived state. */
  const onArchive = React.useCallback(
    async (id: string): Promise<void> => {
      setLiveProcedures((list) =>
        list.map((p) => (p.id === id || p.slug === id ? { ...p, isArchived: true } : p)),
      );
      try {
        const { archiveProcedure } = await import('@/services/library/api');
        await archiveProcedure(id);
        clearLibraryListCache();
        await queryClient.invalidateQueries({ queryKey: PROCEDURES_QUERY_KEY });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('lms_procedures_updated'));
        }
      } catch {
        // Roll back from the server list; keep the optimistic state only if
        // even the re-sync fails (offline).
        try {
          const { procedures } = await listProcedures({});
          if (procedures.length > 0) setLiveProcedures(procedures);
        } catch {
          // keep optimistic state
        }
      }
    },
    [queryClient],
  );

  // Filters State
  const searchParams = useSearchParams();
  const [selectedCategorySlug, setSelectedCategorySlug] = React.useState<string>(
    () => searchParams.get('category') || 'all'
  );

  React.useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      setSelectedCategorySlug(categoryParam);
    }
  }, [searchParams]);
  // The subcategory dropdown's options follow the category chip: pick
  // "Food Safety" and only Hygiene / Cross-Contamination / Labeling & Dating /
  // Allergy appear. Reset the subcategory whenever the category narrows so a
  // stale subcategory from another category does not produce an empty list.
  const [selectedSubcategoryId, setSelectedSubcategoryId] = React.useState<string>('all');

  const lastCategoryRef = React.useRef<string>(selectedCategorySlug);
  React.useEffect(() => {
    if (lastCategoryRef.current !== selectedCategorySlug) {
      lastCategoryRef.current = selectedCategorySlug;
      setSelectedSubcategoryId('all');
      setVisibleCount(PAGE_SIZE);
    }
  }, [selectedCategorySlug]);

  const [searchQuery, setSearchQuery] = React.useState<string>('');
  // Archived is its own choice: out of the list by default, one pick away for
  // the audit.
  const [statusFilter, setStatusFilter] = React.useState<'all' | ProcedureStatus | 'archived'>('all');
  // Station filter: narrows the list to procedures whose stationScope covers
  // the chosen station. `mode: 'all'` procedures are always kept because they
  // apply to every station; `mode: 'specific'` matches when stationIds contains
  // the picked id. The 'all' option restores the un-narrowed view.
  const [stationFilter, setStationFilter] = React.useState<string>('all');
  const [sortBy, setSortBy] = React.useState<'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc'>(
    'updated_desc',
  );
  const [visibleCount, setVisibleCount] = React.useState<number>(PAGE_SIZE);

  // A restaurant with nothing written yet sees that, and the way to start. A
  // stand-in set of documents here looked like someone else's library on day one.
  const allProcedures = liveProcedures;

  // Category counts & deduplication matching exact category pills in design reference
  const { categoryList, categoryCounts, categorySlugMap } = React.useMemo(() => {
    // The library's own categories first, then this fallback set for a location
    // that has none yet. Both orders matter: the real ones win, and the fallback
    // only fills gaps.
    const fallback: Category[] = [
      {
        id: 'cat-recipes',
        slug: 'recipes',
        nameEn: 'Recipe',
        nameEs: 'Recetas',
        isArchived: false,
        kind: 'general',
      },
      {
        id: 'cat-kitchen-ops',
        slug: 'kitchen-operations',
        nameEn: 'Kitchen Operations',
        nameEs: 'Operaciones de Cocina',
        isArchived: false,
        kind: 'general',
      },
      {
        id: 'cat-cleaning',
        slug: 'cleaning',
        nameEn: 'Cleaning Schedules',
        nameEs: 'Horarios de Limpieza',
        isArchived: false,
        kind: 'general',
      },
      {
        id: 'cat-onboarding',
        slug: 'onboarding',
        nameEn: 'Onboarding',
        nameEs: 'Inducción y Capacitación',
        isArchived: false,
        kind: 'general',
      },
    ];
    const rawCategories: Category[] = [...(liveCategories ?? []).filter((c) => !c.isArchived), ...fallback];

    const canonicalByName = new Map<string, Category>();
    const slugToCanonicalSlug = new Map<string, string>();

    for (const cat of rawCategories) {
      // Keyed by slug, not by name: the slug is what the filter matches on, and
      // two categories with the same slug under different names ("Recipe" and
      // "Recipes & Prep") produced two chips filtering the same set — and two
      // React children with the same key.
      const normKey = (cat.slug || cat.nameEn || cat.nameEs).toLowerCase().trim();
      const existing = canonicalByName.get(normKey);

      if (!existing) {
        canonicalByName.set(normKey, cat);
        slugToCanonicalSlug.set(cat.slug, cat.slug);
        if (cat.id) slugToCanonicalSlug.set(cat.id, cat.slug);
      } else {
        slugToCanonicalSlug.set(cat.slug, existing.slug);
        if (cat.id) slugToCanonicalSlug.set(cat.id, existing.slug);
      }
    }

    const uniqueCategories = Array.from(canonicalByName.values());
    // Backend rows carry their subcategory embedded (`subcategory: { id,
    // categoryId, … }`) but the backend category list ships no subcategories.
    // Fold the in-use subcategories into their categories (on clones — the
    // source objects may live in the React Query cache) so the subcategory
    // dropdown and name lookups see backend rows too.
    const enrichedCategories = uniqueCategories.map((c) => ({
      ...c,
      subcategories: [...(c.subcategories ?? [])],
    }));
    const enrichedById = new Map(enrichedCategories.map((c) => [c.id, c]));
    for (const p of allProcedures) {
      const sub = (
        p as unknown as {
          subcategory?: { id: string; categoryId: string; nameEn: string; nameEs: string } | null;
        }
      ).subcategory;
      if (!sub?.id) continue;
      const cat = enrichedById.get(sub.categoryId);
      if (!cat || cat.subcategories.some((s) => s.id === sub.id)) continue;
      cat.subcategories.push({
        id: sub.id,
        slug: backendSlug(sub.nameEn),
        nameEn: sub.nameEn,
        nameEs: sub.nameEs,
        categoryId: sub.categoryId,
      });
    }

    // What the list shows by default: archived documents are out of it, so
    // they are out of the counts too, or "Food Safety 2" opened a list of one.
    const current = allProcedures.filter((p) => !p.isArchived);
    const counts: Record<string, number> = { all: current.length };

    for (const p of current) {
      const procCat = p.category ?? (p.subcategoryId ? enrichedCategories.find((c) => c.subcategories?.some((s) => s.id === p.subcategoryId)) : null);
      if (!procCat) {
        counts['general'] = (counts['general'] || 0) + 1;
        continue;
      }
      const rawKey = procCat.slug || procCat.id;
      const canonicalSlug = slugToCanonicalSlug.get(rawKey) || procCat.slug;
      counts[canonicalSlug] = (counts[canonicalSlug] || 0) + 1;
    }

    return {
      categoryList: enrichedCategories,
      categoryCounts: counts,
      categorySlugMap: slugToCanonicalSlug,
    };
  }, [categories, allProcedures]);

  // Options for CustomSelect dropdowns
  const subById = React.useMemo(() => {
    const map = new Map<string, Subcategory>();
    for (const cat of categoryList) {
      for (const sub of cat.subcategories ?? []) {
        if (sub.id) map.set(sub.id, sub);
      }
    }
    return map;
  }, [categoryList]);

  // Category dropdown options: All, General (only when uncategorized rows
  // exist), then each category. Counts ride in the label so the "is there
  // anything in there?" answer survives the move from pills to dropdown.
  const categorySelectOptions = React.useMemo(() => {
    return [
      {
        value: 'all',
        label: `${isEs ? 'Todas las categorías' : 'All categories'} (${categoryCounts.all || 0})`,
        icon: PiSquaresFour,
      },
      ...((categoryCounts.general || 0) > 0
        ? [
            {
              value: 'general',
              label: `General (${categoryCounts.general || 0})`,
              icon: PiFileText,
            },
          ]
        : []),
      ...categoryList.map((cat) => {
        const theme = getCategoryTheme(cat.slug);
        const name = isEs ? cat.nameEs : cat.nameEn;
        return {
          value: cat.slug,
          label: `${name} (${categoryCounts[cat.slug] || 0})`,
          icon: theme.icon,
        };
      }),
    ];
  }, [categoryList, categoryCounts, isEs]);

  // Subcategories the manager can pick. Scoped to the currently selected
  // category when one is chosen, so the dropdown is short and the picked
  // subcategory is guaranteed to live under the chosen category. "all" (no
  // category picked) shows every subcategory across every category.
  const subcategoryOptions = React.useMemo(() => {
    const pool: Subcategory[] =
      selectedCategorySlug === 'all'
        ? categoryList.flatMap((cat) => cat.subcategories ?? [])
        : categoryList
            .filter((cat) => cat.slug === selectedCategorySlug)
            .flatMap((cat) => cat.subcategories ?? []);

    // Dedupe by id — two categories with overlapping subcategory ids would
    // otherwise show the same name twice.
    const seen = new Set<string>();
    const unique = pool.filter((s) => {
      if (!s.id || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });

    // Sort by display name in the active locale so the dropdown reads A-Z.
    unique.sort((a, b) => {
      const an = (isEs ? a.nameEs : a.nameEn).toLowerCase();
      const bn = (isEs ? b.nameEs : b.nameEn).toLowerCase();
      return an.localeCompare(bn);
    });

    return [
      {
        value: 'all',
        label: isEs ? 'Todas las subcategorías' : 'All subcategories',
        icon: PiFolders,
      },
      ...unique.map((sub) => {
        const name = isEs ? sub.nameEs : sub.nameEn;
        return {
          value: sub.id,
          label: name,
          icon: PiFolder,
        };
      }),
    ];
  }, [categoryList, selectedCategorySlug, isEs]);

  const statusOptions = React.useMemo(() => {
    return [
      {
        value: 'all',
        label: isEs ? 'Todos los estados' : 'All statuses',
        icon: PiFolder,
      },
      {
        value: 'published',
        label: isEs ? 'Publicados' : 'Published',
        icon: LuCircleCheck,
      },
      {
        value: 'draft',
        label: isEs ? 'Borradores' : 'Drafts',
        icon: LuFilePen,
      },
      {
        value: 'archived',
        label: isEs ? 'Archivados' : 'Archived',
        icon: LuArchive,
      },
    ];
  }, [isEs]);

  // Station options for the filter dropdown. Sorted by the station's
  // `sortOrder` so the picker reads in the same order the kitchen sees them.
  // Returns an empty list (and the dropdown is hidden) when no stations exist
  // at the current location — a single-station location doesn't need a picker.
  const stationOptions = React.useMemo(() => {
    const visible = (liveStations ?? []).filter((s) => !s.isArchived);
    if (visible.length === 0) return [];
    const sorted = [...visible].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    return [
      {
        value: 'all',
        label: isEs ? 'Todas las estaciones' : 'All stations',
        icon: PiSquaresFour,
      },
      ...sorted.map((s) => ({
        value: s.id,
        label: s.name,
        icon: PiSquaresFour,
      })),
    ];
  }, [liveStations, isEs]);

  // Filtered procedures
  const filteredProcedures = React.useMemo(() => {
    return allProcedures
      .filter((p) => {
        // Category Filter
        if (selectedCategorySlug !== 'all') {
          const procCat = p.category ?? (p.subcategoryId ? categoryList.find((c) => c.subcategories?.some((s) => s.id === p.subcategoryId)) : null);
          if (!procCat) {
            if (selectedCategorySlug !== 'general') return false;
          } else {
            const rawKey = procCat.slug || procCat.id;
            const canonicalSlug = categorySlugMap.get(rawKey) || procCat.slug;
            if (canonicalSlug !== selectedCategorySlug) return false;
          }
        }

        // Status Filter
        if (statusFilter === 'archived') {
          if (!p.isArchived) return false;
        } else {
          if (p.isArchived) return false;
          if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        }

        // Subcategory Filter — string match on the procedure's FK. The
        // dropdown's options are already scoped to the selected category,
        // so an empty result means "no procedures in this subcategory yet".
        if (selectedSubcategoryId !== 'all') {
          if (!p.subcategoryId || p.subcategoryId !== selectedSubcategoryId) {
            return false;
          }
        }

        // Station Filter — keep kitchen-wide procedures (mode: 'all') and the
        // ones whose stationScope explicitly names the picked station.
        // Procedures with no stationScope are treated as kitchen-wide.
        if (stationFilter !== 'all') {
          const scope = p.stationScope;
          if (scope && scope.mode === 'specific' && !scope.stationIds.includes(stationFilter)) {
            return false;
          }
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const titleEn = (p.titleEn || '').toLowerCase();
          const titleEs = (p.titleEs || '').toLowerCase();
          const purposeEn = (p.purposeEn || '').toLowerCase();
          const purposeEs = (p.purposeEs || '').toLowerCase();
          const slug = (p.slug || '').toLowerCase();
          const catName = p.category ? (isEs ? p.category.nameEs : p.category.nameEn).toLowerCase() : '';

          const match =
            titleEn.includes(q) ||
            titleEs.includes(q) ||
            purposeEn.includes(q) ||
            purposeEs.includes(q) ||
            slug.includes(q) ||
            catName.includes(q);

          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Prioritize Guacamole Fresco dish at the top on default / updated sort
        const isGuacA = a.id === 'proc-guacamole-fresco' || a.slug === 'guacamole-fresco' ? 1 : 0;
        const isGuacB = b.id === 'proc-guacamole-fresco' || b.slug === 'guacamole-fresco' ? 1 : 0;
        if ((!sortBy || sortBy === 'updated_desc') && isGuacA !== isGuacB) {
          return isGuacB - isGuacA;
        }
        if (sortBy === 'title_asc') {
          const titleA = (isEs ? a.titleEs || a.titleEn : a.titleEn || a.titleEs).toLowerCase();
          const titleB = (isEs ? b.titleEs || b.titleEn : b.titleEn || b.titleEs).toLowerCase();
          return titleA.localeCompare(titleB);
        }
        if (sortBy === 'title_desc') {
          const titleA = (isEs ? a.titleEs || a.titleEn : a.titleEn || a.titleEs).toLowerCase();
          const titleB = (isEs ? b.titleEs || b.titleEn : b.titleEn || b.titleEs).toLowerCase();
          return titleB.localeCompare(titleA);
        }
        if (sortBy === 'updated_asc') {
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [allProcedures, selectedCategorySlug, selectedSubcategoryId, statusFilter, stationFilter, searchQuery, sortBy, isEs, categorySlugMap]);

  const hasActiveFilters =
    selectedCategorySlug !== 'all' ||
    selectedSubcategoryId !== 'all' ||
    statusFilter !== 'all' ||
    stationFilter !== 'all' ||
    searchQuery.trim().length > 0;

  const resetFilters = (): void => {
    setSelectedCategorySlug('all');
    setSelectedSubcategoryId('all');
    setStatusFilter('all');
    setStationFilter('all');
    setSearchQuery('');
    setVisibleCount(PAGE_SIZE);
  };

  // Incremental reveal, not pages: the list grows in place so filters,
  // counts and search always operate on the whole dataset. The DOM stays
  // bounded (PAGE_SIZE rows at a time) no matter how large the library gets.
  const totalItems = filteredProcedures.length;
  const visibleProcedures = filteredProcedures.slice(0, visibleCount);

  /** Remove the procedure from state immediately (optimistic) then persist. */
  const handleDelete = React.useCallback(
    async (id: string): Promise<void> => {
      // Optimistic removal — update local state first so the UI responds instantly.
      setLiveProcedures((prev) => prev.filter((p) => p.id !== id && p.slug !== id));
      try {
        await deleteProcedure(id);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('lms_procedures_updated'));
        }
        router.refresh();
      } catch {
        // On failure, re-sync from the store (syncData re-runs on the storage event).
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('storage'));
        }
      }
    },
    [router],
  );

  return (
    <div className="space-y-6">
      {/* One row for everything: the All / General pills, the four dropdowns,
          then the search stretching to fill what's left. Wraps on narrow
          screens, single line on desktop. */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterChips
          label={isEs ? 'Categoría' : 'Category'}
          value={selectedCategorySlug}
          onChange={(slug) => {
            setSelectedCategorySlug(slug);
            setVisibleCount(PAGE_SIZE);
          }}
          chips={[
            { value: 'all', label: isEs ? 'Todas' : 'All', count: categoryCounts.all || 0 },
            { value: 'general', label: 'General', count: categoryCounts.general || 0 },
          ]}
        />

        <div className="w-field-md shrink-0">
          <CustomSelect
            value={selectedCategorySlug}
            onChange={(val) => {
              setSelectedCategorySlug(val);
              setVisibleCount(PAGE_SIZE);
            }}
            options={categorySelectOptions}
            size="sm"
            className="h-tap-admin text-sm"
          />
        </div>
        <div className="w-field-md shrink-0">
          <CustomSelect
            value={selectedSubcategoryId}
            onChange={(val) => {
              setSelectedSubcategoryId(val);
              setVisibleCount(PAGE_SIZE);
            }}
            options={subcategoryOptions}
            size="sm"
            className="h-tap-admin text-sm"
          />
        </div>
        {stationOptions.length > 1 ? (
          <div className="w-field-sm shrink-0">
            <CustomSelect
              value={stationFilter}
              onChange={(val) => {
                setStationFilter(val);
                setVisibleCount(PAGE_SIZE);
              }}
              options={stationOptions}
              size="sm"
              className="h-tap-admin text-sm"
            />
          </div>
        ) : null}
        <div className="w-field-sm shrink-0">
          <CustomSelect
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val as ProcedureStatus | 'all' | 'archived');
              setVisibleCount(PAGE_SIZE);
            }}
            options={statusOptions}
            size="sm"
            className="h-tap-admin text-sm"
          />
        </div>

        <div className="find min-w-52 flex-1" role="search">
          <LuSearch aria-hidden="true" className="i" />
          <label className="sr-only" htmlFor="library-search">
            {isEs ? 'Buscar en la biblioteca' : 'Search the library'}
          </label>
          <input
            id="library-search"
            type="search"
            value={searchQuery}
            placeholder={isEs ? 'Buscar procedimientos…' : 'Search procedures…'}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label={isEs ? 'Borrar búsqueda' : 'Clear search'}
              className="shrink-0 text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
            >
              <LuX aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Active Filters Notification Bar */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between rounded-lg bg-[var(--color-panel)] px-4 py-2 text-sm border border-[var(--color-line)]">
          <div className="flex items-center gap-2 text-[var(--color-ink-2)]">
            <LuFilter aria-hidden="true" className="text-[var(--color-ink-2)]" />
            <span>
              {isEs ? 'Mostrando' : 'Showing'}{' '}
              <strong className="text-[var(--color-ink)]">{filteredProcedures.length}</strong> {isEs ? 'de' : 'of'}{' '}
              <strong className="text-[var(--color-ink)]">{allProcedures.length}</strong>{' '}
              {isEs ? 'procedimientos' : 'procedures'}
            </span>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 font-semibold text-[var(--color-brand-700)] hover:underline"
          >
            <LuRefreshCw aria-hidden="true" />
            <span>{isEs ? 'Limpiar filtros' : 'Reset filters'}</span>
          </button>
        </div>
      )}

      {/* List area. While the procedures query resolves, the filter bar above
          is already interactive (its catalog is local) and only the rows
          skeletonize — the page never waits for every query to paint. */}
      {proceduresLoading ? (
        <ul
          aria-busy="true"
          aria-label={isEs ? 'Cargando procedimientos' : 'Loading procedures'}
          className="divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)]"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="flex items-center gap-4 py-5 pl-4 pr-3">
              <Skeleton className="size-12 shrink-0 rounded-[var(--radius-md)] bg-[var(--color-panel)]" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-52" />
                  <Skeleton className="h-5 w-16 rounded-full bg-[var(--color-panel)]" />
                </div>
                <Skeleton className="h-3.5 w-2/3 bg-[var(--color-panel)]" />
                <Skeleton className="h-3 w-1/2 bg-[var(--color-panel)]" />
              </div>
              <Skeleton className="size-8 shrink-0 rounded-full bg-[var(--color-panel)]" />
            </li>
          ))}
        </ul>
      ) : allProcedures.length === 0 ? (
        <EmptyState
          icon={PiFileText}
          title={isEs ? 'Aún no hay procedimientos' : 'No procedures yet'}
          body={
            isEs
              ? 'Escribe el primero desde la plantilla.'
              : 'Write your first one from the template.'
          }
          action={
            <Link href={`/${locale}/admin/library/new`}>
              <Button icon={LuPlus}>{isEs ? 'Nuevo procedimiento' : 'New procedure'}</Button>
            </Link>
          }
        />
      ) : filteredProcedures.length === 0 ? (
        <EmptyState
          icon={LuFileSearch}
          title={isEs ? 'No se encontraron procedimientos' : 'No procedures found'}
          body={
            isEs
              ? 'Intenta ajustar tus términos de búsqueda o selecciona otra categoría.'
              : 'Try adjusting your search query or selecting another category filter.'
          }
          action={
            hasActiveFilters ? (
              <Button type="button" variant="secondary" onClick={resetFilters}>
                {isEs ? 'Ver todos los procedimientos' : 'View all procedures'}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)]">
          {visibleProcedures.map((p) => {
            const procCategory = p.category ?? (p.subcategoryId ? categoryList.find((c) => c.subcategories?.some((s) => s.id === p.subcategoryId)) : null);
            const catName = procCategory ? (isEs ? procCategory.nameEs : procCategory.nameEn) : 'General';
            const title = (isEs ? p.titleEs || p.titleEn : p.titleEn || p.titleEs) || p.slug;
            const purpose = isEs ? p.purposeEs || p.purposeEn : p.purposeEn || p.purposeEs;
            const noSpanish =
              !p.titleEs?.trim() ||
              ((p.bodyEn?.blocks?.length ?? 0) > 0 && (p.bodyEs?.blocks?.length ?? 0) === 0);
            // Subcategory resolves from the FK via the map the catalog already
            // builds; absent subcategories just don't render, no string-sniffing
            // fallback that used to lie about recipe sections.
            const sub = p.subcategoryId ? subById.get(p.subcategoryId) ?? null : null;
            const subName = sub ? (isEs ? sub.nameEs : sub.nameEn) : null;
            // Station names — only for procedures with an explicit narrow scope
            // (mode: 'specific' with at least one station). Kitchen-wide
            // procedures don't carry a station in the meta line because the
            // whole floor follows them.
            const scopeStations =
              p.stationScope && p.stationScope.mode === 'specific' && p.stationScope.stationIds.length > 0
                ? p.stationScope.stationIds
                    .map((id) => liveStations.find((s) => s.id === id)?.name)
                    .filter((n): n is string => Boolean(n))
                : [];

            return (
              <li key={p.id} className="flex items-center gap-2 pr-3 transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-wash)]">
                {/* The row is the link. Six identical "View" buttons down the
                    list were six copies of one action. What changes the
                    procedure's state sits in its menu. */}
                <Link
                  href={`/${locale}/admin/library/${p.id}`}
                  className="group flex min-w-0 flex-1 items-center justify-between gap-4 py-5 pl-4"
                >
                {/* The icon is a mark, not a framed object: the bordered tile was
                    the only one of its kind in the product. */}
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  {(() => {
                    // The card icon follows the same priority as the employee
                    // procedure list: the body's first image (the recipe photo
                    // or, here, the buckets) is the most specific so it wins;
                    // then the manager's iconImageUrl override; then the
                    // category's default SVG via getProcedureIcon.
                    const findCover = (blocks: ProcedureBlock[] | undefined): string | null => {
                      if (!blocks) return null;
                      const imageBlock = blocks.find(
                        (b): b is Extract<ProcedureBlock, { kind: 'image' }> => b.kind === 'image',
                      );
                      if (imageBlock?.src) return imageBlock.src;
                      for (const b of blocks) {
                        if (b.kind === 'recipe' && b.steps) {
                          for (const s of b.steps) {
                            if (s.imageSrc) return s.imageSrc;
                            if (s.images && s.images.length > 0 && s.images[0].src) return s.images[0].src;
                          }
                        }
                        if (b.kind === 'method' && b.steps) {
                          for (const s of b.steps) {
                            if (s.imageSrc) return s.imageSrc;
                            if (s.images && s.images.length > 0 && s.images[0].src) return s.images[0].src;
                          }
                        }
                      }
                      return null;
                    };
                    const bodyCover = findCover(p.bodyEn?.blocks) ?? findCover(p.bodyEs?.blocks);
                    const iconSrc = bodyCover ?? p.iconImageUrl ?? null;
                    return iconSrc ? (
                      <HoverImagePreview src={iconSrc} alt={title}>
                        <IconTile size="lg" image={{ src: iconSrc, alt: title }} />
                      </HoverImagePreview>
                    ) : (
                      <IconTile
                        size="lg"
                        icon={getProcedureIcon(p, p.subcategoryId ? subById.get(p.subcategoryId) ?? null : null)}
                      />
                    );
                  })()}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h4 className="min-w-0 text-base font-semibold leading-heading text-[var(--color-ink)] transition-colors">
                        {title}
                      </h4>
                      <StatusPill tone={p.isArchived ? 'neutral' : p.status === 'published' ? 'ok' : 'neutral'} withDot>
                        {p.isArchived
                          ? isEs ? 'Archivado' : 'Archived'
                          : p.status === 'published' ? (isEs ? 'Publicado' : 'Published') : isEs ? 'Borrador' : 'Draft'}
                      </StatusPill>
                    </div>

                    {purpose ? (
                      <p className="mt-1 line-clamp-2 text-sm leading-body text-[var(--color-ink-2)]">{purpose}</p>
                    ) : null}

                    {/* One meta line: what it is, what slice of the kitchen it lives
                        in (subcategory + station), what languages it exists in,
                        and when it last moved. The category was also a badge above
                        and a column to the right; it is said once, here. */}
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-meta text-[var(--color-ink-3)]">
                      <span>{catName}</span>
                      {subName ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{subName}</span>
                        </>
                      ) : null}
                      {scopeStations.length > 0 ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>
                            {scopeStations.length === 1
                              ? scopeStations[0]
                              : `${scopeStations[0]} + ${scopeStations.length - 1}`}
                          </span>
                        </>
                      ) : null}
                      {p.protection === 'confidential' || p.protection === 'master' ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-ink-2)]">
                            <LuLock aria-hidden="true" />
                            {p.protection === 'master'
                              ? isEs ? 'Receta maestra' : 'Master recipe'
                              : isEs ? 'Confidencial' : 'Confidential'}
                          </span>
                        </>
                      ) : null}
                      <span aria-hidden="true">·</span>
                      {noSpanish ? (
                        <span className="font-semibold text-[var(--color-warn-ink)]">
                          {isEs ? 'Sin español' : 'No Spanish yet'}
                        </span>
                      ) : (
                        <span>EN / ES</span>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>
                        {isEs ? 'Actualizado' : 'Updated'}{' '}
                        {new Date(p.updatedAt).toLocaleDateString(isEs ? 'es' : 'en', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </p>
                  </div>
                </div>

                </Link>
                <RowActions
                  triggerLabel={`${isEs ? 'Acciones' : 'Actions'}: ${title}`}
                  items={
                    [
                      p.isArchived
                        ? null
                        : { label: isEs ? 'Editar' : 'Edit', icon: LuPencil, onSelect: () => router.push(`/${locale}/admin/library/${p.id}/edit`) },
                      p.isArchived
                        ? { label: isEs ? 'Restaurar' : 'Restore', icon: LuArchiveRestore, onSelect: () => void act(p.id, { isArchived: false }) }
                        : p.status === 'draft'
                          ? canPublishProcedure(p)
                            ? { label: isEs ? 'Publicar' : 'Publish', icon: LuCircleCheck, onSelect: () => void act(p.id, { status: 'published' }) }
                            : null
                          : { label: isEs ? 'Pasar a borrador' : 'Move to drafts', icon: LuCircleDashed, onSelect: () => void act(p.id, { status: 'draft' }) },
                      p.isArchived
                        ? null
                        : { label: isEs ? 'Archivar' : 'Archive', icon: LuArchive, onSelect: () => void onArchive(p.id) },
                    ].filter(Boolean) as RowActionItem[]
                  }
                />
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination Footer */}
      {/* Show-more footer. The count always reflects the whole filtered set;
          revealing is incremental so the DOM stays bounded at PAGE_SIZE rows
          per press no matter how large the library grows. */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--color-line)] text-sm text-[var(--color-ink-3)]">
          <div>
            {isEs ? 'Mostrando' : 'Showing'} {Math.min(visibleCount, totalItems)} {isEs ? 'de' : 'of'}{' '}
            {totalItems} {isEs ? 'procedimientos' : 'procedures'}
          </div>

          {visibleCount < totalItems ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              {isEs ? 'Mostrar más' : 'Show more'}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
