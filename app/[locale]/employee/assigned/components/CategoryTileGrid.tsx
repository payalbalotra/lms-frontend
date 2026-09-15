import * as React from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

/**
 * CategoryTileGrid — DESIGN.md §3.4 content blocks + employee density.
 *
 * Six default categories as icon tiles rather than horizontal pill chips.
 * Tiles fill horizontal space on tablet/desktop (3 cols at md, 2 at sm),
 * so the page doesn't read as a centred phone column on a wide viewport.
 *
 * Each tile is a 48 px-tall touch target on phone, growing taller on
 * larger screens; the icon is the visual anchor, the label sits beneath.
 */
interface CategoryTileGridProps {
  locale: string;
  className?: string;
}

const DEFAULT_CATEGORIES = [
  { slug: 'recipes', icon: 'ri-restaurant-line', key: 'categoryRecipes' as const },
  { slug: 'equipment', icon: 'ri-tools-line', key: 'categoryEquipment' as const },
  { slug: 'station', icon: 'ri-community-line', key: 'categoryStation' as const },
  { slug: 'cleaning', icon: 'ri-brush-line', key: 'categoryCleaning' as const },
  { slug: 'admin', icon: 'ri-file-shield-2-line', key: 'categoryAdmin' as const },
  { slug: 'delivery', icon: 'ri-truck-line', key: 'categoryDelivery' as const },
];

export async function CategoryTileGrid({
  locale,
  className,
}: CategoryTileGridProps): Promise<React.ReactElement> {
  const t = await getTranslations('employee.dashboard');

  return (
    <section className={cn('space-y-3', className)} aria-labelledby="dashboard-categories">
      <header className="flex items-baseline justify-between gap-3">
        <h2
          id="dashboard-categories"
          className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] font-bold tracking-[-0.02em] text-[var(--color-ink)]"
        >
          {t('browseByCategory')}
        </h2>
      </header>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {DEFAULT_CATEGORIES.map((c) => (
          <li key={c.slug}>
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
                <i className={`${c.icon} text-[length:var(--text-lg)]`} />
              </span>
              <span className="text-[length:var(--text-sm)] font-semibold text-[var(--color-ink)]">
                {t(c.key)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}