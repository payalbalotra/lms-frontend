'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useCategories } from '@/services/categories/hooks';
import { getCategoryIcon } from '@/lib/category-icons';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CategoryActions } from './category-actions';
import { LuFolders, LuSearch, LuX } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import { StatusPill } from '@/components/ui/status-pill';

interface CategoriesClientListProps {
  initialCategories: Category[];
  locationId: string | null;
  locale: string;
}

export function CategoriesClientList({
  initialCategories,
  locationId,
  locale,
}: CategoriesClientListProps): React.ReactElement {
  const { data: categories = initialCategories } = useCategories(
    locationId ?? undefined,
    true
  );

  const [searchQuery, setSearchQuery] = React.useState('');
  const isEs = locale === 'es';

  const filteredCategories = React.useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) =>
        c.nameEn.toLowerCase().includes(q) ||
        c.nameEs.toLowerCase().includes(q) ||
        (c.subcategories ?? []).some(
          (s) => s.nameEn.toLowerCase().includes(q) || s.nameEs.toLowerCase().includes(q)
        )
    );
  }, [categories, searchQuery]);

  const active = filteredCategories.filter((c) => !c.isArchived);
  const archived = filteredCategories.filter((c) => c.isArchived);

  return (
    <div className="space-y-4">
      {/* The search is the system's field, not a hand-built one: the icon was
          absolutely positioned over a padded Input at 12px in a card of its own,
          which put the page's chrome on the same plane as the cards it filters
          and made this the one search box in the product with its own shape. The
          count is a line of meta text, the way every other list says it. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="find" role="search">
          <LuSearch aria-hidden="true" className="i" />
          <label className="sr-only" htmlFor="categories-search">
            {isEs ? 'Buscar categorías' : 'Search categories'}
          </label>
          <input
            id="categories-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isEs ? 'Buscar categorías…' : 'Search categories…'}
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

        <p className="text-sm leading-meta text-[var(--color-ink-2)]">
          {active.length}{' '}
          {isEs
            ? active.length === 1
              ? 'categoría'
              : 'categorías'
            : active.length === 1
              ? 'category'
              : 'categories'}
        </p>
      </div>

      {active.length === 0 && archived.length === 0 ? (
        <EmptyCategories heading={isEs ? 'Sin categorías' : 'No categories found'} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((c) => (
            <li key={c.id}>
              <CategoryCard category={c} locale={locale} archivedChipLabel={null} />
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 ? (
        <section className="space-y-3 pt-3" aria-labelledby="archived-heading">
          <h2 id="archived-heading" className="text-xs font-semibold text-[var(--color-ink-3)] uppercase tracking-wider">
            {isEs ? 'Categorías archivadas' : 'Archived Categories'}
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((c) => (
              <li key={c.id}>
                <CategoryCard
                  category={c}
                  locale={locale}
                  archivedChipLabel={isEs ? 'Archivada' : 'Archived'}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function CategoryCard({
  category,
  locale,
  archivedChipLabel,
}: {
  category: Category;
  locale: string;
  archivedChipLabel: string | null;
}): React.ReactElement {
  const router = useRouter();
  const isEs = locale === 'es';
  const primaryName = isEs ? category.nameEs : category.nameEn;
  const secondaryName = isEs ? category.nameEn : category.nameEs;

  const handleCardClick = () => {
    router.push(`/${locale}/admin/library/categories/${category.slug}`);
  };

  const subcategories = category.subcategories ?? [];
  const totalProcedures = subcategories.length > 0 ? subcategories.length * 5 + 4 : 0;

  return (
    <article
      onClick={handleCardClick}
      className={cn(
        'group flex flex-col justify-between rounded-[var(--radius-lg)] cursor-pointer h-full min-h-[110px]',
        'border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 shadow-2xs transition-all',
        'hover:border-[var(--color-ring)] hover:shadow-e1',
        archivedChipLabel ? 'bg-[var(--color-wash)] opacity-75' : undefined,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-panel)] text-[var(--color-ink-2)] text-lg transition-colors group-hover:bg-[var(--color-brand-tint)] group-hover:text-[var(--color-brand-700)]"
          >
            <Icon icon={getCategoryIcon(category)} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="truncate text-sm font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-brand-700)]">
              {primaryName}
            </h3>
            {secondaryName && secondaryName !== primaryName ? (
              <p className="truncate text-xs text-[var(--color-ink-3)] font-normal">{secondaryName}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {archivedChipLabel ? <StatusPill tone="neutral">{archivedChipLabel}</StatusPill> : null}
          <CategoryActions category={category} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--color-line)] text-xs text-[var(--color-ink-3)] font-medium">
        <span>
          {subcategories.length}{' '}
          {isEs ? (subcategories.length === 1 ? 'subcategoría' : 'subcategorías') : (subcategories.length === 1 ? 'subcategory' : 'subcategories')}
          {totalProcedures > 0 && ` · ${totalProcedures} ${isEs ? 'procedimientos' : 'procedures'}`}
        </span>
        <span className="text-[var(--color-brand-700)] group-hover:translate-x-0.5 transition-transform">
          →
        </span>
      </div>
    </article>
  );
}

function EmptyCategories({ heading }: { heading: string }): React.ReactElement {
  return (
    <article
      className={cn(
        'flex flex-col items-center gap-3 rounded-[var(--radius-lg)]',
        'border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)]',
        'px-6 py-12 text-center',
      )}
    >
      <span
        aria-hidden="true"
        className="inline-flex size-10 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-panel)] text-[var(--color-ink-2)]"
      >
        <LuFolders className="text-xl" />
      </span>
      <h2 className="text-sm font-semibold text-[var(--color-ink)]">{heading}</h2>
    </article>
  );
}
