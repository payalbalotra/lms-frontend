'use client';

import * as React from 'react';
import { useCategories } from '@/services/categories/hooks';
import { getCategoryIcon } from '@/lib/category-icons';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CategoryActions } from './category-actions';
import { LuFolders } from 'react-icons/lu';
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

  const active = categories.filter((c) => !c.isArchived);
  const archived = categories.filter((c) => c.isArchived);
  const isEs = locale === 'es';

  return (
    <div className="space-y-6">
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
        <section className="space-y-3 pt-4" aria-labelledby="archived-heading">
          <h2 id="archived-heading" className="text-sm font-semibold text-[var(--color-ink-3)]">
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
  const isEs = locale === 'es';
  return (
    <article
      className={cn(
        'flex items-center gap-3 rounded-[var(--radius-lg)]',
        'border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4',
        archivedChipLabel ? 'bg-[var(--color-wash)]' : undefined,
      )}
    >
      <span
        aria-hidden="true"
        className="inline-flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-panel)] text-[var(--color-ink-2)]"
      >
        <Icon icon={getCategoryIcon(category)} className="text-lg" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-[var(--color-ink)]">
          {isEs ? category.nameEs : category.nameEn}
        </p>
        <p className="truncate text-sm text-[var(--color-ink-3)]">{category.slug}</p>
      </div>
      {archivedChipLabel ? <StatusPill tone="neutral">{archivedChipLabel}</StatusPill> : null}
      <CategoryActions category={category} />
    </article>
  );
}

function EmptyCategories({ heading }: { heading: string }): React.ReactElement {
  return (
    <article
      className={cn(
        'flex flex-col items-center gap-4 rounded-[var(--radius-lg)]',
        'border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)]',
        'px-6 py-16 text-center',
      )}
    >
      <span
        aria-hidden="true"
        className="inline-flex size-12 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-panel)] text-[var(--color-ink-2)]"
      >
        <LuFolders className="text-2xl" />
      </span>
      <h2 className="text-md font-semibold leading-heading text-[var(--color-ink)]">{heading}</h2>
    </article>
  );
}
