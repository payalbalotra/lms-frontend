'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCategoryIcon, getSubcategoryIcon } from '@/lib/category-icons';
import type { Category, Subcategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { Popover } from '@/components/ui/popover';
import { RowActions } from '@/components/ui/row-actions';
import { cn } from '@/lib/utils';
import { LuCheck, LuChevronRight, LuPlus, LuX } from 'react-icons/lu';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/admin/page-header';

interface CategoryDetailClientProps {
  /** The category the server saw. `null` when the category exists only in the
   *  client mock store (e.g. just-created via the Create Category modal —
   *  the backend is not running, so the server fetch misses it). */
  initialCategory: Category | null;
  /** The slug from the URL — used to look the category up client-side when
   *  the server didn't find it. */
  slug: string;
  locale: string;
}

/** Stations available for station-tied categories. The id is the URL-stable
 *  slug the wizard reads from `?station=…`; the code is what the manager
 *  reads on the chip. Mirrors `SEED_STATIONS` in `lib/api.ts`. */
const STATIONS: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'stn-gm', name: 'GM' },
  { id: 'stn-grill', name: 'Grill' },
  { id: 'stn-expo', name: 'Expo' },
  { id: 'stn-prep', name: 'Prep Kitchen' },
  { id: 'stn-dish', name: 'Dishwasher' },
];

interface ProcedureRow {
  id: string;
  slug: string;
  titleEn: string;
  titleEs: string;
  /** The single station this procedure is attached to. `null` means the
   *  manager hasn't picked one yet — the chip area renders the "No
   *  station" hint and the picker is the entry point. */
  station: string | null;
  updatedAgoEn: string;
  updatedAgoEs: string;
}

/** Per-subcategory fixture. Each procedure carries the single station id
 *  it is currently attached to. Procedures outside the seeded list are
 *  generated with `station: null` so the row's chip area starts in the
 *  "No station" state and the manager can populate it via the picker. */
const PROCEDURES_BY_SUBCATEGORY: Record<string, ReadonlyArray<ProcedureRow>> = {
  plating: [
    { id: 'proc-p1', slug: 'cold-section-plating-sop', titleEn: 'Cold Section Plating SOP', titleEs: 'Emplatado - Sección fría', station: 'stn-gm', updatedAgoEn: 'Updated 2 days ago', updatedAgoEs: 'Actualizado hace 2 días' },
    { id: 'proc-p2', slug: 'grill-plating-sop', titleEn: 'Grill Plating SOP', titleEs: 'Emplatado - Parrilla', station: 'stn-grill', updatedAgoEn: 'Updated 3 days ago', updatedAgoEs: 'Actualizado hace 3 días' },
    { id: 'proc-p3', slug: 'expo-plating-sop', titleEn: 'Expo Plating SOP', titleEs: 'Emplatado - Expo', station: 'stn-expo', updatedAgoEn: 'Updated 4 days ago', updatedAgoEs: 'Actualizado hace 4 días' },
    { id: 'proc-p4', slug: 'prep-kitchen-plating-sop', titleEn: 'Prep Kitchen Plating SOP', titleEs: 'Emplatado - Cocina de preparación', station: 'stn-prep', updatedAgoEn: 'Updated 5 days ago', updatedAgoEs: 'Actualizado hace 5 días' },
    { id: 'proc-p5', slug: 'shared-plating-sop', titleEn: 'Shared Plating SOP', titleEs: 'Emplatado - Procedimiento compartido', station: 'stn-grill', updatedAgoEn: 'Updated 1 day ago', updatedAgoEs: 'Actualizado hace 1 día' },
  ],
  cooking: [
    { id: 'proc-c1', slug: 'hot-line-cooking-sop', titleEn: 'Hot Line Cooking SOP', titleEs: 'Cocción - Línea caliente', station: 'stn-grill', updatedAgoEn: 'Updated 1 day ago', updatedAgoEs: 'Actualizado hace 1 día' },
    { id: 'proc-c2', slug: 'fryer-temperature-guide', titleEn: 'Fryer Temperature & Timing SOP', titleEs: 'Control de Temperatura de Freidora', station: 'stn-gm', updatedAgoEn: 'Updated 3 days ago', updatedAgoEs: 'Actualizado hace 3 días' },
  ],
  hygiene: [
    { id: 'proc-h1', slug: 'handwashing-sanitization-sop', titleEn: 'Handwashing & Personal Sanitization', titleEs: 'Lavado de Manos y Sanitización', station: null, updatedAgoEn: 'Updated 1 day ago', updatedAgoEs: 'Actualizado hace 1 día' },
    { id: 'proc-h2', slug: 'surface-disinfection-sop', titleEn: 'Surface Disinfection Standard', titleEs: 'Estándar de Desinfección de Superficies', station: null, updatedAgoEn: 'Updated 4 days ago', updatedAgoEs: 'Actualizado hace 4 días' },
  ],
};

