'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useCategories } from '@/services/categories/hooks';
import { getCategoryIcon } from '@/lib/category-icons';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CategoryActions } from './category-actions';
import { LuArrowRight, LuFolders, LuSearch, LuX } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import { StatusPill } from '@/components/ui/status-pill';
import { IconTile } from '@/components/ui/icon-tile';
import { EmptyState } from '@/components/ui/empty-state';

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
          <h2 id="archived-heading" className="text-sm font-semibold text-[var(--color-ink-2)]">
            {isEs ? 'Categorías archivadas' : 'Archived categories'}
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
        // A card is content on the ground, so hover lifts it away from the ground:
        // the edge darkens and it rises a step. Filling it with wash sank it into
        // the page (1.08:1), and a brand border made it look like the selected
        // nav item beside it.
        'hover:border-[var(--color-line-hover)] hover:shadow-e1',
        archivedChipLabel ? 'bg-[var(--color-wash)] opacity-75' : undefined,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <IconTile size="md" icon={getCategoryIcon(category)} className="group-hover:text-[var(--color-ink)]" />
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="truncate text-sm font-semibold text-[var(--color-ink)]">
              {primaryName}
            </h3>
            {secondaryName && secondaryName !== primaryName ? (
              <p className="truncate text-sm text-[var(--color-ink-3)]">{secondaryName}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {archivedChipLabel ? <StatusPill tone="neutral">{archivedChipLabel}</StatusPill> : null}
          <CategoryActions category={category} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--color-line)] text-sm leading-meta text-[var(--color-ink-3)]">
        <span>
          {subcategories.length}{' '}
          {isEs ? (subcategories.length === 1 ? 'subcategoría' : 'subcategorías') : (subcategories.length === 1 ? 'subcategory' : 'subcategories')}
          {totalProcedures > 0 && ` · ${totalProcedures} ${isEs ? 'procedimientos' : 'procedures'}`}
        </span>
        <LuArrowRight aria-hidden="true" className="text-[var(--color-ink-3)] transition-transform group-hover:translate-x-0.5" />
      </div>
    </article>
  );
}

function EmptyCategories({ heading }: { heading: string }): React.ReactElement {
  return <EmptyState icon={LuFolders} title={heading} />;
}
