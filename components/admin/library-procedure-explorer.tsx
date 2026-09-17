'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Procedure, Category, ProcedureStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/custom-select';

interface LibraryProcedureExplorerProps {
  procedures: Procedure[];
  categories: Category[];
  locale: string;
}

export function getCategoryTheme(slug: string): {
  icon: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
} {
  const normalized = (slug || '').toLowerCase();
  switch (normalized) {
    case 'recipes':
    case 'recipe':
      return {
        icon: 'ri-restaurant-line',
        badgeBg: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
        badgeText: 'text-orange-700 dark:text-orange-300',
        badgeBorder: 'border-orange-300/40 dark:border-orange-800/40',
      };
    case 'station':
    case 'station-procedures':
      return {
        icon: 'ri-store-2-line',
        badgeBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
        badgeText: 'text-purple-700 dark:text-purple-300',
        badgeBorder: 'border-purple-300/40 dark:border-purple-800/40',
      };
    case 'cleaning':
    case 'cleaning-schedules':
      return {
        icon: 'ri-sparkles-line',
        badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        badgeText: 'text-emerald-700 dark:text-emerald-300',
        badgeBorder: 'border-emerald-300/40 dark:border-emerald-800/40',
      };
    case 'admin':
    case 'general':
    case 'general-procedures':
      return {
        icon: 'ri-file-text-line',
        badgeBg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
        badgeText: 'text-slate-700 dark:text-slate-300',
        badgeBorder: 'border-slate-300/40 dark:border-slate-700/40',
      };
    case 'delivery':
    case 'delivery-receiving':
      return {
        icon: 'ri-truck-line',
        badgeBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
        badgeText: 'text-blue-700 dark:text-blue-300',
        badgeBorder: 'border-blue-300/40 dark:border-blue-800/40',
      };
    case 'food-safety':
    case 'safety':
      return {
        icon: 'ri-shield-cross-line',
        badgeBg: 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
        badgeText: 'text-teal-700 dark:text-teal-300',
        badgeBorder: 'border-teal-300/40 dark:border-teal-800/40',
      };
    case 'equipment':
    case 'equipment-handling':
      return {
        icon: 'ri-tools-line',
        badgeBg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
        badgeText: 'text-indigo-700 dark:text-indigo-300',
        badgeBorder: 'border-indigo-300/40 dark:border-indigo-800/40',
      };
    default:
      return {
        icon: 'ri-folder-3-line',
        badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
        badgeText: 'text-amber-700 dark:text-amber-300',
        badgeBorder: 'border-amber-300/40 dark:border-amber-800/40',
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
        icon: 'ri-layout-grid-line',
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
      { value: 'all', label: isEs ? 'Todos los estados' : 'All Status', icon: 'ri-stack-line' },
      { value: 'published', label: isEs ? 'Publicados' : 'Published', icon: 'ri-checkbox-circle-line' },
      { value: 'draft', label: isEs ? 'Borradores' : 'Drafts', icon: 'ri-draft-line' },
    ];
  }, [isEs]);

  const sortOptions = React.useMemo(() => {
    return [
      { value: 'updated_desc', label: isEs ? 'Recientes primero' : 'Recently updated', icon: 'ri-time-line' },
      { value: 'updated_asc', label: isEs ? 'Antiguos primero' : 'Oldest updated', icon: 'ri-history-line' },
      { value: 'title_asc', label: isEs ? 'Título A-Z' : 'Title A-Z', icon: 'ri-sort-alphabet-asc' },
      { value: 'title_desc', label: isEs ? 'Título Z-A' : 'Title Z-A', icon: 'ri-sort-alphabet-desc' },
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
          <span className="text-[length:var(--text-xs)] font-bold uppercase tracking-wider text-[var(--color-ink-3)]">
            {isEs ? 'Categorías' : 'Categories'}
          </span>
          <span className="text-[length:var(--text-xs)] font-medium text-[var(--color-ink-2)]">
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
              'group inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[length:var(--text-xs)] font-semibold transition-all shadow-2xs',
              selectedCategorySlug === 'all'
                ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] font-bold ring-2 ring-[var(--color-brand-600)]/30'
                : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-line-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]',
            )}
          >
            <i aria-hidden="true" className="ri-layout-grid-line text-sm" />
            <span>{isEs ? 'Todas' : 'All'}</span>
            <span
              className={cn(
                'ml-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold',
                selectedCategorySlug === 'all'
                  ? 'bg-[var(--color-brand-600)] text-white'
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
                  'group inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[length:var(--text-xs)] font-semibold transition-all shadow-2xs',
                  isSelected
                    ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] font-bold ring-2 ring-[var(--color-brand-600)]/30'
                    : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-line-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]',
                )}
              >
                <i aria-hidden="true" className={cn(theme.icon, 'text-sm', theme.badgeText)} />
                <span>{name}</span>
                <span
                  className={cn(
                    'ml-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold',
                    isSelected
                      ? 'bg-[var(--color-brand-600)] text-white'
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-3 shadow-2xs">
        <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <i
              aria-hidden="true"
              className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-3)]"
            />
            <Input
              type="text"
              placeholder={isEs ? 'Buscar por título, slug o descripción...' : 'Search by title, slug or purpose...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 text-[length:var(--text-xs)] h-9 bg-[var(--color-surface)] border-[var(--color-line-2)] focus:border-[var(--color-brand-600)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
              >
                <i aria-hidden="true" className="ri-close-line" />
              </button>
            )}
          </div>

          {/* Custom Category Dropdown Selector */}
          <div className="w-[210px] shrink-0">
            <CustomSelect
              value={selectedCategorySlug}
              onChange={setSelectedCategorySlug}
              options={categoryOptions}
              size="sm"
              className="h-9 text-xs"
            />
          </div>

          {/* Custom Status Filter Select */}
          <div className="w-[140px] shrink-0">
            <CustomSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              options={statusOptions}
              size="sm"
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Right side: Sort & View Controls */}
        <div className="flex items-center gap-2">
          {/* Custom Sort Dropdown */}
          <div className="w-[160px] shrink-0">
            <CustomSelect
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              options={sortOptions}
              size="sm"
              className="h-9 text-xs"
            />
          </div>

          {/* View Switcher (List vs Grid) */}
          <div className="flex items-center rounded-lg border border-[var(--color-line-2)] bg-[var(--color-wash)]/60 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'flex size-8 items-center justify-center rounded-[6px] text-sm transition-colors',
                viewMode === 'list'
                  ? 'bg-[var(--color-surface)] text-[var(--color-brand-700)] font-bold shadow-2xs'
                  : 'text-[var(--color-ink-3)] hover:text-[var(--color-ink)]',
              )}
              title="List View"
            >
              <i aria-hidden="true" className="ri-list-check-2" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex size-8 items-center justify-center rounded-[6px] text-sm transition-colors',
                viewMode === 'grid'
                  ? 'bg-[var(--color-surface)] text-[var(--color-brand-700)] font-bold shadow-2xs'
                  : 'text-[var(--color-ink-3)] hover:text-[var(--color-ink)]',
              )}
              title="Grid View"
            >
              <i aria-hidden="true" className="ri-grid-fill" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Status Bar */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between rounded-lg bg-[var(--color-brand-tint)]/40 px-3.5 py-2 text-[length:var(--text-xs)] border border-[var(--color-brand-600)]/20">
          <div className="flex items-center gap-2 text-[var(--color-ink-2)]">
            <i aria-hidden="true" className="ri-filter-3-line text-[var(--color-brand-700)]" />
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
            className="flex items-center gap-1 font-bold text-[var(--color-brand-700)] hover:underline"
          >
            <i aria-hidden="true" className="ri-refresh-line" />
            <span>{isEs ? 'Limpiar filtros' : 'Reset filters'}</span>
          </button>
        </div>
      )}

      {/* Empty State when zero match */}
      {filteredProcedures.length === 0 ? (
        <article className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] px-6 py-16 text-center space-y-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-[var(--color-wash)] text-[var(--color-ink-3)] text-xl">
            <i aria-hidden="true" className="ri-search-eye-line" />
          </span>
          <div className="space-y-1">
            <h3 className="font-[family-name:var(--font-display)] text-[length:var(--text-base)] font-bold text-[var(--color-ink)]">
              {isEs ? 'No se encontraron procedimientos' : 'No procedures found'}
            </h3>
            <p className="text-[length:var(--text-xs)] text-[var(--color-ink-2)] max-w-sm">
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
        <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-2xs">
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
                className="group flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 hover:bg-[var(--color-wash)]/60 transition-colors"
              >
                {/* Left Section: Category Icon + Title + Purpose + Submeta */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {/* Category Icon Badge */}
                  <div
                    className={cn(
                      'flex size-11 shrink-0 items-center justify-center rounded-xl border text-xl shadow-2xs transition-transform group-hover:scale-105',
                      theme.badgeBg,
                      theme.badgeBorder,
                    )}
                  >
                    <i aria-hidden="true" className={theme.icon} />
                  </div>

                  {/* Title & Metadata */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-[length:var(--text-sm)] font-bold tracking-[-0.01em] text-[var(--color-ink)] group-hover:text-[var(--color-brand-700)] transition-colors">
                        {title}
                      </h4>

                      {/* Format Tag Badge */}
                      {isRecipe ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:text-orange-300">
                          <i aria-hidden="true" className="ri-restaurant-line text-xs" />
                          Recipe
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                          <i aria-hidden="true" className="ri-community-line text-xs" />
                          {catName}
                        </span>
                      )}

                      {/* Status Badge */}
                      {p.status === 'draft' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 border border-amber-300/30">
                          <span className="size-1.5 rounded-full bg-amber-500" />
                          Draft
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 border border-emerald-300/30">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Published
                        </span>
                      )}
                    </div>

                    {/* Purpose Subtitle */}
                    {purpose && (
                      <p className="line-clamp-2 text-[length:var(--text-xs)] text-[var(--color-ink-2)] leading-relaxed">
                        {purpose}
                      </p>
                    )}

                    {/* Metadata Line */}
                    <div className="flex items-center gap-2 pt-1 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                      <i aria-hidden="true" className="ri-file-text-line text-sm" />
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
                <div className="flex items-center gap-6 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--color-line-2)]/60">
                  {/* Category & Format Details (Fixed width so all rows align vertically) */}
                  <div className="hidden lg:flex w-44 shrink-0 flex-col gap-1 text-[length:var(--text-xs)] text-[var(--color-ink-2)] pr-4 border-r border-[var(--color-line-2)]/60">
                    <div className="flex items-center gap-1.5 font-medium">
                      <i aria-hidden="true" className={cn(theme.icon, 'text-xs', theme.badgeText)} />
                      <span>{isRecipe ? 'Recipe' : 'Procedure'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[var(--color-ink-3)] truncate">
                      <i aria-hidden="true" className="ri-folder-3-line text-xs shrink-0" />
                      <span className="truncate">{catName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[var(--color-ink-3)]">
                      <i aria-hidden="true" className="ri-global-line text-xs shrink-0" />
                      <span>{hasBothLangs ? 'EN / ES' : 'EN'}</span>
                    </div>
                  </div>

                  {/* Actions (Fixed width so View buttons line up vertically across all rows) */}
                  <div className="flex items-center justify-end w-20 shrink-0">
                    <Link href={`/procedures/${p.slug}`}>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-1.5 font-bold text-[var(--color-brand-700)] border-[var(--color-brand-600)]/40 hover:bg-[var(--color-brand-tint)] shadow-2xs"
                      >
                        <span>View</span>
                        <i aria-hidden="true" className="ri-arrow-right-line text-xs" />
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
                className="group relative flex flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 shadow-2xs hover:border-[var(--color-brand-600)]/50 hover:shadow-sm transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    {/* Category Icon */}
                    <div
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-xl border text-lg shadow-2xs transition-transform group-hover:scale-105',
                        theme.badgeBg,
                        theme.badgeBorder,
                      )}
                    >
                      <i aria-hidden="true" className={theme.icon} />
                    </div>

                    {/* Status Badge */}
                    {p.status === 'draft' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 border border-amber-300/30">
                        <span className="size-1.5 rounded-full bg-amber-500" />
                        Draft
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 border border-emerald-300/30">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Published
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[var(--color-ink-3)] uppercase tracking-wider block">
                      {catName}
                    </span>
                    <h4 className="font-[family-name:var(--font-ui)] text-[length:var(--text-sm)] font-bold tracking-[-0.01em] text-[var(--color-ink)] line-clamp-2 leading-snug group-hover:text-[var(--color-brand-700)] transition-colors">
                      {title}
                    </h4>
                    {purpose && (
                      <p className="line-clamp-2 text-[length:var(--text-xs)] text-[var(--color-ink-2)] pt-1">
                        {purpose}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--color-line-2)]/60 flex items-center justify-between text-[length:var(--text-xs)]">
                  <span className="text-[var(--color-ink-3)]">
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </span>
                  <Link href={`/procedures/${p.slug}`}>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 px-2.5 text-[11px] font-bold text-[var(--color-brand-700)] border-[var(--color-brand-600)]/40 hover:bg-[var(--color-brand-tint)]"
                    >
                      <span>View</span>
                      <i aria-hidden="true" className="ri-arrow-right-line text-xs" />
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