export function CategoryDetailClient({
  initialCategory,
  slug,
  locale,
}: CategoryDetailClientProps): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The chosen station(s) from the categories page travel via repeated
  // `?station=` params (multi-select). The wizard's Access step reads them
  // and pre-fills `audience.stationIds`. Dedup + intersect with the known
  // list so a stale/unknown id never leaks through.
  const stationIdsFromUrl = React.useMemo(() => {
    const seen = new Set<string>();
    const known = new Set(STATIONS.map((s) => s.id));
    return searchParams
      .getAll('station')
      .filter((id) => {
        if (seen.has(id) || !known.has(id)) return false;
        seen.add(id);
        return true;
      });
  }, [searchParams]);
  // Legacy alias kept for the wizard URL: the first picked station is the
  // one pre-filled when the manager opens the new-procedure wizard.
  const stationFromUrl = stationIdsFromUrl[0] ?? null;
  const isEs = locale === 'es';
  const [category, setCategory] = React.useState<Category | null>(initialCategory);
  const [isResolving, setIsResolving] = React.useState<boolean>(initialCategory === null);
  const [notFound, setNotFound] = React.useState<boolean>(false);

  // Categories created through the modal are stored in the client mock
  // store; the server's seed fetch can't see them. On mount, if the server
  // didn't hand us a category, ask the mock store directly.
  React.useEffect(() => {
    if (initialCategory !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const { listCategories } = await import('@/lib/api');
        // locationId is not needed client-side — the mock store is location-
        // agnostic in the demo.
        const { categories } = await listCategories('loc-main');
        const match = categories.find((c) => c.slug === slug);
        if (cancelled) return;
        if (match) {
          setCategory(match);
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setIsResolving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialCategory, slug]);

  const subcategories = category?.subcategories ?? [];

  // Default the open subcategory to the first one so the page never lands
  // fully collapsed — the manager sees what the category contains without
  // an extra click.
  const [openSubSlug, setOpenSubSlug] = React.useState<string | null>(
    subcategories[0]?.slug ?? null,
  );

  // Procedures keyed by subcategory slug. State lives here (not inside the
  // accordion) so toggling / clearing stations in one panel doesn't reset
  // state in another. Initial copy is per-slug so a future "reset"
  // affordance can return to the seed cleanly.
  const [proceduresBySubSlug, setProceduresBySubSlug] = React.useState<
    Record<string, ProcedureRow[]>
  >(() => {
    const out: Record<string, ProcedureRow[]> = {};
    for (const sub of subcategories) {
      out[sub.slug] = initialProceduresFor(sub, stationFromUrl);
    }
    return out;
  });

  // When the category resolves late (server missed → mock store has it),
  // subcategories go from `[]` to the real list. Seed the procedures
  // map once for the new subcategories.
  React.useEffect(() => {
    setProceduresBySubSlug((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const sub of subcategories) {
        if (!next[sub.slug]) {
          next[sub.slug] = initialProceduresFor(sub, stationFromUrl);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [subcategories, stationFromUrl]);

  function toggleStation(procedureId: string, stationId: string): void {
    if (!openSubSlug) return;
    setProceduresBySubSlug((prev) => {
      const list = prev[openSubSlug] ?? [];
      const next = list.map((p) => {
        if (p.id !== procedureId) return p;
        // Single-select: clicking the same station clears it; clicking a
        // different one replaces whatever was set.
        return { ...p, station: p.station === stationId ? null : stationId };
      });
      return { ...prev, [openSubSlug]: next };
    });
  }

  // Loading: the server's seed fetch missed (only client mock store has it),
  // and the client-side resolve is still running. Show a quiet pulse so the
  // user doesn't think the link was broken.
  if (isResolving) {
    return (
      <div className="mx-auto max-w-page space-y-6">
        <PageHeader
          eyebrow={isEs ? 'Categorías' : 'Categories'}
          eyebrowHref={`/${locale}/admin/library/categories`}
          title={isEs ? 'Cargando categoría…' : 'Loading category…'}
        />
        <div role="status" aria-live="polite" className="animate-pulse">
          <EmptyState compact title={isEs ? 'Cargando categoría…' : 'Loading category…'} />
        </div>
      </div>
    );
  }

  // Not found: the mock store also doesn't have a category with this slug —
  // either the row was deleted or the user opened a stale link.
  if (!category || notFound) {
    return (
      <div className="mx-auto max-w-page space-y-6">
        <PageHeader
          eyebrow={isEs ? 'Categorías' : 'Categories'}
          eyebrowHref={`/${locale}/admin/library/categories`}
          title={isEs ? 'Categoría no encontrada' : 'Category not found'}
          subtitle={
            isEs
              ? 'La categoría solicitada no existe o fue eliminada.'
              : 'The requested category does not exist or has been removed.'
          }
          actions={
            <Link href={`/${locale}/admin/library/categories`}>
              <Button variant="secondary">
                {isEs ? 'Volver a categorías' : 'Back to categories'}
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-page space-y-6">
      {/* The header every admin page wears. The eyebrow is the list this came
          from and the way back to it; no second back arrow or icon beside
          the title. The right-side action is a secondary "Back to
          categories" so the manager can leave this drilldown without
          reaching for the sidebar. */}
      <PageHeader
        eyebrow={isEs ? 'Categorías' : 'Categories'}
        eyebrowHref={`/${locale}/admin/library/categories`}
        title={isEs ? category.nameEs : category.nameEn}
        actions={
          <Link href={`/${locale}/admin/library/categories`}>
            <Button variant="secondary">
              {isEs ? 'Volver a categorías' : 'Back to categories'}
            </Button>
          </Link>
        }
      />

      {subcategories.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] p-6 text-center text-sm text-[var(--color-ink-3)]">
          {isEs
            ? 'Esta categoría no tiene subcategorías.'
            : 'This category has no subcategories.'}
        </p>
      ) : (
        <div className="space-y-3">
          {subcategories.map((sub) => (
            <SubcategoryAccordion
              key={sub.id || sub.slug}
              category={category}
              subcategory={sub}
              procedures={proceduresBySubSlug[sub.slug] ?? []}
              isEs={isEs}
              isOpen={openSubSlug === sub.slug}
              onToggle={() =>
                setOpenSubSlug((prev) => (prev === sub.slug ? null : sub.slug))
              }
              onToggleStation={toggleStation}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Build the seed procedure list for a subcategory. Known slugs use the
 *  fixture so the demo data (Plating → 5 procedures with one station each)
 *  lands as the client saw it. Anything else gets two generated rows with
 *  `station: null` — the manager can attach a station via the picker. */
function initialProceduresFor(
  sub: Subcategory,
  stationFromUrl: string | null,
): ProcedureRow[] {
  const seeded = PROCEDURES_BY_SUBCATEGORY[sub.slug];
  if (seeded) {
    return seeded.map((p) => ({ ...p }));
  }
  // The chosen station on the categories page drives the wizard pre-fill
  // for new procedures; the seed list here stays empty so the chip area
  // renders the "No station" hint rather than inventing a fake tag.
  void stationFromUrl;
  return [
    {
      id: `proc-${sub.slug}-1`,
      slug: `${sub.slug}-standard-sop`,
      titleEn: `${sub.nameEn} Standard Operating Procedure`,
      titleEs: `Procedimiento de ${sub.nameEs}`,
      station: null,
      updatedAgoEn: 'Updated 2 days ago',
      updatedAgoEs: 'Actualizado hace 2 días',
    },
    {
      id: `proc-${sub.slug}-2`,
      slug: `${sub.slug}-safety-sop`,
      titleEn: `${sub.nameEn} Safety Checklist`,
      titleEs: `Lista de Seguridad de ${sub.nameEs}`,
      station: null,
      updatedAgoEn: 'Updated 4 days ago',
      updatedAgoEs: 'Actualizado hace 4 días',
    },
  ];
}

/** One accordion row. The header is the clickable subcategory row; the
 *  body lists the procedures with one removable station chip + Add
 *  station picker. Mirrors the demo recipes view: aggregated stations
 *  strip lives in the header when the panel is open, per-row chip +
 *  picker live inside. */
function SubcategoryAccordion({
  category,
  subcategory,
  procedures,
  isEs,
  isOpen,
  onToggle,
  onToggleStation,
  locale,
}: {
  category: Category;
  subcategory: Subcategory;
  procedures: ProcedureRow[];
  isEs: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onToggleStation: (procedureId: string, stationId: string) => void;
  locale: string;
}): React.ReactElement {
  const router = useRouter();
  const subName = isEs ? subcategory.nameEs : subcategory.nameEn;
  const subNameSecondary = isEs ? subcategory.nameEn : subcategory.nameEs;
  const headerId = `sub-header-${subcategory.id || subcategory.slug}`;
  const panelId = `sub-panel-${subcategory.id || subcategory.slug}`;
  const SubIcon = getSubcategoryIcon(subcategory);

  // Aggregated station list — the unique set of stations any procedure in
  // this panel is attached to, intersected with the known list so an
  // unknown id never bubbles up. Drawn in the header when the panel is
  // open.
  const linkedStations = React.useMemo(() => {
    const set = new Set<string>();
    for (const proc of procedures) {
      if (proc.station) set.add(proc.station);
    }
    return STATIONS.filter((s) => set.has(s.id));
  }, [procedures]);

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xs">
      <div
        id={headerId}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button, a, [role="menuitem"], [role="dialog"]')) {
            return;
          }
          onToggle();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            if ((e.target as HTMLElement).closest('button, a')) return;
            e.preventDefault();
            onToggle();
          }
        }}
        className={cn(
          'flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]',
          isOpen ? 'bg-[var(--color-wash)]' : 'hover:bg-[var(--color-wash)]',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <IconTile size="md" icon={SubIcon} />
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-[var(--color-ink)]">
              {subName}
            </h2>
            <p className="mt-0.5 truncate text-sm leading-meta text-[var(--color-ink-3)]">
              {subNameSecondary}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {isOpen && linkedStations.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs font-medium text-[var(--color-ink-3)] md:inline">
                {isEs ? 'Estaciones:' : 'Stations:'}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {linkedStations.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center rounded-md bg-[var(--color-brand-tint)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-700)]"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              // The wizard's Access step asks the manager to attach the
              // station — pre-filling it from this accordion would skip
              // that decision and leak the wrong station to general
              // procedures. Pass only category + subcategory; the wizard
              // applies its own default (general → all stations,
              // station-specific → none) once the manager reaches it.
              router.push(
                `/${locale}/admin/library/new?category=${category.slug}&subcategory=${subcategory.slug}`,
              );
            }}
            className="shrink-0 font-semibold shadow-2xs"
          >
            <LuPlus className="text-base" />
            <span>{isEs ? 'Añadir procedimiento' : 'Add procedure'}</span>
          </Button>

          <LuChevronRight
            aria-hidden="true"
            className={cn(
              'size-4 shrink-0 text-[var(--color-ink-3)] transition-transform',
              isOpen && 'rotate-90',
            )}
          />
        </div>
      </div>

      {isOpen && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="border-t border-[var(--color-line-2)] bg-[var(--color-surface)]"
        >
          {procedures.length === 0 ? (
            <div className="p-6">
              <EmptyState
                compact
                title={
                  isEs
                    ? 'Sin procedimientos aún en esta subcategoría.'
                    : 'No procedures added yet in this subcategory.'
                }
              />
            </div>
          ) : (
            <div>
              <ul className="divide-y divide-[var(--color-line)]">
                {procedures.map((proc) => (
                  <ProcedureListItem
                    key={proc.id}
                    procedure={proc}
                    isEs={isEs}
                    onToggleStation={(stationId) => onToggleStation(proc.id, stationId)}
                    onOpenProcedure={() =>
                      router.push(`/${locale}/admin/library/${proc.slug}`)
                    }
                    onEditProcedure={() =>
                      router.push(`/${locale}/admin/library/${proc.slug}/edit`)
                    }
                  />
                ))}
              </ul>

              <div className="flex items-center justify-between border-t border-[var(--color-line)] px-4 py-3 text-xs font-medium text-[var(--color-ink-3)]">
                <span>
                  {procedures.length} {isEs ? 'procedimientos' : 'procedures'}
                  {' · '}
                  {linkedStations.length}{' '}
                  {linkedStations.length === 1
                    ? isEs
                      ? 'estación enlazada'
                      : 'linked station'
                    : isEs
                      ? 'estaciones enlazadas'
                      : 'linked stations'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** One procedure row with one station chip + single-select radio popover
 *  + the usual View/Edit/Add station kebab. The chip IS the picker entry
 *  point — clicking it swaps to another station; the picker helper text
 *  tells the manager that clicking the same station again clears it. */
function ProcedureListItem({
  procedure,
  isEs,
  onToggleStation,
  onOpenProcedure,
  onEditProcedure,
}: {
  procedure: ProcedureRow;
  isEs: boolean;
  onToggleStation: (stationId: string) => void;
  onOpenProcedure: () => void;
  onEditProcedure: () => void;
}): React.ReactElement {
  const addTriggerRef = React.useRef<HTMLButtonElement>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  // Resolve the assigned station. Unknown ids (stale data) fall back to the
  // "No station" pill rather than rendering a broken chip.
  const assignedStation = procedure.station
    ? STATIONS.find((s) => s.id === procedure.station) ?? null
    : null;

  return (
    <li className="transition-colors hover:bg-[var(--color-wash)]">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div
          role="button"
          tabIndex={0}
          onClick={onOpenProcedure}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenProcedure();
            }
          }}
          className="min-w-0 flex-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)] rounded-[var(--radius-sm)]"
        >
          <h4 className="truncate text-sm font-semibold text-[var(--color-ink)]">
            {isEs ? procedure.titleEs : procedure.titleEn}
          </h4>
          <p className="truncate text-sm text-[var(--color-ink-2)]">
            {isEs ? procedure.titleEn : procedure.titleEs}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-4 pl-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {assignedStation ? (
              // When a station is already attached the chip IS the picker
              // entry point — clicking it swaps to another station. The ×
              // is a visual cue only; the picker helper text tells the
              // manager "click the same station again to clear", so the
              // chip doesn't need a separate destructive affordance.
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                aria-haspopup="menu"
                aria-expanded={pickerOpen}
                aria-label={
                  isEs
                    ? `Cambiar ${assignedStation.name}`
                    : `Change ${assignedStation.name}`
                }
                className="group/chip inline-flex items-center gap-1.5 rounded-md bg-[var(--color-panel-2)] px-3 py-1 text-xs font-semibold text-[var(--color-ink)] border border-[var(--color-line-2)] transition-colors hover:border-[var(--color-line-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                {assignedStation.name}
                <LuX
                  aria-hidden="true"
                  className="text-[11px] text-[var(--color-ink-3)] transition-colors group-hover/chip:text-[var(--color-ink)]"
                />
              </button>
            ) : (
              <>
                <span className="inline-flex items-center rounded-md border border-dashed border-[var(--color-line-2)] px-3 py-1 text-xs font-semibold text-[var(--color-ink-3)]">
                  {isEs ? 'Sin estación' : 'No station'}
                </span>
                <button
                  ref={addTriggerRef}
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  aria-haspopup="menu"
                  aria-expanded={pickerOpen}
                  className="ml-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-[var(--color-line-2)] bg-transparent px-3 py-1 text-xs font-semibold text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-line-hover)] hover:bg-[var(--color-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                >
                  <LuPlus aria-hidden="true" className="text-xs" />
                  {isEs ? 'Añadir' : 'Add'}
                </button>
              </>
            )}
          </div>

          <span className="hidden text-sm leading-meta text-[var(--color-ink-3)] sm:inline">
            {isEs ? procedure.updatedAgoEs : procedure.updatedAgoEn}
          </span>

          <RowActions
            items={[
              {
                label: isEs ? 'Ver procedimiento' : 'View procedure',
                onSelect: onOpenProcedure,
              },
              {
                label: isEs ? 'Editar' : 'Edit',
                onSelect: onEditProcedure,
              },
              {
                label: assignedStation
                  ? isEs
                    ? 'Cambiar estación'
                    : 'Change station'
                  : isEs
                    ? 'Añadir estación'
                    : 'Add station',
                onSelect: () => setPickerOpen(true),
              },
            ]}
            triggerLabel={procedure.titleEn}
          />
        </div>
      </div>

      <Popover
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        triggerRef={addTriggerRef}
        align="end"
        side="bottom"
        width={280}
      >
        <div className="space-y-1.5 p-1">
          <p className="px-2 pt-1 text-xs font-semibold text-[var(--color-ink-3)]">
            {isEs ? 'Asignar estación' : 'Assign station'}
          </p>
          <ul className="space-y-0.5">
            {STATIONS.map((s) => {
              const checked = procedure.station === s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={checked}
                    onClick={() => onToggleStation(s.id)}
                    className={cn(
                      'flex w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-md)] px-2 py-1.5 text-left transition-colors',
                      'hover:bg-[var(--color-panel)] focus-visible:bg-[var(--color-brand-tint)] focus-visible:outline-none',
                    )}
                  >
                    <span className="text-sm font-medium text-[var(--color-ink)]">
                      {s.name}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'inline-flex size-5 items-center justify-center rounded-full border transition-colors',
                        checked
                          ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white'
                          : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-transparent',
                      )}
                    >
                      <LuCheck className="text-[12px]" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="px-2 pb-1 text-[11px] text-[var(--color-ink-3)]">
            {isEs
              ? 'Selecciona la misma estación para quitarla.'
              : 'Pick the same station again to clear.'}
          </p>
        </div>
      </Popover>
    </li>
  );
}