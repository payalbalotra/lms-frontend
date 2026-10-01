'use client';

import * as React from 'react';
import { queryWords, scoreProcedure } from '@/lib/procedure-search';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { listCategories, listProcedures } from '@/lib/api';
import { getCategoryIcon } from '@/lib/category-icons';
import { Icon } from '@/components/ui/icon';
import type { Category, Procedure } from '@/lib/types';
import { withAs, type ViewAs } from '@/lib/view-as';
import { LuSearch } from 'react-icons/lu';
import { ProcedureRow } from '@/components/employee/procedure-row';
import { allergenWords, factsOf } from '@/app/[locale]/employee/home/components/procedure-facts';

interface ProceduresClientListProps {
  initialCategories: Category[];
  initialProcedures: Procedure[];
  initialQuery: string;
  initialCategory: string;
  locationId: string;
  locale: string;
  readsSpanish: boolean;
  /** Forwarded to each row's href so the chosen chrome rides along navigations. */
  viewAs: ViewAs | null;
  /** The reader's station: its own procedures lead the list. */
  stationId?: string | null;
  /** When true, every row is rendered as locked (dimmed + dashed + tap →
   *  /employee/training). Default false — onboarding has been cleared. */
  locked?: boolean;
  /** Where locked rows route on tap (typically /employee/training). */
  lockedHref?: string;
  /** Localised reason string rendered below each locked row's meta line. */
  lockedReason?: string;
}

