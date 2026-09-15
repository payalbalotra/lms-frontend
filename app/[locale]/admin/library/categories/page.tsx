import * as React from 'react';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cn } from '@/lib/utils';

/**
 * Admin Library → Categories management.
 *
 * Stage 2 status: category CRUD lands with the SOP Library. For now we
 * show the six seed categories from the design brief so the manager has
 * something to look at, and an honest "rename / add" hint.
 */

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

const SEED_CATEGORIES: ReadonlyArray<{
  slug: string;
  icon: string;
  labelKey:
    | 'categoryRecipes'
    | 'categoryEquipment'
    | 'categoryStation'
    | 'categoryCleaning'
    | 'categoryAdmin'
    | 'categoryDelivery';
}> = [
  { slug: 'recipes', icon: 'ri-restaurant-line', labelKey: 'categoryRecipes' },
  { slug: 'equipment', icon: 'ri-tools-line', labelKey: 'categoryEquipment' },
  { slug: 'station', icon: 'ri-community-line', labelKey: 'categoryStation' },
  { slug: 'cleaning', icon: 'ri-brush-line', labelKey: 'categoryCleaning' },
  { slug: 'admin', icon: 'ri-file-shield-2-line', labelKey: 'categoryAdmin' },
  { slug: 'delivery', icon: 'ri-truck-line', labelKey: 'categoryDelivery' },
];

export default async function AdminLibraryCategoriesPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.library.categories');
  const tCats = await getTranslations('employee.dashboard');

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-[length:var(--text-sm)] text-[var(--color-ink-2)]"
      >
        <Link
          href={`/${locale}/admin/library`}
          className="inline-flex items-center gap-1 font-medium hover:text-[var(--color-brand-700)]"
        >
          <i aria-hidden="true" className="ri-arrow-left-line" />
          {t('crumbBack')}
        </Link>
      </nav>

      <header className="space-y-1">
        <p className="text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-brand-700)]">
          {t('pageEyebrow')}
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-2xl)] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
          {t('pageTitle')}
        </h1>
        <p className="max-w-2xl text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          {t('pageSubtitle')}
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SEED_CATEGORIES.map((c) => (
          <li key={c.slug}>
            <article
              className={cn(
                'flex items-center gap-3 rounded-[var(--radius-lg)]',
                'border border-[var(--color-line)] bg-[var(--color-surface)] p-4',
                'transition-shadow duration-[180ms] ease-[var(--ease)]',
                'hover:shadow-[var(--e-1)]',
              )}
            >
              <span
                aria-hidden="true"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]"
              >
                <i className={`${c.icon} text-[length:var(--text-lg)]`} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[length:var(--text-sm)] font-semibold text-[var(--color-ink)]">
                  {tCats(c.labelKey)}
                </p>
                <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">{c.slug}</p>
              </div>
              <span
                aria-hidden="true"
                className="ml-auto inline-flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-panel)] px-2 py-1 text-[length:var(--text-xs)] font-semibold text-[var(--color-ink-2)]"
              >
                {t('seed')}
              </span>
            </article>
          </li>
        ))}
      </ul>

      <article
        className={cn(
          'flex items-start gap-4 rounded-[var(--radius-lg)]',
          'border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-5',
        )}
      >
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-panel)] text-[var(--color-ink-2)]"
        >
          <i className="ri-information-line text-[length:var(--text-md)]" />
        </span>
        <div className="space-y-1">
          <h2 className="text-[length:var(--text-sm)] font-semibold text-[var(--color-ink)]">
            {t('renameHeading')}
          </h2>
          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            {t('renameBody')}
          </p>
        </div>
      </article>
    </div>
  );
}
