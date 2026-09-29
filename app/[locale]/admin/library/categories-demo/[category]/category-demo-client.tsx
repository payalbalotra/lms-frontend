'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { Popover } from '@/components/ui/popover';
import { RowActions } from '@/components/ui/row-actions';
import { getSubcategoryIcon } from '@/lib/category-icons';
import { PageHeader } from '@/components/admin/page-header';
import { LuCheck, LuChevronRight, LuPlus, LuX } from 'react-icons/lu';
import type { Category, Subcategory } from '@/lib/types';



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
  /** Station ids this procedure is tagged with. Empty = "all stations". */
  stationIds: string[];
  updatedAgoEn: string;
  updatedAgoEs: string;
}

/** Demo fixture: the Plating subcategory under Recipes. This is the only
 *  subcategory wired with the add-station demo; others fall back to a
 *  small "demo not wired" note. */
const PLATING_PROCEDURES: ReadonlyArray<ProcedureRow> = [
  {
    id: 'proc-1',
    slug: 'cold-section-plating-sop',
    titleEn: 'Cold Section Plating SOP',
    titleEs: 'Emplatado - Sección fría',
    stationIds: ['stn-gm'],
    updatedAgoEn: 'Updated 2 days ago',
    updatedAgoEs: 'Actualizado hace 2 días',
  },
  {
    id: 'proc-2',
    slug: 'grill-plating-sop',
    titleEn: 'Grill Plating SOP',
    titleEs: 'Emplatado - Parrilla',
    stationIds: ['stn-grill'],
    updatedAgoEn: 'Updated 3 days ago',
    updatedAgoEs: 'Actualizado hace 3 días',
  },
  {
    id: 'proc-3',
    slug: 'expo-plating-sop',
    titleEn: 'Expo Plating SOP',
    titleEs: 'Emplatado - Expo',
    stationIds: ['stn-expo'],
    updatedAgoEn: 'Updated 4 days ago',
    updatedAgoEs: 'Actualizado hace 4 días',
  },
  {
    id: 'proc-4',
    slug: 'prep-kitchen-plating-sop',
    titleEn: 'Prep Kitchen Plating SOP',
    titleEs: 'Emplatado - Cocina de preparación',
    stationIds: ['stn-prep'],
    updatedAgoEn: 'Updated 5 days ago',
    updatedAgoEs: 'Actualizado hace 5 días',
  },
  {
    id: 'proc-5',
    slug: 'shared-plating-sop',
    titleEn: 'Shared Plating SOP',
    titleEs: 'Emplatado - Procedimiento compartido',
    stationIds: ['stn-grill', 'stn-expo'],
    updatedAgoEn: 'Updated 1 day ago',
    updatedAgoEs: 'Actualizado hace 1 día',
  },
];

