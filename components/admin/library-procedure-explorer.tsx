'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { deleteProcedure, listCategories, listProcedures, setProcedureState } from '@/lib/api';
import type { Procedure, Category, ProcedureStatus, Subcategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/custom-select';
import {
  LuArchive,
  LuArchiveRestore,
  LuBrush,
  LuBuilding2,
  LuCircleCheck,
  LuCircleDashed,
  LuEye,
  LuFilePen,
  LuFileSearch,
  LuFileText,
  LuLock,
  LuPencil,
  LuPlus,
  LuFilter,
  LuFolder,
  LuGlobe,
  LuLayers,
  LuLayoutGrid,
  LuRefreshCw,
  LuSearch,
  LuShieldAlert,
  LuStore,
  LuTrash2,
  LuTruck,
  LuUtensils,
  LuWrench,
  LuX,
} from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import type { IconType } from 'react-icons';
import { StatusPill } from '@/components/ui/status-pill';
import { FilterChips } from '@/components/ui/filter-chips';
import { IconTile } from '@/components/ui/icon-tile';
import { EmptyState } from '@/components/ui/empty-state';
import { RowActions, type RowActionItem } from '@/components/ui/row-actions';

interface LibraryProcedureExplorerProps {
  procedures: Procedure[];
  categories: Category[];
  locale: string;
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
        icon: LuUtensils,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'station':
    case 'station-procedures':
      return {
        icon: LuStore,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'cleaning':
    case 'cleaning-schedules':
      return {
        icon: LuBrush,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'admin':
    case 'general':
    case 'general-procedures':
      return {
        icon: LuFileText,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'delivery':
    case 'delivery-receiving':
      return {
        icon: LuTruck,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'food-safety':
    case 'safety':
      return {
        icon: LuShieldAlert,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'equipment':
    case 'equipment-handling':
      return {
        icon: LuWrench,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    default:
      return {
        icon: LuFolder,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
  }
}

export function LibraryProcedureExplorer({
  procedures,
  categories,
  locale,
}: LibraryProcedureExplorerProps): React.ReactElement {
  const isEs = locale === 'es';
  const router = useRouter();

  const [liveCategories, setLiveCategories] = React.useState<Category[]>(categories ?? []);
  const [liveProcedures, setLiveProcedures] = React.useState<Procedure[]>(procedures ?? []);

  React.useEffect(() => {
    let isMounted = true;
    async function syncData() {
      try {
        const catRes = await listCategories('loc-main', {
          includeArchived: true,
        });
        const procRes = await listProcedures({});
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
    syncData();

    window.addEventListener('lms_categories_updated', syncData);
    window.addEventListener('storage', syncData);
    return () => {
      isMounted = false;
      window.removeEventListener('lms_categories_updated', syncData);
      window.removeEventListener('storage', syncData);
    };
  }, []);

  const act = React.useCallback(async (id: string, change: { status?: ProcedureStatus; isArchived?: boolean }) => {
    const updated = await setProcedureState(id, change);
    setLiveProcedures((list) => list.map((p) => (p.id === id ? updated : p)));
  }, []);

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
      setCurrentPage(1);
    }
  }, [selectedCategorySlug]);

  const [searchQuery, setSearchQuery] = React.useState<string>('');
  // Archived is its own choice: out of the list by default, one pick away for
  // the audit.
  const [statusFilter, setStatusFilter] = React.useState<'all' | ProcedureStatus | 'archived'>('all');
  const [sortBy, setSortBy] = React.useState<'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc'>(
    'updated_desc',
  );
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  // Six a page turned a restaurant's 50-100 documents into a dozen pages.
  const pageSize = 25;

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
      },
      {
        id: 'cat-kitchen-ops',
        slug: 'kitchen-operations',
        nameEn: 'Kitchen Operations',
        nameEs: 'Operaciones de Cocina',
        isArchived: false,
      },
      {
        id: 'cat-cleaning',
        slug: 'cleaning',
        nameEn: 'Cleaning Schedules',
        nameEs: 'Horarios de Limpieza',
        isArchived: false,
      },
      {
        id: 'cat-onboarding',
        slug: 'onboarding',
        nameEn: 'Onboarding',
        nameEs: 'Inducción y Capacitación',
        isArchived: false,
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
    // What the list shows by default: archived documents are out of it, so
    // they are out of the counts too, or "Food Safety 2" opened a list of one.
    const current = allProcedures.filter((p) => !p.isArchived);
    const counts: Record<string, number> = { all: current.length };

    for (const p of current) {
      if (!p.category) {
        counts['general'] = (counts['general'] || 0) + 1;
        continue;
      }
      const rawKey = p.category.slug || p.category.id;
      const canonicalSlug = slugToCanonicalSlug.get(rawKey) || p.category.slug;
      counts[canonicalSlug] = (counts[canonicalSlug] || 0) + 1;
    }

    return {
      categoryList: uniqueCategories,
      categoryCounts: counts,
      categorySlugMap: slugToCanonicalSlug,
    };
  }, [categories, allProcedures]);

  // Options for CustomSelect dropdowns
  const categoryOptions = React.useMemo(() => {
    return [
      {
        value: 'all',
        label: `${isEs ? 'Todas las categorías' : 'All Categories'} (${categoryCounts.all || 0})`,
        icon: LuLayoutGrid,
      },
      ...categoryList.map((cat) => {
        const theme = getCategoryTheme(cat.slug);
        const name = isEs ? cat.nameEs : cat.nameEn;
        return {
          value: cat.slug,
          label: name,
          icon: theme.icon,
        };
      }),
    ];
  }, [categoryList, isEs]);

  // Subcategories the manager can pick. Scoped to the currently selected
  // category when one is chosen, so the dropdown is short and the picked
  // subcategory is guaranteed to live under the chosen category. "all" (no
  // category chip) shows every subcategory across every category.
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
        icon: LuLayers,
      },
      ...unique.map((sub) => {
        const name = isEs ? sub.nameEs : sub.nameEn;
        return {
          value: sub.id,
          label: name,
          icon: LuLayers,
        };
      }),
    ];
  }, [categoryList, selectedCategorySlug, isEs]);

  const statusOptions = React.useMemo(() => {
    return [
      {
        value: 'all',
        label: isEs ? 'Todos los estados' : 'All statuses',
        icon: LuLayers,
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

  // Filtered procedures
  const filteredProcedures = React.useMemo(() => {
    return allProcedures
      .filter((p) => {
        // Category Filter
        if (selectedCategorySlug !== 'all') {
          if (!p.category) {
            if (selectedCategorySlug !== 'general') return false;
          } else {
            const rawKey = p.category.slug || p.category.id;
            const canonicalSlug = categorySlugMap.get(rawKey) || p.category.slug;
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
  }, [allProcedures, selectedCategorySlug, selectedSubcategoryId, statusFilter, searchQuery, sortBy, isEs, categorySlugMap]);

  const hasActiveFilters =
    selectedCategorySlug !== 'all' ||
    selectedSubcategoryId !== 'all' ||
    statusFilter !== 'all' ||
    searchQuery.trim().length > 0;

  const resetFilters = (): void => {
    setSelectedCategorySlug('all');
    setSelectedSubcategoryId('all');
    setStatusFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Pagination bounds
  const totalItems = filteredProcedures.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedProcedures = filteredProcedures.slice(startIndex, startIndex + pageSize);

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
      {/* The categories, as filters, on their own row. The count in each pill
          answers "is there anything in there?" before the click. */}
      <div className="space-y-2">
        <span className="block text-sm font-semibold text-[var(--color-ink-3)]">
          {isEs ? 'Categorías' : 'Categories'}
        </span>

        {/* On a phone the eight pills took half the screen in four rows; there
            they scroll sideways in one, as on the cook's procedures list. */}
        <div className="chip-rail -mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <FilterChips
          className="flex-nowrap sm:flex-wrap"
          label={isEs ? 'Categoría' : 'Category'}
          value={selectedCategorySlug}
          onChange={(slug) => {
            setSelectedCategorySlug(slug);
            setCurrentPage(1);
          }}
          chips={[
            { value: 'all', label: isEs ? 'Todas' : 'All', count: categoryCounts.all || 0 },
            ...categoryList.map((cat) => ({
              value: cat.slug,
              label: isEs ? cat.nameEs : cat.nameEn,
              count: categoryCounts[cat.slug] || 0,
            })),
          ]}
        />
        </div>
      </div>

      {/* One control per question. The search field was a hand-built copy of the
          one in the admin bar — same job, same shape, two implementations. The
          view switch is the segmented control the language switch and the batch
          scaler use. */}
      {/* A row of controls, not a card: the search, the two filters and the view
          switch each carry their own edge, and wrapping them in a second
          surface put the page's chrome on the same plane as its content. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="find" role="search">
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
              setCurrentPage(1);
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

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-field-sm shrink-0">
            <CustomSelect
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val as ProcedureStatus | 'all' | 'archived');
                setCurrentPage(1);
              }}
              options={statusOptions}
              size="sm"
              className="h-tap-admin text-sm"
            />
          </div>
          <div className="w-field-md shrink-0">
            <CustomSelect
              value={selectedSubcategoryId}
              onChange={(val) => {
                setSelectedSubcategoryId(val);
                setCurrentPage(1);
              }}
              options={subcategoryOptions}
              size="sm"
              className="h-tap-admin text-sm"
            />
          </div>

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

      {/* Empty State */}
      {allProcedures.length === 0 ? (
        <EmptyState
          icon={LuFileText}
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
          {paginatedProcedures.map((p, index) => {
            const catName = p.category ? (isEs ? p.category.nameEs : p.category.nameEn) : 'General';
            const catSlug = p.category?.slug ?? 'general';
            const theme = getCategoryTheme(catSlug);
            const title = (isEs ? p.titleEs || p.titleEn : p.titleEn || p.titleEs) || p.slug;
            const purpose = isEs ? p.purposeEs || p.purposeEn : p.purposeEn || p.purposeEs;
            const isRecipe = catSlug === 'recipes' || catSlug === 'recipe' || p.slug.includes('recipe');
            // The same test the admin home uses: a Spanish-reading cook cannot
            // read it. A bare "EN" beside "EN / ES" did not say that was a gap.
            const noSpanish = !p.titleEs.trim() || (p.bodyEn.blocks.length > 0 && p.bodyEs.blocks.length === 0);
            const subCategory =
              (p as any).subCategory ||
              (isRecipe
                ? 'Main Menu'
                : catSlug.includes('station')
                  ? 'Kitchen Stations'
                  : catSlug.includes('clean')
                    ? 'Maintenance'
                    : 'Food Safety');
            const isFirstCard = index === 0 && validCurrentPage === 1;

            return (
              <li key={p.id} className="flex items-center gap-2 pr-3 transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-wash)]">
                {/* The row is the link. Six identical "View" buttons down the
                    list were six copies of one action. What changes the
                    procedure's state sits in its menu. */}
                <Link
                  href={`/${locale}/procedures/${p.slug}`}
                  className="group flex min-w-0 flex-1 items-center justify-between gap-4 py-5 pl-4"
                >
                {/* The icon is a mark, not a framed object: the bordered tile was
                    the only one of its kind in the product. */}
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <IconTile size="lg" icon={theme.icon} />

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

                    {/* One meta line: what it is, what languages it exists in, and
                        when it last moved. The category was also a badge above and
                        a column to the right; it is said once, here. */}
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-meta text-[var(--color-ink-3)]">
                      <span>{catName}</span>
                      <span aria-hidden="true">·</span>
                      {p.protection === 'confidential' || p.protection === 'master' ? (
                        <>
                          <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-ink-2)]">
                            <LuLock aria-hidden="true" />
                            {p.protection === 'master'
                              ? isEs ? 'Receta maestra' : 'Master recipe'
                              : isEs ? 'Confidencial' : 'Confidential'}
                          </span>
                          <span aria-hidden="true">·</span>
                        </>
                      ) : null}
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
                          ? { label: isEs ? 'Publicar' : 'Publish', icon: LuCircleCheck, onSelect: () => void act(p.id, { status: 'published' }) }
                          : { label: isEs ? 'Pasar a borrador' : 'Move to drafts', icon: LuCircleDashed, onSelect: () => void act(p.id, { status: 'draft' }) },
                      p.isArchived
                        ? null
                        : { label: isEs ? 'Archivar' : 'Archive', icon: LuArchive, onSelect: () => void act(p.id, { isArchived: true }) },
                    ].filter(Boolean) as RowActionItem[]
                  }
                />
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination Footer */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--color-line)] text-sm text-[var(--color-ink-3)]">
          <div>
            {isEs ? 'Mostrando' : 'Showing'} {startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)}{' '}
            {isEs ? 'de' : 'of'} {totalItems} {isEs ? 'procedimientos' : 'procedures'}
          </div>

          {totalPages > 1 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={validCurrentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="flex size-8 items-center justify-center text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)] disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-colors"
            >
              <Icon icon="ri-arrow-left-s-line" className="text-base" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={cn(
                  'flex size-8 items-center justify-center rounded-full text-sm font-bold transition-all',
                  validCurrentPage === pageNum
                    // Where you are, said the way the filter pills say it.
                    // A solid brand disc here was a second brand-filled
                    // control on a page that already has its one action.
                    ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] ring-1 ring-[var(--color-ring)]'
                    : 'text-[var(--color-ink-3)] hover:text-[var(--color-ink)]',
                )}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              disabled={validCurrentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="flex size-8 items-center justify-center text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)] disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-colors"
            >
              <Icon icon="ri-arrow-right-s-line" className="text-base" />
            </button>
          </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
