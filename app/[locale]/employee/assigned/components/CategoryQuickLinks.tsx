import * as React from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/category-icons';
import type { Category } from '@/lib/types';

/**
 * CategoryQuickLinks — DESIGN.md §3.5 chip pattern + §4 chips spacing.
 *
 * Compact horizontal chip strip used inside the assigned-procedures card.
 * Mirrors the categories a manager has defined at this location; archived
 * entries are filtered by the API but we defend locally too in case the
 * caller forgets `includeArchived: false`.
 *
 * Pill is pressable. .chips flex wrap. Each chip is a Link to
 * /[locale]/procedures?category=<slug>. Selection lives on the procedures
 * page (Stage 2 SOP Library), not here.
 */
interface CategoryQuickLinksProps {
  locale: string;
  categories: Category[];
  className?: string;
}

export async function CategoryQuickLinks({
  locale,
  categories,
  className,
}: CategoryQuickLinksProps): Promise<React.ReactElement> {
  const t = await getTranslations('employee.dashboard');
  const isEs = locale === 'es';
  const chips = categories.filter((c) => !c.isArchived);

  return (
    <section className={cn('space-y-3', className)} aria-labelledby="dashboard-categories">
      <h2
        id="dashboard-categories"
        className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] font-bold tracking-[-0.02em] text-[var(--color-ink)]"
      >
        {t('browseByCategory')}
      </h2>
      {chips.length === 0 ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
          {t('noCategories')}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {chips.map((c) => {
            const label = isEs ? c.nameEs : c.nameEn;
            return (
              <li key={c.id}>
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
                  <i aria-hidden="true" className={`${getCategoryIcon(c)} text-[length:var(--text-md)]`} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