export function CategoryDemoClient({
  category,
  locale,
}: {
  category: Category;
  locale: string;
}): React.ReactElement {
  const isEs = locale === 'es';
  const router = useRouter();
  const subcategories = category.subcategories ?? [];

  // Default the open subcategory to "plating" when it's part of the
  // category — that's the one the demo data wires. Otherwise fall back
  // to the first subcategory so the page never lands fully collapsed.
  const defaultOpen = subcategories.some((s) => s.slug === 'plating')
    ? 'plating'
    : subcategories[0]?.slug ?? null;
  const [openSubSlug, setOpenSubSlug] = React.useState<string | null>(defaultOpen);

  return (
    <div className="mx-auto w-full max-w-page space-y-6">
      <PageHeader
        eyebrow={isEs ? 'Categorías' : 'Categories'}
        eyebrowHref={`/${locale}/admin/library/categories-demo`}
        title={isEs ? category.nameEs : category.nameEn}
       
        actions={
          <Link href={`/${locale}/admin/library/categories-demo`}>
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
              isEs={isEs}
              isOpen={openSubSlug === sub.slug}
              onToggle={() =>
                setOpenSubSlug((prev) => (prev === sub.slug ? null : sub.slug))
              }
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** One accordion row. The header is the clickable subcategory row; the
 *  body is the procedure list (with the add-station demo when the
 *  subcategory is "plating") or a small "demo not wired" note. */
function SubcategoryAccordion({
  category,
  subcategory,
  isEs,
  isOpen,
  onToggle,
  locale,
}: {
  category: Category;
  subcategory: Subcategory;
  isEs: boolean;
  isOpen: boolean;
  onToggle: () => void;
  locale: string;
}): React.ReactElement {
  const router = useRouter();
  const subName = isEs ? subcategory.nameEs : subcategory.nameEn;
  const headerId = `sub-header-${subcategory.id || subcategory.slug}`;
  const panelId = `sub-panel-${subcategory.id || subcategory.slug}`;
  const SubIcon = getSubcategoryIcon(subcategory);

  const [procedures, setProcedures] = React.useState<ReadonlyArray<ProcedureRow>>(
    subcategory.slug === 'plating' ? PLATING_PROCEDURES : [],
  );

  const linkedStationIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const proc of procedures) {
      for (const id of proc.stationIds) set.add(id);
    }
    return STATIONS.filter((s) => set.has(s.id));
  }, [procedures]);

  function toggleStation(procedureId: string, stationId: string): void {
    setProcedures((prev) =>
      prev.map((p) => {
        if (p.id !== procedureId) return p;
        const has = p.stationIds.includes(stationId);
        return {
          ...p,
          stationIds: has
            ? p.stationIds.filter((id) => id !== stationId)
            : [...p.stationIds, stationId],
        };
      }),
    );
  }

  function clearStations(procedureId: string): void {
    setProcedures((prev) =>
      prev.map((p) => (p.id === procedureId ? { ...p, stationIds: [] } : p)),
    );
  }

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
              {isEs ? subcategory.nameEn : subcategory.nameEs}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {linkedStationIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs font-medium text-[var(--color-ink-3)] md:inline">
                {isEs ? 'Estaciones:' : 'Stations:'}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {linkedStationIds.map((s) => (
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
              const stationQuery =
                linkedStationIds.length > 0
                  ? `&${linkedStationIds.map((s) => `station=${encodeURIComponent(s.id)}`).join('&')}`
                  : '';
              router.push(
                `/${locale}/admin/library/new?category=${category.slug}&subcategory=${subcategory.slug}${stationQuery}`,
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
          {subcategory.slug === 'plating' ? (
            <PlatingProcedureList
              procedures={procedures}
              linkedStationIds={linkedStationIds}
              onToggleStation={toggleStation}
              onClearStations={clearStations}
              isEs={isEs}
              locale={locale}
            />
          ) : (
            <p className="p-6 text-center text-xs text-[var(--color-ink-3)]">
              {isEs
                ? 'La demo de estaciones está conectada solo a Plating.'
                : 'The station-tagging demo is wired for Plating only.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** The Plating subcategory's procedure list. */
function PlatingProcedureList({
  procedures,
  linkedStationIds,
  onToggleStation,
  onClearStations,
  isEs,
  locale,
}: {
  procedures: ReadonlyArray<ProcedureRow>;
  linkedStationIds: ReadonlyArray<{ id: string; name: string }>;
  onToggleStation: (procedureId: string, stationId: string) => void;
  onClearStations: (procedureId: string) => void;
  isEs: boolean;
  locale: string;
}): React.ReactElement {
  const router = useRouter();

  return (
    <div>
      <ul className="divide-y divide-[var(--color-line)]">
        {procedures.map((proc) => (
          <ProcedureListItem
            key={proc.id}
            procedure={proc}
            isEs={isEs}
            onToggleStation={(stationId) => onToggleStation(proc.id, stationId)}
            onClearStations={() => onClearStations(proc.id)}
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
          {procedures.length} {isEs ? 'procedimientos' : 'procedures'} ·{' '}
          {linkedStationIds.length}{' '}
          {linkedStationIds.length === 1
            ? isEs
              ? 'estación enlazada'
              : 'linked station'
            : isEs
              ? 'estaciones enlazadas'
              : 'linked stations'}
        </span>
      </div>
    </div>
  );
}

/** One procedure row with removable station chips + Add station popover
 *  + the usual View/Edit kebab. */
function ProcedureListItem({
  procedure,
  isEs,
  onToggleStation,
  onClearStations,
  onOpenProcedure,
  onEditProcedure,
}: {
  procedure: ProcedureRow;
  isEs: boolean;
  onToggleStation: (stationId: string) => void;
  onClearStations: () => void;
  onOpenProcedure: () => void;
  onEditProcedure: () => void;
}): React.ReactElement {
  const addTriggerRef = React.useRef<HTMLButtonElement>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);

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
            {procedure.stationIds.length === 0 ? (
              <span className="inline-flex items-center rounded-md border border-dashed border-[var(--color-line-2)] px-3 py-1 text-xs font-semibold text-[var(--color-ink-3)]">
                {isEs ? 'Sin estación' : 'No station'}
              </span>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {procedure.stationIds.map((stationId) => {
                  const station = STATIONS.find((s) => s.id === stationId);
                  if (!station) return null;
                  return (
                    <button
                      key={stationId}
                      type="button"
                      onClick={() => onToggleStation(stationId)}
                      aria-label={
                        isEs ? `Quitar ${station.name}` : `Remove ${station.name}`
                      }
                      className="group/chip inline-flex items-center gap-1.5 rounded-md bg-[var(--color-panel-2)] px-3 py-1 text-xs font-semibold text-[var(--color-ink)] border border-[var(--color-line-2)] transition-colors hover:border-[var(--color-line-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                    >
                      {station.name}
                      <LuX
                        aria-hidden="true"
                        className="text-[11px] text-[var(--color-ink-3)] transition-colors group-hover/chip:text-[var(--color-ink)]"
                      />
                    </button>
                  );
                })}
              </div>
            )}

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
                label: isEs ? 'Añadir estación' : 'Add station',
                onSelect: () => setPickerOpen(true),
              },
              ...(procedure.stationIds.length > 0
                ? [
                    {
                      label: isEs
                        ? 'Quitar todas las estaciones'
                        : 'Clear all stations',
                      onSelect: onClearStations,
                    },
                  ]
                : []),
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
            {isEs ? 'Asignar estaciones' : 'Assign stations'}
          </p>
          <ul className="space-y-0.5">
            {STATIONS.map((s) => {
              const checked = procedure.stationIds.includes(s.id);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    role="menuitemcheckbox"
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
                        'inline-flex size-5 items-center justify-center rounded-[var(--radius-sm)] border transition-colors',
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
              ? 'Sin selección = sin estación.'
              : 'No selection = no station.'}
          </p>
        </div>
      </Popover>
    </li>
  );
}
