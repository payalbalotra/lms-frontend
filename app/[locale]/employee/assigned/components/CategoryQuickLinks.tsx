import * as React from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

/**
 * CategoryQuickLinks — DESIGN.md §3.5 chip pattern + §4 chips spacing.
 *
 * Six default categories from PROJECT_OVERVIEW §02 — manager can rename
 * or add later, but until the categories endpoint exists these are the
 * canonical seeds, matching the brief verbatim.
 *
 * Pill is pressable. .chips flex wrap. Each chip is a Link to
 * /[locale]/procedures?category=<slug>. Selection lives on the procedures
 * page (Stage 2 SOP Library), not here.
 */
interface CategoryQuickLinksProps {
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

export async function CategoryQuickLinks({
  locale,
  className,
}: CategoryQuickLinksProps): Promise<React.ReactElement> {
  const t = await getTranslations('employee.dashboard');

  return (
    <section className={cn('space-y-3', className)} aria-labelledby="dashboard-categories">
      <h2
        id="dashboard-categories"
        className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] font-bold tracking-[-0.02em] text-[var(--color-ink)]"
      >
        {t('browseByCategory')}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {DEFAULT_CATEGORIES.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/${locale}/procedures?category=${c.slug}`}
              className={cn(
                'inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-pill)]',
                'border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2',
                'text-[length:var(--text-sm)] font-semibold text-[var(--color-ink-2)]',
                'transition-all duration-[180ms] ease-[var(--ease)]',
                'hover:-translate-y-px hover:border-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]',
                'hover:shadow-[var(--e-1)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint-2)] focus-visible:ring-offset-2',
              )}
            >
              <i aria-hidden="true" className={`${c.icon} text-[length:var(--text-md)]`} />
              <span>{t(c.key)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}