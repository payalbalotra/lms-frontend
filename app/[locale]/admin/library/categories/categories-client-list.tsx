'use client';

import * as React from 'react';
import { listCategories } from '@/lib/api';
import { getCategoryIcon } from '@/lib/category-icons';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CategoryActions, CreateCategoryButton } from './category-actions';
import { LuFolders } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';

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
  const [categories, setCategories] = React.useState<Category[]>(initialCategories);

  // Sync client-side localStorage categories on mount
  React.useEffect(() => {
    let isMounted = true;
    async function loadClientCategories() {
      if (!locationId) return;
      try {
        const result = await listCategories(locationId, { includeArchived: true });
        if (isMounted && result.categories) {
          setCategories(result.categories);
        }
      } catch {
        // Fallback to initial
      }
    }
    loadClientCategories();

    // Listen for storage changes or custom update events
    const handleStorageUpdate = () => {
      loadClientCategories();
    };
    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('lms_categories_updated', handleStorageUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('lms_categories_updated', handleStorageUpdate);
    };
  }, [locationId]);

  const active = categories.filter((c) => !c.isArchived);
  const archived = categories.filter((c) => c.isArchived);
  const isEs = locale === 'es';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        {locationId ? <CreateCategoryButton locationId={locationId} /> : null}
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
        'border border-[var(--color-line)] bg-[var(--color-surface)] p-4',
        archivedChipLabel ? 'opacity-75' : undefined,
      )}
    >
      <span
        aria-hidden="true"
        className="inline-flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-panel)] text-[var(--color-ink-2)]"
      >
        <Icon icon={getCategoryIcon(category)} className="text-lg" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
          {isEs ? category.nameEs : category.nameEn}
        </p>
        <p className="truncate text-xs text-[var(--color-ink-3)]">{category.slug}</p>
      </div>
      {archivedChipLabel ? (
        <span className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--color-panel)] px-2 py-0.5 text-xs font-semibold text-[var(--color-ink-2)]">
          {archivedChipLabel}
        </span>
      ) : null}
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
      <h2 className="font-[family-name:var(--font-ui)] text-lg font-semibold tracking-tight text-[var(--color-ink)]">
        {heading}
      </h2>
    </article>
  );
}
