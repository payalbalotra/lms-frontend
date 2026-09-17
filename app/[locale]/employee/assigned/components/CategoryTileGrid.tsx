import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/category-icons';
import type { Category } from '@/lib/types';

/**
 * CategoryTileGrid — DESIGN.md §3.4 content blocks + employee density.
 *
 * Six default categories as icon tiles rather than horizontal pill chips.
 * Tiles fill horizontal space on tablet/desktop (3 cols at md, 2 at sm),
 * so the page doesn't read as a centred phone column on a wide viewport.
 *
 * Each tile is a 48 px-tall touch target on phone, growing taller on
 * larger screens; the icon is the visual anchor, the label sits beneath.
 *
 * Categories are fetched server-side from the API (manager-defined). The
 * component no longer carries a hard-coded list — manager-added categories
 * show up here automatically; archived ones are filtered out by the API.
 */
interface CategoryTileGridProps {
  locale: string;
  categories: Category[];
  className?: string;
}

export async function CategoryTileGrid({
  locale,
  categories,
  className,
}: CategoryTileGridProps): Promise<React.ReactElement> {
  const tiles = categories.filter((c) => !c.isArchived);

  return (
    <section className={cn('space-y-3', className)} aria-labelledby="dashboard-categories">
      <header className="flex items-baseline justify-between gap-3">
        <h2
          id="dashboard-categories"
          className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] font-bold tracking-[-0.02em] text-[var(--color-ink)]"
        >
          Browse by category
        </h2>
      </header>
      {tiles.length === 0 ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
          No categories yet.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {tiles.map((c) => (
            <li key={c.id}>
              <Link
                href={`/${locale}/procedures?category=${c.slug}`}
                className={cn(
                  'group flex h-full min-h-[6.5rem] flex-col items-start gap-2 rounded-[var(--radius-lg)]',
                  'border border-[var(--color-line)] bg-[var(--color-surface)] p-4',
                  'transition-all duration-[180ms] ease-[var(--ease)]',
                  'hover:-translate-y-px hover:border-[var(--color-brand-600)] hover:shadow-[var(--e-1)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint-2)] focus-visible:ring-offset-2',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex size-10 items-center justify-center rounded-[var(--radius-md)]',
                    'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]',
                    'transition-colors duration-[180ms] ease-[var(--ease)]',
                    'group-hover:bg-[var(--color-brand-600)] group-hover:text-white',
                  )}
                >
                  <i className={`${getCategoryIcon(c)} text-[length:var(--text-lg)]`} />
                </span>
                <span className="text-[length:var(--text-sm)] font-semibold text-[var(--color-ink)]">
                  {c.nameEn}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
