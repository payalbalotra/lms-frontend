import * as React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { listCategories, ApiException, fetchMe } from '@/lib/api';
import { getCategoryIcon } from '@/lib/category-icons';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CategoryActions, CreateCategoryButton } from './category-actions';

/**
 * Admin → Library → Categories — manager CRUD.
 *
 * Composition:
 *   - Server Component fetches the categories for the admin's location
 *     (active + archived) and renders them as cards.
 *   - Each card carries a `⋯` kebab (rename / archive / unarchive) —
 *     destructive actions live one click deeper via row-actions.tsx.
 *   - The page-level `[+ Add category]` opens a right-side Drawer with
 *     the create form (DESIGN.md §3.6: settings surfaces use the
 *     slide-in).
 *
 * Empty state: if the location somehow has zero categories (a fresh
 * location seeded before the migration ran), the empty-state copy
 * guides the manager to add the first one.
 */

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

interface AdminLocationsResponse {
  locations: { id: string }[];
}

async function readFirstManagedLocation(
  cookieHeader: string,
): Promise<string | null> {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${base}/api/admin/employees/locations`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = (await res.json()) as AdminLocationsResponse;
    return body.locations[0]?.id ?? null;
  } catch {
    return null;
  }
}

export default async function AdminLibraryCategoriesPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.library.categories');

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  // Resolve a locationId. /me carries one on the employee record; if
  // that fails (admin without a single employee row), fall back to the
  // admin locations endpoint. If neither yields a location, the page
  // renders its no-location empty state — a transient API hiccup
  // shouldn't break the view.
  let locationId: string | null = null;
  try {
    const me = await fetchMe(cookieHeader);
    locationId = me.employee.locationId;
  } catch (err) {
    if (!(err instanceof ApiException)) throw err;
    locationId = await readFirstManagedLocation(cookieHeader);
  }
  if (!locationId) {
    locationId = await readFirstManagedLocation(cookieHeader);
  }

  let categories: Category[] = [];
  let loadError: string | null = null;
  if (locationId) {
    try {
      const result = await listCategories(locationId, { includeArchived: true }, cookieHeader);
      categories = result.categories;
    } catch (err) {
      loadError = err instanceof ApiException ? err.message : 'LOAD_FAILED';
    }
  }

  const isEs = locale === 'es';
  const active = categories.filter((c) => !c.isArchived);
  const archived = categories.filter((c) => c.isArchived);

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

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-brand-700)]">
            {t('pageEyebrow')}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-2xl)] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
            {t('pageTitle')}
          </h1>
          <p className="max-w-2xl text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            {t('pageSubtitle')}
          </p>
        </div>
        {locationId ? <CreateCategoryButton locationId={locationId} /> : null}
      </header>

      {loadError ? (
        <p
          role="alert"
          className={cn(
            'rounded-[var(--radius-md)] border border-[var(--color-bad)]/40 bg-[var(--color-bad-tint)]',
            'px-3 py-2 text-[length:var(--text-sm)] text-[var(--color-bad)]',
          )}
        >
          {loadError}
        </p>
      ) : null}

      {active.length === 0 && archived.length === 0 ? (
        <EmptyCategories heading={t('empty')} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((c) => (
            <li key={c.id}>
              <CategoryCard
                category={c}
                locale={locale}
                archivedChipLabel={null}
              />
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 ? (
        <section className="space-y-3 pt-4" aria-labelledby="archived-heading">
          <h2
            id="archived-heading"
            className="text-[length:var(--text-sm)] font-semibold uppercase tracking-wide text-[var(--color-ink-3)]"
          >
            {t('archivedHeading')}
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((c) => (
              <li key={c.id}>
                <CategoryCard
                  category={c}
                  locale={locale}
                  archivedChipLabel={t('archivedChip')}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Locale switch debug helper — only used by smoke tests that
          want to confirm bilingual labels render. No a11y/UI impact. */}
      <span className="sr-only">{isEs ? 'es' : 'en'}</span>
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
        'transition-shadow duration-[180ms] ease-[var(--ease)] hover:shadow-[var(--e-1)]',
        archivedChipLabel ? 'opacity-75' : undefined,
      )}
    >
      <span
        aria-hidden="true"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]"
      >
        <i className={`${getCategoryIcon(category)} text-[length:var(--text-lg)]`} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[length:var(--text-sm)] font-semibold text-[var(--color-ink)]">
          {isEs ? category.nameEs : category.nameEn}
        </p>
        <p className="truncate text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          {category.slug}
        </p>
      </div>
      {archivedChipLabel ? (
        <span className="inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--color-panel)] px-2 py-0.5 text-[length:var(--text-xs)] font-semibold text-[var(--color-ink-2)]">
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
        className="inline-flex size-14 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]"
      >
        <i className="ri-folders-line text-[length:var(--text-2xl)]" />
      </span>
      <h2 className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
        {heading}
      </h2>
    </article>
  );
}