export function ProceduresClientList({
  initialCategories,
  initialProcedures,
  initialQuery,
  initialCategory,
  locationId,
  locale,
  readsSpanish,
  viewAs,
  stationId,
  locked,
  lockedHref,
  lockedReason,
}: ProceduresClientListProps): React.ReactElement {
  // Translations must be resolved inside the client: next-intl's translation
  // object contains function values for interpolated keys, and those cannot be
  // serialised across the server→client boundary.
  const tBrowse = useTranslations('employee.browse');
  const tHome = useTranslations('employee.home');

  const labels = {
    all: tBrowse('all'),
    count: (c: number) => tBrowse('count', { count: c }),
    none: tBrowse('none'),
    noneFor: (q: string) => tBrowse('noneFor', { query: q }),
    searchPlaceholder: tBrowse('searchPlaceholder'),
    searchLabel: tBrowse('searchLabel'),
    uncategorised: tBrowse('uncategorised'),
  };

  const flagLabels = {
    allergen: (list: string) => tHome('flagAllergen', { list }),
    critical: tHome('flagCritical'),
    english: tHome('flagEnglishOnly'),
  };

  const [categories, setCategories] = React.useState<Category[]>(initialCategories);
  const [procedures, setProcedures] = React.useState<Procedure[]>(initialProcedures);
  const [query, setQuery] = React.useState<string>(initialQuery);
  const [activeCategory, setActiveCategory] = React.useState<string>(initialCategory);

  React.useEffect(() => {
    let isMounted = true;
    async function syncData() {
      try {
        const catRes = await listCategories(locationId, {});
        const procRes = await listProcedures({});
        if (isMounted) {
          if (catRes.categories && catRes.categories.length > 0) {
            setCategories(catRes.categories);
          }
          if (procRes.procedures && procRes.procedures.length > 0) {
            setProcedures(procRes.procedures);
          }
        }
      } catch {
        // Fallback
      }
    }
    syncData();

    window.addEventListener('storage', syncData);
    window.addEventListener('lms_categories_updated', syncData);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', syncData);
      window.removeEventListener('lms_categories_updated', syncData);
    };
  }, [locationId]);

  const isEs = locale === 'es';
  const titleOf = (p: Procedure): string => (isEs ? p.titleEs || p.titleEn : p.titleEn || p.titleEs);
  const nameOf = (c: Category): string => (isEs ? c.nameEs || c.nameEn : c.nameEn || c.nameEs);

  const coverOf = (p: Procedure): string | undefined => {
    const body = p.bodyEn?.blocks?.length ? p.bodyEn : p.bodyEs;
    if (!body?.blocks) return undefined;
    for (const b of body.blocks) if (b.kind === 'image' && b.src) return b.src;
    return undefined;
  };

  // A question, not a title: matched word by word through everything a
  // procedure says, best answers first (see lib/procedure-search).
  // With no question, the reader's own station leads, then A to Z.
  const words = queryWords(query);
  const mine = (p: Procedure): number =>
    stationId &&
    ((p.stationScope?.mode === 'specific' && p.stationScope.stationIds.includes(stationId)) ||
      (p.audience?.mode === 'some' && p.audience.stationIds.includes(stationId)))
      ? 1
      : 0;
  const published = procedures.filter((p) => p.status === 'published' && !p.isArchived);
  const results = published
    .filter((p) => (activeCategory ? p.category?.slug === activeCategory : true))
    .map((p) => ({ p, score: scoreProcedure(p, words) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => {
      // Prioritize Guacamole Fresco at the top when no specific text search is active
      const isGuacA = a.p.id === 'proc-guacamole-fresco' || a.p.slug === 'guacamole-fresco' ? 1 : 0;
      const isGuacB = b.p.id === 'proc-guacamole-fresco' || b.p.slug === 'guacamole-fresco' ? 1 : 0;
      if (!query.trim() && isGuacA !== isGuacB) {
        return isGuacB - isGuacA;
      }
      return (
        b.score - a.score ||
        mine(b.p) - mine(a.p) ||
        new Date(b.p.updatedAt || b.p.createdAt).getTime() - new Date(a.p.updatedAt || a.p.createdAt).getTime() ||
        titleOf(a.p).localeCompare(titleOf(b.p), locale)
      );
    })
    .map((r) => r.p);
  // Only the categories that hold something this person can read: an empty
  // chip was a tap that led to an empty list.
  const usedCategories = new Set(published.map((p) => p.category?.slug).filter(Boolean));

  /* All chip sizing uses inline styles — Tailwind v4 resets --spacing-* so gap-x, px-x classes produce no CSS */
  const chipBase = 'inline-flex items-center rounded-full font-semibold whitespace-nowrap cursor-pointer transition-colors duration-150 text-xs';
  const chipStyle = { height: '30px', minHeight: '30px', paddingLeft: '10px', paddingRight: '10px', gap: '4px' };
  const chipStyleSm = { ...chipStyle }; // same for now, can scale up with sm: breakpoint if needed

  return (
    <div>
      {/* Search Input — compact on mobile to leave room for filter chips below */}
      <div className="mt-4">
        <label htmlFor="q-client" className="sr-only">
          {labels.searchLabel}
        </label>
        <div
          className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-line-3)] bg-[var(--color-surface)] px-3 transition-colors duration-[var(--dur)] ease-[var(--ease)] focus-within:border-[var(--color-ring)] focus-within:outline focus-within:outline-2 focus-within:outline-[var(--color-ring)] sm:px-4"
          style={{ height: '40px' }}
        >
          <LuSearch aria-hidden="true" className="shrink-0 text-base text-[var(--color-ink-2)] sm:text-lg" />
          <input
            id="q-client"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)] sm:text-md"
            style={{ height: '100%' }}
          />
        </div>
      </div>

      {/* Category filter chips — always wrap, all visible without scrolling */}
      <div style={{ marginTop: '10px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setActiveCategory('')}
            className={`${chipBase} ${activeCategory === '' ? 'bg-[var(--color-ink)] text-[var(--color-surface)]' : 'bg-[var(--color-panel)] text-[var(--color-ink)] hover:bg-[var(--color-panel-2)]'}`}
            style={chipStyle}
          >
            {labels.all}
          </button>
          {categories
            .filter((c) => !c.isArchived && usedCategories.has(c.slug))
            .map((c) => {
              const on = activeCategory === c.slug;
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setActiveCategory(on ? '' : c.slug)}
                  className={`${chipBase} ${on ? 'bg-[var(--color-ink)] text-[var(--color-surface)]' : 'bg-[var(--color-panel)] text-[var(--color-ink)] hover:bg-[var(--color-panel-2)]'}`}
                  style={chipStyle}
                >
                  <Icon icon={getCategoryIcon(c)} />
                  {nameOf(c)}
                </button>
              );
            })}
        </div>
      </div>

      <p className="mt-4 text-sm text-[var(--color-ink-2)]" aria-live="polite">
        {labels.count(results.length)}
      </p>

      {results.length === 0 ? (
        <p className="mt-4 text-md text-[var(--color-ink)]">{query ? labels.noneFor(query.trim()) : labels.none}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {results.map((p) => {
            const cover = coverOf(p);
            const sub = p.subcategoryId
              ? p.category?.subcategories?.find((s) => s.id === p.subcategoryId) ?? null
              : null;
            return (
              <li key={p.id}>
                <ProcedureRow
                  href={withAs(`/${locale}/procedures/${p.slug}`, viewAs)}
                  cover={cover}
                  iconImageUrl={p.iconImageUrl ?? null}
                  category={p.category}
                  subcategory={sub}
                  title={titleOf(p)}
                  meta={p.category ? nameOf(p.category) : labels.uncategorised}
                  flags={{
                    ...factsOf(p, readsSpanish),
                    allergens: allergenWords(factsOf(p, readsSpanish).allergens, isEs ? 'es' : 'en'),
                  }}
                  flagLabels={flagLabels}
                  locked={locked}
                  lockedHref={lockedHref}
                  lockedReason={lockedReason}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
