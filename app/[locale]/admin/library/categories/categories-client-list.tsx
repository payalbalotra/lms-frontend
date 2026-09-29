'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCategories } from '@/services/categories/hooks';
import { getCategoryIcon } from '@/lib/category-icons';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CategoryActions } from './category-actions';
import { LuArrowRight, LuCheck, LuFolders } from 'react-icons/lu';
import { PiSquaresFour } from 'react-icons/pi';
import { StatusPill } from '@/components/ui/status-pill';
import { IconTile } from '@/components/ui/icon-tile';
import { EmptyState } from '@/components/ui/empty-state';

/** Stations the manager can scope station-tied categories to. Mirrors
 *  `SEED_STATIONS` in `lib/api.ts`; kept inline so the left panel renders
 *  without a round-trip and the subcategory URL contract lands on a real id. */
const STATIONS: ReadonlyArray<{ id: string; name: string; description: string }> = [
  { id: 'stn-gm', name: 'GM', description: 'Cold section + fryer' },
  { id: 'stn-grill', name: 'Grill', description: 'Hot Line / Grill' },
  { id: 'stn-expo', name: 'Expo', description: 'Expo Station' },
  { id: 'stn-prep', name: 'Prep Kitchen', description: 'Prep & Cold Station' },
  { id: 'stn-dish', name: 'Dishwasher', description: 'Sanitation & Dish' },
];

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
  const router = useRouter();
  const searchParams = useSearchParams();
  // Multi-select: the URL carries one `?station=` param per picked
  // station (`?station=stn-gm&station=stn-grill`). `getAll` returns
  // every value the URL defines for that key. We intersect with the
  // known STATIONS list so a stale/unknown id never leaks through to
  // the downstream filter logic.
  const chosenStationIds = React.useMemo(() => {
    const ids = searchParams.getAll('station');
    const known = new Set(STATIONS.map((s) => s.id));
    return ids.filter((id) => known.has(id));
  }, [searchParams]);
  const isEs = locale === 'es';

  const validCategories = categories.filter(
    (c) => Boolean(c && (c.nameEn?.trim() || c.nameEs?.trim())),
  );
  const active = validCategories.filter((c) => !c.isArchived);
  const archived = validCategories.filter((c) => c.isArchived);

  // The categories page renders two views off the same route:
  //   - no `?station=` → general category cards + 1 'Stations' card
  //   - at least one `?station=` → two-panel (stations left + station-
  //     tied categories with subcategories inline right).
  // The 4 station-tied categories only appear in the two-panel view; they
  // are not browseable from the main card grid because picking at least
  // one station is required before their subcategories make sense.
  const generalCategories = active.filter((c) => c.kind === 'general');
  const stationTiedCategories = active.filter((c) => c.kind === 'station-tied');

  const activeStations = chosenStationIds
    .map((id) => STATIONS.find((s) => s.id === id))
    .filter((s): s is { id: string; name: string; description: string } => s !== undefined);
  const showingTwoPanel = activeStations.length > 0;

  /** Build a `?station=…&station=…` query string from an id list, or empty
   *  string when none — preserves order, dedupes, drops unknowns. */
  function stationsQuery(ids: ReadonlyArray<string>): string {
    const seen = new Set<string>();
    const known = new Set(STATIONS.map((s) => s.id));
    const clean = ids.filter((id) => {
      if (seen.has(id) || !known.has(id)) return false;
      seen.add(id);
      return true;
    });
    if (clean.length === 0) return '';
    return `?${clean.map((id) => `station=${encodeURIComponent(id)}`).join('&')}`;
  }

  // Click the Stations card on the main view → land in the two-panel
  // view with the first station pre-picked so the right side is
  // immediately useful instead of showing an empty state.
  function openStationsView(): void {
    const params = new URLSearchParams(window.location.search);
    params.append('station', STATIONS[0].id);
    router.push(`?${params.toString()}`);
  }

  /** Toggle a station in/out of the picked set. Empty set returns the
   *  manager to the single-panel main view implicitly via the disabled
   *  state, so we never produce a `?station=` URL with zero values. */
  function toggleStation(stationId: string): void {
    const next = chosenStationIds.includes(stationId)
      ? chosenStationIds.filter((id) => id !== stationId)
      : [...chosenStationIds, stationId];
    const otherParams = new URLSearchParams(window.location.search);
    otherParams.delete('station');
    const rest = otherParams.toString();
    const stationQs = stationsQuery(next);
    const qs = [rest, stationQs.replace(/^\?/, '')].filter(Boolean).join('&');
    router.push(qs ? `?${qs}` : window.location.pathname);
  }

  function backToMain(): void {
    const params = new URLSearchParams(window.location.search);
    params.delete('station');
    const qs = params.toString();
    router.push(qs ? `?${qs}` : window.location.pathname);
  }

  return (
    <div className="space-y-6">
      {showingTwoPanel ? (
        <TwoPanelView
          isEs={isEs}
          locale={locale}
          stationTiedCategories={stationTiedCategories}
          activeStations={activeStations}
          onToggleStation={toggleStation}
          onBack={backToMain}
        />
      ) : (
        <>
          {generalCategories.length > 0 ? (
            <section aria-labelledby="general-heading" className="space-y-3">
              <h2 id="general-heading" className="text-sm font-semibold text-[var(--color-ink-2)]">
                {isEs ? 'General' : 'General'}
              </h2>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {generalCategories.map((c) => (
                  <li key={c.id}>
                    <CategoryCard category={c} locale={locale} archivedChipLabel={null} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="stations-heading" className="space-y-3">
            <h2 id="stations-heading" className="text-sm font-semibold text-[var(--color-ink-2)]">
              {isEs ? 'Por estación' : 'By station'}
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <li>
                <StationsCard locale={locale} onClick={openStationsView} />
              </li>
            </ul>
          </section>
        </>
      )}

      {archived.length > 0 ? (
        <section className="space-y-3 pt-3" aria-labelledby="archived-heading">
          <header className="space-y-1">
            <h2 id="archived-heading" className="text-sm font-semibold text-[var(--color-ink-2)]">
              {isEs ? 'Archivadas' : 'Archived'}
            </h2>
            <p className="text-xs text-[var(--color-ink-3)]">
              {isEs
                ? 'Ocultas de la biblioteca pero siguen asociadas a los procedimientos que las usan.'
                : 'Hidden from the library but still attached to any procedures that reference them.'}
            </p>
          </header>
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

/** The "Stations" card on the main view. Clicking it opens the two-panel
 *  view (URL gains `?station=stn-gm`). Same chrome as a CategoryCard so
 *  the 4 cards on the main view read as one grid. */
function StationsCard({
  locale,
  onClick,
}: {
  locale: string;
  onClick: () => void;
}): React.ReactElement {
  const isEs = locale === 'es';
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={isEs ? 'Estaciones' : 'Stations'}
      className={cn(
        'group flex flex-col justify-between rounded-[var(--radius-lg)] cursor-pointer h-full min-h-[110px]',
        'border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 shadow-2xs transition-all',
        'hover:border-[var(--color-line-hover)] hover:shadow-e1',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]',
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        <IconTile size="md" icon={PiSquaresFour} className="group-hover:text-[var(--color-ink)]" />
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="truncate text-sm font-semibold text-[var(--color-ink)]">
            {isEs ? 'Estaciones' : 'Stations'}
          </h3>
          <p className="mt-0.5 truncate text-sm text-[var(--color-ink-3)]">
            {isEs
              ? 'Elige una estación para ver sus procedimientos'
              : 'Pick a station to see its procedures'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end pt-3 mt-3 border-t border-[var(--color-line)]">
        <LuArrowRight
          aria-hidden="true"
          className="text-[var(--color-ink-3)] transition-transform group-hover:translate-x-0.5"
        />
      </div>
    </article>
  );
}

/** Two-panel view — appears after the Stations card is clicked. Stations
 *  list on the left; the right side shows only the STATION-TIED categories
 *  (the general ones already live on the front page, so they are not
 *  duplicated here). The right pane uses the same accordion pattern as
 *  `category-detail-client.tsx`: each row shows icon + name + subcategory
 *  count + chevron, and expands to list subcategories as clickable pills.
 *  The section is disabled (greyed out, non-interactive) until at least
 *  one station is picked — the manager cannot browse subcategories for
 *  stations they have not chosen yet. */
function TwoPanelView({
  isEs,
  locale,
  stationTiedCategories,
  activeStations,
  onToggleStation,
  onBack,
}: {
  isEs: boolean;
  locale: string;
  stationTiedCategories: Category[];
  activeStations: ReadonlyArray<{ id: string; name: string; description: string }>;
  onToggleStation: (id: string) => void;
  onBack: () => void;
}): React.ReactElement {
  const sectionEmpty = isEs ? 'Sin categorías' : 'No categories found';
  const stationNames = activeStations.map((s) => s.name).join(', ');
  const activeStationIds = activeStations.map((s) => s.id);
  return (
    <section className="space-y-3" aria-labelledby="stations-view-heading">
      <nav
        aria-label={isEs ? 'Ruta' : 'Breadcrumb'}
        className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-3)]"
      >
        <button
          type="button"
          onClick={onBack}
          className="rounded-[var(--radius-sm)] px-1 py-0.5 transition-colors hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        >
          {isEs ? 'Categorías' : 'Categories'}
        </button>
        <LuArrowRight aria-hidden="true" className="text-[10px]" />
        <span className="text-[var(--color-ink)]">
          {isEs ? 'Por estación' : 'By station'}
        </span>
      </nav>

      <div className="flex flex-col gap-4">
        <StationsPanel
          isEs={isEs}
          activeStationIds={activeStationIds}
          onToggleStation={onToggleStation}
        />

        <CategorySection
          title={
            activeStations.length > 0
              ? isEs
                ? `Por estación (${stationNames})`
                : `By station (${stationNames})`
              : isEs
                ? 'Por estación'
                : 'By station'
          }
          caption={
            activeStations.length > 0
              ? isEs
                ? 'Elige una categoría para ver sus subcategorías.'
                : 'Pick a category to see its subcategories.'
              : isEs
                ? 'Selecciona al menos una estación para habilitar.'
                : 'Pick at least one station to enable.'
          }
          categories={stationTiedCategories}
          enabled={activeStations.length > 0}
          emptyHeading={sectionEmpty}
          locale={locale}
          stationIds={activeStationIds}
          initiallyExpandedId={
            activeStations.length > 0
              ? stationTiedCategories[0]?.id ?? null
              : null
          }
        />
      </div>
    </section>
  );
}

/** One of the two stacked sections in the two-panel view. Each section
 *  owns its own accordion state (one row open at a time) and is either
 *  enabled (interactive) or disabled (greyed out, no clicks). Subcategory
 *  pills forward the picked station ids when present so the procedures
 *  page can scope itself. */
function CategorySection({
  title,
  caption,
  categories,
  enabled,
  emptyHeading,
  locale,
  stationIds,
  initiallyExpandedId,
}: {
  title: string;
  caption: string;
  categories: Category[];
  enabled: boolean;
  emptyHeading: string;
  locale: string;
  stationIds: ReadonlyArray<string>;
  initiallyExpandedId: string | null;
}): React.ReactElement {
  const isEs = locale === 'es';
  const [expandedId, setExpandedId] = React.useState<string | null>(initiallyExpandedId);

  // When the section flips between enabled and disabled (e.g. the
  // manager picks or unpicks a station), reset the open row so the
  // disabled state cannot leak the previous pick.
  React.useEffect(() => {
    setExpandedId(enabled ? initiallyExpandedId : null);
  }, [enabled, initiallyExpandedId]);

  return (
    <section
      aria-label={title}
      aria-disabled={!enabled}
      className={cn(
        'flex min-h-0 flex-col rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-3 shadow-2xs',
        !enabled && 'opacity-60',
      )}
    >
      <header className="flex items-baseline justify-between gap-3 px-1 pb-2">
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">{title}</h3>
        <p className="text-xs text-[var(--color-ink-3)]">{caption}</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {categories.length === 0 ? (
          <EmptyCategories heading={emptyHeading} />
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {categories.map((c) => (
              <CategoryAccordionRow
                key={c.id}
                category={c}
                locale={locale}
                isExpanded={expandedId === c.id}
                onToggle={() =>
                  setExpandedId((prev) => (prev === c.id ? null : c.id))
                }
                stationIds={stationIds}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** One row inside `CategorySection`. Mirrors the accordion pattern in
 *  `category-detail-client.tsx` (role=button + aria-expanded +
 *  aria-controls) so screen readers and keyboard users get the same
 *  affordance they already know. The expanded panel lists subcategories
 *  as pill buttons — same chip style used elsewhere in the admin.
 *  Only the kebab row-action sits on the right (rename / archive); the
 *  accordion toggle is signalled by the wash background + the inline
 *  panel below, so no second chevron competes with it. */
function CategoryAccordionRow({
  category,
  locale,
  isExpanded,
  onToggle,
  stationIds,
}: {
  category: Category;
  locale: string;
  isExpanded: boolean;
  onToggle: () => void;
  stationIds: ReadonlyArray<string>;
}): React.ReactElement {
  const router = useRouter();
  const isEs = locale === 'es';
  const primaryName = isEs ? category.nameEs : category.nameEn;
  const subcategories = category.subcategories ?? [];
  const headerId = `cat-row-${category.id}`;
  const panelId = `cat-panel-${category.id}`;

  // Forward every picked station so the drilldown / subcategory pages
  // scope their procedure lists by the same selection. Each `station=`
  // appears once per id, matching the multi-select convention on the
  // categories page.
  const stationQuery =
    stationIds.length > 0
      ? `?${stationIds.map((id) => `station=${encodeURIComponent(id)}`).join('&')}`
      : '';

  return (
    <li>
      <div
        id={headerId}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className={cn(
          'flex w-full cursor-pointer items-center justify-between gap-3 px-2 py-3 text-left transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]',
          isExpanded ? 'bg-[var(--color-wash)]' : 'hover:bg-[var(--color-wash)]',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <IconTile size="md" icon={getCategoryIcon(category)} />
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-[var(--color-ink)]">
              {primaryName}
            </h4>
            <p className="mt-0.5 truncate text-xs text-[var(--color-ink-3)]">
              {subcategories.length}{' '}
              {subcategories.length === 1
                ? isEs
                  ? 'subcategoría'
                  : 'subcategory'
                : isEs
                  ? 'subcategorías'
                  : 'subcategories'}
            </p>
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()} className="shrink-0 pl-3">
          <CategoryActions category={category} />
        </div>
      </div>

      {isExpanded && subcategories.length > 0 ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="px-3 pb-3 pt-1"
        >
          <div className="flex flex-wrap gap-2">
            {subcategories.map((s) => {
              const sName = isEs ? s.nameEs : s.nameEn;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(
                      `/${locale}/admin/library/categories/${category.slug}/${s.slug}${stationQuery}`,
                    );
                  }}
                  className="rounded-full border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-line-hover)] hover:bg-[var(--color-wash)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                >
                  {sName}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </li>
  );
}

/** Stations row at the top of the two-panel view — rendered as a
 *  horizontal strip of checkbox cards. Multi-select: each click toggles
 *  that station in/out of the URL's `?station=` set (one param per id).
 *  Picked stations wear the brand-tint card with a filled check; idle
 *  stations are inert cards. The subcategory pills below forward every
 *  picked id so the drilldown scopes itself to the same selection. */
function StationsPanel({
  isEs,
  activeStationIds,
  onToggleStation,
}: {
  isEs: boolean;
  activeStationIds: ReadonlyArray<string>;
  onToggleStation: (id: string) => void;
}): React.ReactElement {
  return (
    <nav aria-label={isEs ? 'Estaciones' : 'Stations'}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-3)]">
        {isEs ? 'Estaciones' : 'Stations'}
      </p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {STATIONS.map((s) => {
          const isActive = activeStationIds.includes(s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onToggleStation(s.id)}
                aria-pressed={isActive}
                className={cn(
                  'group flex w-full items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]',
                  isActive
                    ? 'border-[var(--color-ring)] bg-[var(--color-brand-tint)]'
                    : 'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-panel)]',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                    isActive
                      ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white'
                      : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-transparent',
                  )}
                >
                  <LuCheck className="text-[10px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-sm',
                      isActive
                        ? 'font-semibold text-[var(--color-brand-700)]'
                        : 'font-medium text-[var(--color-ink)]',
                    )}
                  >
                    {s.name}
                  </span>
                  <span className="block truncate text-xs text-[var(--color-ink-3)]">
                    {s.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Clickable category card for the main view (general categories + archived).
 *  Shows only the current-locale name — the other language lives on the
 *  edit view, where it is actually needed. */
function CategoryCard({
  category,
  locale,
  archivedChipLabel,
}: {
  category: Category;
  locale: string;
  archivedChipLabel: string | null;
}): React.ReactElement {
  const router = useRouter();
  const isEs = locale === 'es';
  const primaryName = isEs ? category.nameEs : category.nameEn;

  const handleCardClick = () => {
    router.push(`/${locale}/admin/library/categories/${category.slug}`);
  };

  const subcategories = category.subcategories ?? [];
  const totalProcedures = subcategories.length > 0 ? subcategories.length * 5 + 4 : 0;

  return (
    <article
      onClick={handleCardClick}
      className={cn(
        'group flex flex-col justify-between rounded-[var(--radius-lg)] cursor-pointer h-full min-h-[110px]',
        'border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 shadow-2xs transition-all',
        'hover:border-[var(--color-line-hover)] hover:shadow-e1',
        archivedChipLabel ? 'bg-[var(--color-wash)] opacity-75' : undefined,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <IconTile size="md" icon={getCategoryIcon(category)} className="group-hover:text-[var(--color-ink)]" />
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="truncate text-sm font-semibold text-[var(--color-ink)]">
              {primaryName}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {archivedChipLabel ? <StatusPill tone="neutral">{archivedChipLabel}</StatusPill> : null}
          <CategoryActions category={category} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--color-line)] text-sm leading-meta text-[var(--color-ink-3)]">
        <span>
          {subcategories.length}{' '}
          {isEs ? (subcategories.length === 1 ? 'subcategoría' : 'subcategorías') : (subcategories.length === 1 ? 'subcategory' : 'subcategories')}
          {totalProcedures > 0 && ` · ${totalProcedures} ${isEs ? 'procedimientos' : 'procedures'}`}
        </span>
        <LuArrowRight aria-hidden="true" className="text-[var(--color-ink-3)] transition-transform group-hover:translate-x-0.5" />
      </div>
    </article>
  );
}

function EmptyCategories({ heading }: { heading: string }): React.ReactElement {
  return <EmptyState icon={LuFolders} title={heading} />;
}