'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Procedure, Category, ProcedureStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/custom-select';
import { LuArrowDownAZ, LuArrowRight, LuArrowUpAZ, LuBrush, LuBuilding2, LuCircleCheck, LuClock, LuFilePen, LuFileSearch, LuFileText, LuFilter, LuFolder, LuGlobe, LuHistory, LuLayers, LuLayoutGrid, LuListChecks, LuRefreshCw, LuSearch, LuShieldAlert, LuStore, LuTruck, LuUtensils, LuWrench, LuX } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import type { IconType } from 'react-icons';

interface LibraryProcedureExplorerProps {
  procedures: Procedure[];
  categories: Category[];
  locale: string;
}

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

  // Filters State
  const [selectedCategorySlug, setSelectedCategorySlug] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | ProcedureStatus>('all');
  const [sortBy, setSortBy] = React.useState<'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc'>('updated_desc');
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list');

  // Deduplicate categories by normalized English name / slug so duplicate entries like "Station Procedures" merge cleanly
  const { categoryList, categoryCounts, categorySlugMap } = React.useMemo(() => {
    const rawCategories: Category[] = [];

    if (categories && categories.length > 0) {
      for (const c of categories) {
        if (!c.isArchived) rawCategories.push(c);
      }
    }

    for (const p of procedures) {
      if (p.category) {
        rawCategories.push(p.category);
      }
    }

    const canonicalByName = new Map<string, Category>();
    const slugToCanonicalSlug = new Map<string, string>();

    for (const cat of rawCategories) {
      const normKey = (cat.nameEn || cat.nameEs || cat.slug).toLowerCase().trim();
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

    // Count procedures per canonical category slug
    const counts: Record<string, number> = { all: procedures.length };

    for (const p of procedures) {
      if (!p.category) {
        counts['other'] = (counts['other'] || 0) + 1;
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
  }, [categories, procedures]);

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
        const count = categoryCounts[cat.slug] || 0;
        return {
          value: cat.slug,
          label: `${name} (${count})`,
          icon: theme.icon,
        };
      }),
    ];
  }, [categoryList, categoryCounts, isEs]);

  const statusOptions = React.useMemo(() => {
    return [
      { value: 'all', label: isEs ? 'Todos los estados' : 'All Status', icon: LuLayers },
      { value: 'published', label: isEs ? 'Publicados' : 'Published', icon: LuCircleCheck },
      { value: 'draft', label: isEs ? 'Borradores' : 'Drafts', icon: LuFilePen },
    ];
  }, [isEs]);

  const sortOptions = React.useMemo(() => {
    return [
      { value: 'updated_desc', label: isEs ? 'Recientes primero' : 'Recently updated', icon: LuClock },
      { value: 'updated_asc', label: isEs ? 'Antiguos primero' : 'Oldest updated', icon: LuHistory },
      { value: 'title_asc', label: isEs ? 'Título A-Z' : 'Title A-Z', icon: LuArrowDownAZ },
      { value: 'title_desc', label: isEs ? 'Título Z-A' : 'Title Z-A', icon: LuArrowUpAZ },
    ];
  }, [isEs]);

  // Filtered procedures
  const filteredProcedures = React.useMemo(() => {
    return procedures
      .filter((p) => {
        // Category Filter
        if (selectedCategorySlug !== 'all') {
          if (!p.category) {
            if (selectedCategorySlug !== 'other') return false;
          } else {
            const rawKey = p.category.slug || p.category.id;
            const canonicalSlug = categorySlugMap.get(rawKey) || p.category.slug;
            if (canonicalSlug !== selectedCategorySlug) return false;
          }
        }

        // Status Filter
        if (statusFilter !== 'all' && p.status !== statusFilter) {
          return false;
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
  }, [procedures, selectedCategorySlug, statusFilter, searchQuery, sortBy, isEs, categorySlugMap]);

  const hasActiveFilters =
    selectedCategorySlug !== 'all' || statusFilter !== 'all' || searchQuery.trim().length > 0;

  const resetFilters = () => {
    setSelectedCategorySlug('all');
    setStatusFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      {/* Category Pills Filter Bar with Procedure Counts */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--color-ink-3)]">
            {isEs ? 'Categorías' : 'Categories'}
          </span>
          <span className="text-xs font-medium text-[var(--color-ink-2)]">
            {procedures.length} {isEs ? 'procedimientos en total' : 'total procedures'}
          </span>
        </div>

        {/* Scrollable Pills Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
          {/* "All" Pill */}
          <button
            type="button"
            onClick={() => setSelectedCategorySlug('all')}
            className={cn(
              'group inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all',
              selectedCategorySlug === 'all'
                ? 'border-[var(--color-ink)] bg-[var(--color-panel)] text-[var(--color-ink)]'
                : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-line-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]',
            )}
          >
            <LuLayoutGrid aria-hidden="true" className="text-sm" />
            <span>{isEs ? 'Todas' : 'All'}</span>
            <span
              className={cn(
                'ml-0.5 rounded-full px-2 py-0.5 text-xs font-bold',
                selectedCategorySlug === 'all'
                  ? 'bg-[var(--color-surface)] text-[var(--color-ink)]'
                  : 'bg-[var(--color-wash)] text-[var(--color-ink-2)] group-hover:bg-[var(--color-line-2)]',
              )}
            >
              {categoryCounts.all || 0}
            </span>
          </button>

          {/* Deduplicated Category Pills */}
          {categoryList.map((cat) => {
            const count = categoryCounts[cat.slug] || 0;
            const isSelected = selectedCategorySlug === cat.slug;
            const theme = getCategoryTheme(cat.slug);
            const name = isEs ? cat.nameEs : cat.nameEn;

            return (
              <button
                key={cat.id || cat.slug}
                type="button"
                onClick={() => setSelectedCategorySlug(cat.slug)}
                className={cn(
                  'group inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all',
                  isSelected
                    ? 'border-[var(--color-ink)] bg-[var(--color-panel)] text-[var(--color-ink)]'
                    : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-line-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]',
                )}
              >
                <Icon icon={theme.icon} className={cn('text-sm', theme.badgeText)} />
                <span>{name}</span>
                <span
                  className={cn(
                    'ml-0.5 rounded-full px-2 py-0.5 text-xs font-bold',
                    isSelected
                      ? 'bg-[var(--color-surface)] text-[var(--color-ink)]'
                      : 'bg-[var(--color-wash)] text-[var(--color-ink-2)] group-hover:bg-[var(--color-line-2)]',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Search and Multi-Filter Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-3">
        <div className="flex flex-1 flex-wrap items-center gap-3 min-w-field-lg">
          {/* Search Box */}
          <div className="relative flex-1 min-w-field-md">
            <LuSearch aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-3)]" />
            <Input
              type="text"
              placeholder={isEs ? 'Buscar por título, slug o descripción...' : 'Search by title, slug or purpose...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-8 text-xs h-tap-admin bg-[var(--color-surface)] border-[var(--color-line-2)] focus:border-[var(--color-brand-600)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
              >
                <LuX aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Custom Category Dropdown Selector */}
          <div className="w-field-md shrink-0">
            <CustomSelect
              value={selectedCategorySlug}
              onChange={setSelectedCategorySlug}
              options={categoryOptions}
              size="sm"
              className="h-tap-admin text-xs"
            />
          </div>

          {/* Custom Status Filter Select */}
          <div className="w-field-sm shrink-0">
            <CustomSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              options={statusOptions}
              size="sm"
              className="h-tap-admin text-xs"
            />
          </div>
        </div>

        {/* Right side: Sort & View Controls */}
        <div className="flex items-center gap-2">
          {/* Custom Sort Dropdown */}
          <div className="w-field-sm shrink-0">
            <CustomSelect
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              options={sortOptions}
              size="sm"
              className="h-tap-admin text-xs"
            />
          </div>

          {/* View Switcher (List vs Grid) */}
          <div className="flex items-center rounded-lg border border-[var(--color-line-2)] bg-[var(--color-wash)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-sm transition-colors',
                viewMode === 'list'
                  ? 'bg-[var(--color-panel-2)] text-[var(--color-ink)] font-semibold'
                  : 'text-[var(--color-ink-3)] hover:text-[var(--color-ink)]',
              )}
              title="List View"
            >
              <LuListChecks aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-sm transition-colors',
                viewMode === 'grid'
                  ? 'bg-[var(--color-panel-2)] text-[var(--color-ink)] font-semibold'
                  : 'text-[var(--color-ink-3)] hover:text-[var(--color-ink)]',
              )}
              title="Grid View"
            >
              <LuLayoutGrid aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Status Bar */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between rounded-lg bg-[var(--color-panel)] px-4 py-2 text-xs border border-[var(--color-line)]">
          <div className="flex items-center gap-2 text-[var(--color-ink-2)]">
            <LuFilter aria-hidden="true" className="text-[var(--color-ink-2)]" />
            <span>
              {isEs ? 'Mostrando' : 'Showing'}{' '}
              <strong className="text-[var(--color-ink)]">{filteredProcedures.length}</strong>{' '}
              {isEs ? 'de' : 'of'}{' '}
              <strong className="text-[var(--color-ink)]">{procedures.length}</strong>{' '}
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

      {/* Empty State when zero match */}
      {filteredProcedures.length === 0 ? (
        <article className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] px-6 py-16 text-center space-y-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-[var(--color-wash)] text-[var(--color-ink-3)] text-xl">
            <LuFileSearch aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h3 className="font-[family-name:var(--font-ui)] text-base font-semibold text-[var(--color-ink)]">
              {isEs ? 'No se encontraron procedimientos' : 'No procedures found'}
            </h3>
            <p className="text-xs text-[var(--color-ink-2)] max-w-sm">
              {isEs
                ? 'Intenta ajustar tus términos de búsqueda o selecciona otra categoría.'
                : 'Try adjusting your search query or selecting another category filter.'}
            </p>
          </div>
          {hasActiveFilters && (
            <Button type="button" variant="secondary" size="sm" onClick={resetFilters}>
              {isEs ? 'Ver todos los procedimientos' : 'View all procedures'}
            </Button>
          )}
        </article>
      ) : viewMode === 'list' ? (
        /* List View - Rich Cards Matching Design Specification */
        <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
          {filteredProcedures.map((p) => {
            const catName = p.category
              ? isEs
                ? p.category.nameEs
                : p.category.nameEn
              : 'General';
            const catSlug = p.category?.slug ?? 'general';
            const theme = getCategoryTheme(catSlug);
            const title = (isEs ? p.titleEs || p.titleEn : p.titleEn || p.titleEs) || p.slug;
            const purpose = isEs ? p.purposeEs || p.purposeEn : p.purposeEn || p.purposeEs;
            const isRecipe = catSlug === 'recipes' || p.slug.includes('recipe');
            const hasBothLangs = Boolean((p.titleEn && p.titleEs) || (p.purposeEn && p.purposeEs));

            return (
              <li
                key={p.id}
                className="group flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 hover:bg-[var(--color-wash)] transition-colors"
              >
                {/* Left Section: Category Icon + Title + Purpose + Submeta */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {/* Category Icon Badge */}
                  <div
                    className={cn(
                      'flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border text-xl transition-transform',
                      theme.badgeBg,
                      theme.badgeBorder,
                    )}
                  >
                    <Icon icon={theme.icon} />
                  </div>

                  {/* Title & Metadata */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-sm font-semibold tracking-snug text-[var(--color-ink)] group-hover:text-[var(--color-brand-700)] transition-colors">
                        {title}
                      </h4>

                      {/* Format Tag Badge */}
                      {isRecipe ? (
                        <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--color-panel)] px-2 py-0.5 text-xs font-semibold text-[var(--color-ink-2)]">
                          <LuUtensils aria-hidden="true" className="text-xs" />
                          Recipe
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--color-panel)] px-2 py-0.5 text-xs font-semibold text-[var(--color-ink-2)]">
                          <LuBuilding2 aria-hidden="true" className="text-xs" />
                          {catName}
                        </span>
                      )}

                      {/* Status Badge */}
                      {p.status === 'draft' ? (
                        <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--color-panel)] px-2 py-0.5 text-xs font-semibold text-[var(--color-ink-2)]">
                          <span className="size-2 rounded-full bg-[var(--color-ink-3)]" />
                          Draft
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--color-ok-tint)] px-2 py-0.5 text-xs font-semibold text-[var(--color-ok)]">
                          <span className="size-2 rounded-full bg-[var(--color-ok)]" />
                          Published
                        </span>
                      )}
                    </div>

                    {/* Purpose Subtitle */}
                    {purpose && (
                      <p className="line-clamp-2 text-xs text-[var(--color-ink-2)] leading-relaxed">
                        {purpose}
                      </p>
                    )}

                    {/* Metadata Line */}
                    <div className="flex items-center gap-2 pt-1 text-xs text-[var(--color-ink-3)]">
                      <LuFileText aria-hidden="true" className="text-sm" />
                      <span>
                        Updated {new Date(p.updatedAt).toLocaleDateString()}{' '}
                        {new Date(p.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {p.createdBy && (
                        <>
                          <span>·</span>
                          <span>Created by {p.createdBy}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side Info Column & Action Buttons */}
                <div className="flex items-center gap-6 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--color-line)]">
                  {/* Category & Format Details (Fixed width so all rows align vertically) */}
                  <div className="hidden lg:flex w-field-md shrink-0 flex-col gap-1 text-xs text-[var(--color-ink-2)] pr-4 border-r border-[var(--color-line)]">
                    <div className="flex items-center gap-2 font-medium">
                      <Icon icon={theme.icon} className={cn('text-xs', theme.badgeText)} />
                      <span>{isRecipe ? 'Recipe' : 'Procedure'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--color-ink-3)] truncate">
                      <LuFolder aria-hidden="true" className="text-xs shrink-0" />
                      <span className="truncate">{catName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--color-ink-3)]">
                      <LuGlobe aria-hidden="true" className="text-xs shrink-0" />
                      <span>{hasBothLangs ? 'EN / ES' : 'EN'}</span>
                    </div>
                  </div>

                  {/* Actions (Fixed width so View buttons line up vertically across all rows) */}
                  <div className="flex items-center justify-end w-20 shrink-0">
                    <Link href={`/procedures/${p.slug}`}>
                      <Button
                        variant="neutral"
                        size="sm"
                        className="gap-2 font-semibold"
                      >
                        <span>View</span>
                        <LuArrowRight aria-hidden="true" className="text-xs" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProcedures.map((p) => {
            const catName = p.category
              ? isEs
                ? p.category.nameEs
                : p.category.nameEn
              : 'General';
            const catSlug = p.category?.slug ?? 'general';
            const theme = getCategoryTheme(catSlug);
            const title = (isEs ? p.titleEs || p.titleEn : p.titleEn || p.titleEs) || p.slug;
            const purpose = isEs ? p.purposeEs || p.purposeEn : p.purposeEn || p.purposeEs;
            const isRecipe = catSlug === 'recipes' || p.slug.includes('recipe');

            return (
              <div
                key={p.id}
                className="group relative flex flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-brand-tint-2)] transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    {/* Category Icon */}
                    <div
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border text-lg transition-transform',
                        theme.badgeBg,
                        theme.badgeBorder,
                      )}
                    >
                      <Icon icon={theme.icon} />
                    </div>

                    {/* Status Badge */}
                    {p.status === 'draft' ? (
                      <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--color-panel)] px-2 py-0.5 text-xs font-semibold text-[var(--color-ink-2)]">
                          <span className="size-2 rounded-full bg-[var(--color-ink-3)]" />
                        Draft
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--color-ok-tint)] px-2 py-0.5 text-xs font-semibold text-[var(--color-ok)]">
                          <span className="size-2 rounded-full bg-[var(--color-ok)]" />
                        Published
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-[var(--color-ink-3)] block">
                      {catName}
                    </span>
                    <h4 className="font-[family-name:var(--font-ui)] text-sm font-semibold tracking-snug text-[var(--color-ink)] line-clamp-2 leading-snug group-hover:text-[var(--color-brand-700)] transition-colors">
                      {title}
                    </h4>
                    {purpose && (
                      <p className="line-clamp-2 text-xs text-[var(--color-ink-2)] pt-1">
                        {purpose}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--color-line)] flex items-center justify-between text-xs">
                  <span className="text-[var(--color-ink-3)]">
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </span>
                  <Link href={`/procedures/${p.slug}`}>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 px-3 text-xs font-semibold"
                    >
                      <span>View</span>
                      <LuArrowRight aria-hidden="true" className="text-xs" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
