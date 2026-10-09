'use client';

import * as React from 'react';
import { queryWords, scoreProcedure } from '@/lib/procedure-search';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCategories, useBackendCategories } from '@/services/categories/hooks';
import { useBrowseProcedures } from '@/services/library/hooks';
import { getCategoryIcon } from '@/lib/category-icons';
import { Icon } from '@/components/ui/icon';
import type { Category, Procedure } from '@/lib/types';
import { withAs, type ViewAs } from '@/lib/view-as';
import { LuSearch } from 'react-icons/lu';
import { ProcedureRow } from '@/components/employee/procedure-row';
import { allergenWords, factsOf } from '@/app/[locale]/employee/home/components/procedure-facts';

interface ProceduresClientListProps {
  initialQuery: string;
  initialCategory: string;
  locationId: string;
  locale: string;
  readsSpanish: boolean;
  /** Forwarded to each row's href so the chosen chrome rides along navigations. */
  viewAs: ViewAs | null;
  /** The reader's station: its own procedures lead the list. */
  stationId?: string | null;
  /** All of the reader's stations (preferred over stationId when present). */
  stationIds?: string[];
  /** The reader's id: drives the "Assigned to me" filter (assignUsers). */
  employeeId?: string;
  /** When true, every row is rendered as locked (dimmed + dashed + tap →
   *  /employee/training). Default false — onboarding has been cleared. */
  locked?: boolean;
  /** Where locked rows route on tap (typically /employee/training). */
  lockedHref?: string;
  /** Localised reason string rendered below each locked row's meta line. */
  lockedReason?: string;
}

export function ProceduresClientList({
  initialQuery,
  initialCategory,
  locationId,
  locale,
  readsSpanish,
  viewAs,
  stationId,
  stationIds,
  employeeId,
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
    myStation: tBrowse('myStation'),
    assignedToMe: tBrowse('assignedToMe'),
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

  const [query, setQuery] = React.useState<string>(initialQuery);
  const [activeCategory, setActiveCategory] = React.useState<string>(initialCategory);
  const [scope, setScope] = React.useState<'' | 'station' | 'assigned'>('');

  // Both lists resolve through TanStack Query (5-minute cache, so
  // tab-back navigation is instant). Categories merge the mock store with
  // the backend list so backend-created categories appear as chips;
  // `useBrowseProcedures` routes through lib/api's listProcedures.
  const queryClient = useQueryClient();
  const { data: mockCategories = [] } = useCategories(locationId);
  const { data: backendCategories = [] } = useBackendCategories();
  const categories = React.useMemo(
    () => [...backendCategories, ...mockCategories],
    [backendCategories, mockCategories],
  );
  const { data: procedures = [], isLoading: proceduresLoading } = useBrowseProcedures();

  // Keep the list fresh when another tab (or the admin library)
  // mutates the on-device stores.
  React.useEffect(() => {
    const syncData = () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      void queryClient.invalidateQueries({ queryKey: ['procedures', 'browse'] });
    };
    window.addEventListener('storage', syncData);
    window.addEventListener('lms_categories_updated', syncData);
    return () => {
      window.removeEventListener('storage', syncData);
      window.removeEventListener('lms_categories_updated', syncData);
    };
  }, [queryClient]);

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
  const myStationIds = stationIds && stationIds.length > 0 ? stationIds : stationId ? [stationId] : [];
  const mine = (p: Procedure): number =>
    myStationIds.length > 0 &&
    ((p.stationScope?.mode === 'specific' && p.stationScope.stationIds.some((id) => myStationIds.includes(id))) ||
      (p.audience?.mode === 'some' && p.audience.stationIds.some((id) => myStationIds.includes(id))))
      ? 1
      : 0;
  const assignedToMe = (p: Procedure): boolean =>
    Boolean(employeeId && p.assignUsers?.includes(employeeId));
  const published = procedures.filter((p) => p.status === 'published' && !p.isArchived);
  const results = published
    .filter((p) => (activeCategory ? p.category?.slug === activeCategory : true))
    .filter((p) => (scope === 'station' ? mine(p) === 1 : scope === 'assigned' ? assignedToMe(p) : true))
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

      {proceduresLoading && procedures.length === 0 ? (
        <ProceduresListSkeleton />
      ) : (
        <>
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
              {myStationIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setScope(scope === 'station' ? '' : 'station')}
                  className={`${chipBase} ${scope === 'station' ? 'bg-[var(--color-ink)] text-[var(--color-surface)]' : 'bg-[var(--color-panel)] text-[var(--color-ink)] hover:bg-[var(--color-panel-2)]'}`}
                  style={chipStyle}
                >
                  {labels.myStation}
                </button>
              ) : null}
              {employeeId ? (
                <button
                  type="button"
                  onClick={() => setScope(scope === 'assigned' ? '' : 'assigned')}
                  className={`${chipBase} ${scope === 'assigned' ? 'bg-[var(--color-ink)] text-[var(--color-surface)]' : 'bg-[var(--color-panel)] text-[var(--color-ink)] hover:bg-[var(--color-panel-2)]'}`}
                  style={chipStyle}
                >
                  {labels.assignedToMe}
                </button>
              ) : null}
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
        </>
      )}
    </div>
  );
}

/** First-paint placeholder while the procedures query resolves —
 *  chip row + five blank rows, pulsing. */
function ProceduresListSkeleton(): React.ReactElement {
  return (
    <div aria-hidden="true" className="mt-3 space-y-4">
      <div className="flex flex-wrap gap-2">
        {[80, 110, 95, 120].map((w, i) => (
          <span
            key={i}
            className="animate-pulse h-8 rounded-full border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xs"
            style={{ width: `${w}px` }}
          />
        ))}
      </div>
      <ul className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <li
            key={i}
            className="animate-pulse flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3 sm:p-3.5 shadow-xs"
          >
            <div className="size-12 shrink-0 rounded-lg bg-[var(--color-panel-2)]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-48 sm:w-64 rounded bg-[var(--color-panel-2)]" />
              <div className="h-3 w-32 sm:w-40 rounded bg-[var(--color-line-2)]" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
