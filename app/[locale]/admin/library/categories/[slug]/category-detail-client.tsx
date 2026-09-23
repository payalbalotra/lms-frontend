'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCategoryIcon } from '@/lib/category-icons';
import type { Category, Subcategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { RowActions } from '@/components/ui/row-actions';
import { StatusPill } from '@/components/ui/status-pill';
import { cn } from '@/lib/utils';
import { useUpdateCategory } from '@/services/categories/hooks';
import {
  LuArrowLeft,
  LuChevronRight,
  LuFileText,
  LuPlus,
  LuX,
  LuShieldCheck,
  LuLink,
  LuTag,
  LuShieldAlert,
  LuSparkles,
  LuClock,
} from 'react-icons/lu';

interface CategoryDetailClientProps {
  category: Category;
  locale: string;
}

const DEFAULT_STATIONS = [
  { id: 'stn-gm', code: 'GM', description: 'Cold section + fryer' },
  { id: 'stn-grill', code: 'Grill', description: 'Hot Line / Grill' },
  { id: 'stn-expo', code: 'Expo', description: 'Expo Station' },
  { id: 'stn-prep', code: 'Prep Kitchen', description: 'Prep & Cold Station' },
  { id: 'stn-dish', code: 'Dishwasher', description: 'Sanitation & Dish' },
];

/** Library-wide catalog of procedures already created in the system. The
 *  Add Procedure modal surfaces this list so the manager can pick one or
 *  many existing/draft procedures and link them into the subcategory
 *  without going through the wizard. Mirrors the wizard's Access-step
 *  station ids so any pre-fill there lines up. */
const EXISTING_PROCEDURES: Array<{
  id: string;
  slug: string;
  titleEn: string;
  titleEs: string;
  station: string;
  status: 'draft' | 'published';
  updatedAgoEn: string;
  updatedAgoEs: string;
}> = [
  { id: 'proc-001', slug: 'cold-section-plating-sop', titleEn: 'Cold Section Plating SOP', titleEs: 'Emplatado - Sección fría', station: 'st-gm', status: 'published', updatedAgoEn: 'Updated 2 days ago', updatedAgoEs: 'Actualizado hace 2 días' },
  { id: 'proc-002', slug: 'grill-plating-sop', titleEn: 'Grill Plating SOP', titleEs: 'Emplatado - Parrilla', station: 'st-grill', status: 'published', updatedAgoEn: 'Updated 3 days ago', updatedAgoEs: 'Actualizado hace 3 días' },
  { id: 'proc-003', slug: 'expo-plating-sop', titleEn: 'Expo Plating SOP', titleEs: 'Emplatado - Expo', station: 'st-expo', status: 'draft', updatedAgoEn: 'Draft · 4 hours ago', updatedAgoEs: 'Borrador · hace 4 horas' },
  { id: 'proc-004', slug: 'prep-kitchen-plating-sop', titleEn: 'Prep Kitchen Plating SOP', titleEs: 'Emplatado - Cocina de preparación', station: 'st-prep', status: 'published', updatedAgoEn: 'Updated 5 days ago', updatedAgoEs: 'Actualizado hace 5 días' },
  { id: 'proc-005', slug: 'hot-line-cooking-sop', titleEn: 'Hot Line Cooking SOP', titleEs: 'Cocción - Línea caliente', station: 'st-grill', status: 'draft', updatedAgoEn: 'Draft · yesterday', updatedAgoEs: 'Borrador · ayer' },
  { id: 'proc-006', slug: 'fryer-temperature-guide', titleEn: 'Fryer Temperature & Timing SOP', titleEs: 'Control de Temperatura de Freidora', station: 'st-gm', status: 'published', updatedAgoEn: 'Updated 3 days ago', updatedAgoEs: 'Actualizado hace 3 días' },
  { id: 'proc-007', slug: 'handwashing-sanitization-sop', titleEn: 'Handwashing & Personal Sanitization', titleEs: 'Lavado de Manos y Sanitización', station: 'General', status: 'published', updatedAgoEn: 'Updated 1 day ago', updatedAgoEs: 'Actualizado hace 1 día' },
  { id: 'proc-008', slug: 'surface-disinfection-sop', titleEn: 'Surface Disinfection Standard', titleEs: 'Estándar de Desinfección de Superficies', station: 'General', status: 'draft', updatedAgoEn: 'Draft · 2 days ago', updatedAgoEs: 'Borrador · hace 2 días' },
  { id: 'proc-009', slug: 'knife-safety-sop', titleEn: 'Knife Safety & Sharpening SOP', titleEs: 'Seguridad con Cuchillos y Afilado', station: 'st-prep', status: 'published', updatedAgoEn: 'Updated 6 days ago', updatedAgoEs: 'Actualizado hace 6 días' },
  { id: 'proc-010', slug: 'walk-in-cooler-temps', titleEn: 'Walk-in Cooler Temperature Log', titleEs: 'Registro de Temperatura del Refrigerador', station: 'st-gm', status: 'published', updatedAgoEn: 'Updated 2 days ago', updatedAgoEs: 'Actualizado hace 2 días' },
  { id: 'proc-011', slug: 'opening-lineup-sop', titleEn: 'Opening Lineup & Roll Call', titleEs: 'Alineación de Apertura y Pase de Lista', station: 'st-expo', status: 'draft', updatedAgoEn: 'Draft · 6 hours ago', updatedAgoEs: 'Borrador · hace 6 horas' },
  { id: 'proc-012', slug: 'closing-cleanup-sop', titleEn: 'Closing Cleanup & Equipment Shutdown', titleEs: 'Limpieza de Cierre y Apagado de Equipo', station: 'st-dish', status: 'published', updatedAgoEn: 'Updated 3 days ago', updatedAgoEs: 'Actualizado hace 3 días' },
];

const PROCEDURES_BY_SUBCATEGORY: Record<
  string,
  Array<{ id: string; slug: string; titleEn: string; titleEs: string; station: string; updatedAgoEn: string; updatedAgoEs: string }>
> = {
  plating: [
    {
      id: 'proc-p1',
      slug: 'cold-section-plating-sop',
      titleEn: 'Cold Section Plating SOP',
      titleEs: 'Emplatado - Sección fría',
      station: 'GM',
      updatedAgoEn: 'Updated 2 days ago',
      updatedAgoEs: 'Actualizado hace 2 días',
    },
    {
      id: 'proc-p2',
      slug: 'grill-plating-sop',
      titleEn: 'Grill Plating SOP',
      titleEs: 'Emplatado - Parrilla',
      station: 'Grill',
      updatedAgoEn: 'Updated 3 days ago',
      updatedAgoEs: 'Actualizado hace 3 días',
    },
    {
      id: 'proc-p3',
      slug: 'expo-plating-sop',
      titleEn: 'Expo Plating SOP',
      titleEs: 'Emplatado - Expo',
      station: 'Expo',
      updatedAgoEn: 'Updated 4 days ago',
      updatedAgoEs: 'Actualizado hace 4 días',
    },
    {
      id: 'proc-p4',
      slug: 'prep-kitchen-plating-sop',
      titleEn: 'Prep Kitchen Plating SOP',
      titleEs: 'Emplatado - Cocina de preparación',
      station: 'Prep Kitchen',
      updatedAgoEn: 'Updated 5 days ago',
      updatedAgoEs: 'Actualizado hace 5 días',
    },
  ],
  cooking: [
    {
      id: 'proc-c1',
      slug: 'hot-line-cooking-sop',
      titleEn: 'Hot Line Cooking SOP',
      titleEs: 'Cocción - Línea caliente',
      station: 'Grill',
      updatedAgoEn: 'Updated 1 day ago',
      updatedAgoEs: 'Actualizado hace 1 día',
    },
    {
      id: 'proc-c2',
      slug: 'fryer-temperature-guide',
      titleEn: 'Fryer Temperature & Timing SOP',
      titleEs: 'Control de Temperatura de Freidora',
      station: 'GM',
      updatedAgoEn: 'Updated 3 days ago',
      updatedAgoEs: 'Actualizado hace 3 días',
    },
  ],
  hygiene: [
    {
      id: 'proc-h1',
      slug: 'handwashing-sanitization-sop',
      titleEn: 'Handwashing & Personal Sanitization',
      titleEs: 'Lavado de Manos y Sanitización',
      station: 'General',
      updatedAgoEn: 'Updated 1 day ago',
      updatedAgoEs: 'Actualizado hace 1 día',
    },
    {
      id: 'proc-h2',
      slug: 'surface-disinfection-sop',
      titleEn: 'Surface Disinfection Standard',
      titleEs: 'Estándar de Desinfección de Superficies',
      station: 'General',
      updatedAgoEn: 'Updated 4 days ago',
      updatedAgoEs: 'Actualizado hace 4 días',
    },
  ],
};

function getSubcategoryIcon(slug: string, index: number) {
  if (slug.includes('hygiene')) return LuShieldCheck;
  if (slug.includes('cross') || slug.includes('link')) return LuLink;
  if (slug.includes('label') || slug.includes('tag')) return LuTag;
  if (slug.includes('allerg')) return LuShieldAlert;
  const icons = [LuShieldCheck, LuLink, LuTag, LuShieldAlert, LuSparkles];
  return icons[index % icons.length];
}

export function CategoryDetailClient({
  category: initialCategory,
  locale,
}: CategoryDetailClientProps): React.ReactElement {
  const router = useRouter();
  const isEs = locale === 'es';
  const [category, setCategory] = React.useState<Category>(initialCategory);
  const [addSubOpen, setAddSubOpen] = React.useState(false);
  const [editingSub, setEditingSub] = React.useState<Subcategory | null>(null);

  // State for the single expanded subcategory (accordion). One open at a time —
  // multi-expand fragments the manager's focus and turns the panel into a list.
  const [expandedSubSlug, setExpandedSubSlug] = React.useState<string | null>(() => {
    return initialCategory.subcategories?.[0]?.slug ?? null;
  });

  const toggleExpand = (subSlug: string) => {
    setExpandedSubSlug((prev) => (prev === subSlug ? null : subSlug));
  };

  const updateMutation = useUpdateCategory();
  const subcategories = category.subcategories ?? [];
  const totalProcedures = subcategories.length > 0 ? subcategories.length * 5 + 4 : 0;

  // Procedures the manager has linked into a subcategory via the "Add
  // procedure" modal. Keyed by subcategory slug. Linked procedures are
  // appended in front of the per-slug fixtures so they appear at the top of
  // the expanded panel; deduped by id so re-linking is a no-op.
  const [linkedProceduresBySubSlug, setLinkedProceduresBySubSlug] = React.useState<
    Record<string, typeof EXISTING_PROCEDURES>
  >({});

  // Subcategory the manager is acting on via the Add Procedure modal.
  const [linkProceduresSub, setLinkProceduresSub] = React.useState<Subcategory | null>(null);

  async function handleSaveSubcategory(newSub: {
    nameEn: string;
    nameEs: string;
    isStationSpecific: boolean;
    stations?: string[];
  }) {
    const updatedSubs = [...subcategories];
    if (editingSub) {
      const idx = updatedSubs.findIndex((s) => s.id === editingSub.id || s.slug === editingSub.slug);
      if (idx !== -1) {
        updatedSubs[idx] = {
          ...updatedSubs[idx],
          nameEn: newSub.nameEn,
          nameEs: newSub.nameEs,
          isStationSpecific: newSub.isStationSpecific,
          stations: newSub.isStationSpecific ? newSub.stations ?? [] : undefined,
        };
      }
    } else {
      const slug = newSub.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      updatedSubs.push({
        id: `sub-${Date.now()}`,
        slug,
        nameEn: newSub.nameEn,
        nameEs: newSub.nameEs || newSub.nameEn,
        isStationSpecific: newSub.isStationSpecific,
        stations: newSub.isStationSpecific ? newSub.stations ?? [] : undefined,
      });
    }

    try {
      await updateMutation.mutateAsync({
        id: category.id,
        input: {
          subcategories: updatedSubs.map((s) => ({
            nameEn: s.nameEn,
            nameEs: s.nameEs,
            isStationSpecific: s.isStationSpecific,
          })),
        },
      });
      setCategory((prev) => ({ ...prev, subcategories: updatedSubs }));
    } catch {
      // Optimistic state preserved
    }
  }

  const [stationPickerSub, setStationPickerSub] = React.useState<Subcategory | null>(null);

  async function handleSaveStations(subToUpdate: Subcategory, selectedStations: string[]) {
    const updatedSubs = subcategories.map((s) =>
      s.id === subToUpdate.id || s.slug === subToUpdate.slug
        ? { ...s, stations: selectedStations, isStationSpecific: true }
        : s
    );

    try {
      await updateMutation.mutateAsync({
        id: category.id,
        input: {
          subcategories: updatedSubs.map((s) => ({
            nameEn: s.nameEn,
            nameEs: s.nameEs,
            isStationSpecific: s.isStationSpecific,
          })),
        },
      });
      setCategory((prev) => ({ ...prev, subcategories: updatedSubs }));
    } catch {
      // Optimistic state preserved
    }
  }

  return (
    <div className="mx-auto max-w-page space-y-4 pb-12">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--color-ink-3)] font-medium">
        <Link
          href={`/${locale}/admin/library/categories`}
          className="hover:text-[var(--color-ink)] transition-colors flex items-center gap-1"
        >
          <LuArrowLeft className="text-sm" />
          <span>{isEs ? 'Categorías' : 'Categories'}</span>
        </Link>
        <LuChevronRight className="text-[10px] text-[var(--color-ink-3)]" />
        <span className="text-[var(--color-ink)] font-semibold">
          {isEs ? category.nameEs : category.nameEn}
        </span>
      </nav>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-line)] pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-panel)] text-[var(--color-ink-2)] text-xl border border-[var(--color-line-2)]"
          >
            <Icon icon={getCategoryIcon(category)} />
          </span>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--color-ink)]">
              {isEs ? category.nameEs : category.nameEn}
            </h1>
            <p className="text-xs text-[var(--color-ink-3)] font-medium">
              {subcategories.length}{' '}
              {isEs ? (subcategories.length === 1 ? 'subcategoría' : 'subcategorías') : (subcategories.length === 1 ? 'subcategory' : 'subcategories')}
              {totalProcedures > 0 && ` · ${totalProcedures} ${isEs ? 'procedimientos' : 'procedures'}`}
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setEditingSub(null);
            setAddSubOpen(true);
          }}
          className="shrink-0 font-semibold shadow-2xs"
        >
          <LuPlus className="text-base" />
          <span>{isEs ? 'Añadir subcategoría' : 'Add subcategory'}</span>
        </Button>
      </div>

      {/* Subcategories List */}
      {subcategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] p-10 text-center">
          <p className="text-xs text-[var(--color-ink-2)] mb-3">
            {isEs
              ? 'Esta categoría aún no tiene subcategorías.'
              : 'This category does not have subcategories yet.'}
          </p>
          <Button variant="neutral" icon={LuPlus} onClick={() => setAddSubOpen(true)} className="text-xs">
            {isEs ? 'Crear la primera subcategoría' : 'Create first subcategory'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {subcategories.map((sub, index) => {
            const isExpanded = expandedSubSlug === sub.slug;
            const isGeneral = !sub.isStationSpecific;
            const SubIcon = getSubcategoryIcon(sub.slug, index);
            const panelId = `subcategory-panel-${sub.id || sub.slug}`;
            const headerId = `subcategory-header-${sub.id || sub.slug}`;

            // Resolve the visible procedure list: linked procedures (added via
            // the Add Procedure modal) first, then the per-slug fixtures as
            // the implicit starter pack. Dedupe by id so re-linking never
            // duplicates a row.
            const linked = linkedProceduresBySubSlug[sub.slug] ?? [];
            const fixtures =
              PROCEDURES_BY_SUBCATEGORY[sub.slug] ?? [
                {
                  id: `proc-${sub.slug}-1`,
                  slug: `${sub.slug}-standard-sop`,
                  titleEn: `${sub.nameEn} Standard Operating Procedure`,
                  titleEs: `Procedimiento de ${sub.nameEs}`,
                  station: isGeneral ? 'General' : (sub.stations?.[0] ?? 'GM'),
                  updatedAgoEn: 'Updated 2 days ago',
                  updatedAgoEs: 'Actualizado hace 2 días',
                },
                {
                  id: `proc-${sub.slug}-2`,
                  slug: `${sub.slug}-safety-sop`,
                  titleEn: `${sub.nameEn} Safety Checklist`,
                  titleEs: `Lista de Seguridad de ${sub.nameEs}`,
                  station: isGeneral ? 'General' : (sub.stations?.[1] ?? 'Grill'),
                  updatedAgoEn: 'Updated 4 days ago',
                  updatedAgoEs: 'Actualizado hace 4 días',
                },
              ];
            const seen = new Set(linked.map((p) => p.id));
            const procedures = [
              ...linked,
              ...fixtures.filter((p) => !seen.has(p.id)),
            ];

            const stationCodes = sub.stations ?? (isGeneral ? [] : ['GM', 'Grill', 'Expo']);
            const visibleStations = stationCodes.slice(0, 3);
            const hiddenStationCount = stationCodes.length - visibleStations.length;
            const procedureLabel = isEs ? 'procedimientos' : 'procedures';

            return (
              <div
                key={sub.id || sub.slug}
                className={cn(
                  'rounded-[var(--radius-lg)] border bg-[var(--color-surface)] shadow-2xs overflow-hidden transition-colors',
                  isExpanded ? 'border-[var(--color-line-2)]' : 'border-[var(--color-line-2)]',
                )}
              >
                {/* Subcategory Row Header — div with role=button so the RowActions
                    button can live inside without nesting <button> in <button>. */}
                <div
                  id={headerId}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  onClick={() => toggleExpand(sub.slug)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpand(sub.slug);
                    }
                  }}
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-inset',
                    isExpanded
                      ? 'bg-[var(--color-wash)]'
                      : 'hover:bg-[var(--color-wash)]',
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      aria-hidden="true"
                      className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-panel)] text-[var(--color-ink-2)] text-base"
                    >
                      <SubIcon />
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <h2 className="text-base font-semibold tracking-tight text-[var(--color-ink)] truncate">
                          {isEs ? sub.nameEs : sub.nameEn}
                        </h2>
                        {sub.nameEs !== sub.nameEn && (
                          <span className="text-xs text-[var(--color-ink-3)] font-normal truncate hidden sm:inline">
                            ({isEs ? sub.nameEn : sub.nameEs})
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--color-ink-3)] truncate">
                        {procedures.length} {procedureLabel}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 sm:gap-4 shrink-0 pl-3">
                    {!isExpanded && !isGeneral && visibleStations.length > 0 && (
                      <div className="hidden sm:flex items-center gap-2 flex-wrap mr-1">
                        {visibleStations.map((code) => (
                          <span
                            key={code}
                            onClick={(e) => {
                              e.stopPropagation();
                              setStationPickerSub(sub);
                            }}
                            className="cursor-pointer inline-flex min-w-[36px] h-6 items-center justify-center px-2.5 text-[11px] font-semibold tracking-[0.02em] leading-none rounded-md bg-[var(--color-panel-2)] text-[var(--color-ink)] border border-[var(--color-line-2)] shadow-2xs hover:bg-[var(--color-panel)] transition-colors"
                          >
                            {code}
                          </span>
                        ))}
                        {hiddenStationCount > 0 && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setStationPickerSub(sub);
                            }}
                            className="cursor-pointer inline-flex min-w-[32px] h-6 items-center justify-center px-2 text-[11px] font-medium leading-none rounded-md bg-[var(--color-panel)] text-[var(--color-ink-3)] border border-[var(--color-line)]"
                          >
                            +{hiddenStationCount}
                          </span>
                        )}
                      </div>
                    )}

                    {!isExpanded && isGeneral && (
                      <div className="hidden sm:flex items-center gap-2 flex-wrap mr-1">
                        <span className="inline-flex h-6 items-center justify-center px-2.5 text-[11px] font-medium leading-none rounded-md bg-[var(--color-panel)] text-[var(--color-ink-2)] border border-[var(--color-line)]">
                          {isEs ? 'General' : 'General'}
                        </span>
                      </div>
                    )}
                    <RowActions
                      items={[
                        {
                          label: isEs ? 'Añadir procedimiento' : 'Add procedure',
                          onSelect: () => setLinkProceduresSub(sub),
                        },
                        {
                          label: isEs ? 'Vincular estaciones' : 'Link stations',
                          onSelect: () => setStationPickerSub(sub),
                        },
                        {
                          label: isEs ? 'Editar subcategoría' : 'Edit subcategory',
                          onSelect: () => {
                            setEditingSub(sub);
                            setAddSubOpen(true);
                          },
                        },
                      ]}
                      triggerLabel={sub.nameEn}
                    />

                    <LuChevronRight
                      aria-hidden="true"
                      className={cn(
                        'size-4 shrink-0 text-[var(--color-ink-3)] transition-transform',
                        isExpanded && 'rotate-90 text-[var(--color-ink-2)]',
                      )}
                    />
                  </div>
                </div>

                {/* Expanded Inline Procedures Panel */}
                {isExpanded && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={headerId}
                    className="border-t border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 space-y-3"
                  >
                    {/* Toolbar */}
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] pb-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-3)]">
                        {isEs ? 'Procedimientos' : 'Procedures'}
                      </h3>

                      <button
                        type="button"
                        onClick={() => setLinkProceduresSub(sub)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]"
                      >
                        <LuPlus className="text-sm" />
                        {isEs ? 'Add procedure' : 'Add procedure'}
                      </button>
                    </div>

                    {/* Procedure items list */}
                    {procedures.length === 0 ? (
                      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 text-center text-xs text-[var(--color-ink-3)]">
                        {isEs ? 'Sin procedimientos aún en esta subcategoría.' : 'No procedures added yet in this subcategory.'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {procedures.map((proc) => (
                          <div
                            key={proc.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => router.push(`/${locale}/admin/library/${proc.slug}`)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                router.push(`/${locale}/admin/library/${proc.slug}`);
                              }
                            }}
                            className="group flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-3 transition-colors cursor-pointer hover:bg-[var(--color-wash)] hover:border-[var(--color-line)] min-h-12"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <span
                                aria-hidden="true"
                                className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-panel)] text-[var(--color-ink-2)] text-sm transition-colors group-hover:text-[var(--color-ink)]"
                              >
                                <LuFileText />
                              </span>
                              <div className="min-w-0">
                                <h4 className="truncate text-sm font-semibold text-[var(--color-ink)]">
                                  {proc.titleEn}
                                </h4>
                                <p className="truncate text-xs text-[var(--color-ink-3)]">
                                  {proc.titleEs}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0 pl-2" onClick={(e) => e.stopPropagation()}>
                              {proc.station !== 'General' && (
                                <StatusPill
                                  tone="info"
                                  className="hidden sm:inline-flex"
                                >
                                  {proc.station}
                                </StatusPill>
                              )}
                              <span className="hidden md:inline-flex items-center gap-1 text-xs text-[var(--color-ink-3)] font-medium">
                                <LuClock className="text-xs" />
                                {isEs ? proc.updatedAgoEs : proc.updatedAgoEn}
                              </span>
                              <RowActions
                                items={[
                                  {
                                    label: isEs ? 'Ver procedimiento' : 'View procedure',
                                    onSelect: () => router.push(`/${locale}/admin/library/${proc.slug}`),
                                  },
                                  {
                                    label: isEs ? 'Editar' : 'Edit',
                                    onSelect: () => router.push(`/${locale}/admin/library/${proc.slug}/edit`),
                                  },
                                ]}
                                triggerLabel={proc.titleEn}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Subcategory Add/Edit Modal */}
      <Modal open={addSubOpen} onClose={() => setAddSubOpen(false)} size="md">
        <SubcategoryForm
          isEs={isEs}
          editingSub={editingSub}
          onSave={(data) => {
            void handleSaveSubcategory(data);
            setAddSubOpen(false);
          }}
          onCancel={() => setAddSubOpen(false)}
        />
      </Modal>

      {/* Station Picker Modal */}
      <Modal open={Boolean(stationPickerSub)} onClose={() => setStationPickerSub(null)} size="md">
        {stationPickerSub && (
          <StationPickerModal
            isEs={isEs}
            sub={stationPickerSub}
            onSave={(selectedStations) => {
              void handleSaveStations(stationPickerSub, selectedStations);
              setStationPickerSub(null);
            }}
            onCancel={() => setStationPickerSub(null)}
          />
        )}
      </Modal>

      {/* Add Procedure Modal — opens from the "Add procedure" toolbar and
          the row-action menu. Two flows:
          (1) Pick existing/draft procedures from the catalog and link them
              into the subcategory (no wizard, instant).
          (2) Click "Create new" to launch the wizard with category +
              subcategory + access (location, stations) pre-filled. */}
      <Modal open={Boolean(linkProceduresSub)} onClose={() => setLinkProceduresSub(null)} size="lg">
        {linkProceduresSub && (
          <AddProcedureModal
            isEs={isEs}
            category={category}
            sub={linkProceduresSub}
            alreadyLinkedIds={new Set(
              (linkedProceduresBySubSlug[linkProceduresSub.slug] ?? []).map((p) => p.id),
            )}
            onAddExisting={(selected) => {
              const target = linkProceduresSub;
              setLinkedProceduresBySubSlug((prev) => {
                const existing = prev[target.slug] ?? [];
                const seen = new Set(existing.map((p) => p.id));
                const merged = [...existing, ...selected.filter((p) => !seen.has(p.id))];
                return { ...prev, [target.slug]: merged };
              });
              setLinkProceduresSub(null);
            }}
            onCreateNew={() => {
              const target = linkProceduresSub;
              // Translate subcategory station ids (e.g. `stn-gm`) into the
              // wizard's ACCESS_STATIONS ids (e.g. `st-gm`) so the Access
              // step's pre-fill lands on the right checkboxes. The mapping
              // strips the trailing `n`; real backend ids will replace both
              // sides once we wire the fixtures to the database.
              const accessStations = (target.stations ?? [])
                .map((id) => id.replace(/^stn-/, 'st-'))
                .join(',');
              setLinkProceduresSub(null);
              router.push(
                `/${locale}/admin/library/new?category=${category.slug}&subcategory=${target.slug}&accessLocation=loc-main&accessStations=${encodeURIComponent(accessStations)}`,
              );
            }}
            onCancel={() => setLinkProceduresSub(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function AddProcedureModal({
  isEs,
  category,
  sub,
  alreadyLinkedIds,
  onAddExisting,
  onCreateNew,
  onCancel,
}: {
  isEs: boolean;
  category: Category;
  sub: Subcategory;
  alreadyLinkedIds: Set<string>;
  onAddExisting: (selected: typeof EXISTING_PROCEDURES) => void;
  onCreateNew: () => void;
  onCancel: () => void;
}): React.ReactElement {
  const [search, setSearch] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const subName = isEs ? sub.nameEs || sub.nameEn : sub.nameEn;
  const catName = isEs ? category.nameEs : category.nameEn;

  // Only draft procedures can be linked to a subcategory from this modal.
  // A published procedure already lives somewhere in the library, so
  // surfacing it here would let the manager create duplicates. The
  // search filter narrows by title or station; case-insensitive; trims
  // whitespace.
  const draftCatalog = React.useMemo(
    () => EXISTING_PROCEDURES.filter((p) => p.status === 'draft'),
    [],
  );
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return draftCatalog;
    return draftCatalog.filter(
      (p) =>
        p.titleEn.toLowerCase().includes(q) ||
        p.titleEs.toLowerCase().includes(q) ||
        p.station.toLowerCase().includes(q),
    );
  }, [search, draftCatalog]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canAdd = selectedIds.size > 0;

  return (
    <div className="flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] p-5 pb-4 shrink-0">
        <div className="flex items-start gap-3 min-w-0">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-panel)] text-[var(--color-ink-2)] text-base">
            <LuFileText />
          </span>
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-[var(--color-ink)]">
              {isEs ? 'Añadir procedimiento' : 'Add procedure'}
            </h2>
            <p className="text-xs text-[var(--color-ink-3)] mt-0.5">
              {isEs
                ? 'Vincula uno o varios procedimientos existentes o crea uno nuevo.'
                : 'Link one or several existing procedures, or create a new one.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label={isEs ? 'Cerrar' : 'Close'}
          className="flex size-7 items-center justify-center rounded-md text-[var(--color-ink-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]"
        >
          <LuX className="text-lg" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* EXISTING PROCEDURES — pick to link */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-3)]">
              {isEs ? 'Procedimientos existentes' : 'Existing procedures'}
            </p>
            <span className="shrink-0 text-xs font-medium text-[var(--color-ink-3)]">
              {selectedIds.size > 0
                ? isEs
                  ? `${selectedIds.size} seleccionado${selectedIds.size === 1 ? '' : 's'}`
                  : `${selectedIds.size} selected`
                : isEs
                  ? `${filtered.length} disponible${filtered.length === 1 ? '' : 's'}`
                  : `${filtered.length} available`}
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <LuFileText className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-3)]" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isEs ? 'Buscar procedimientos…' : 'Search procedures…'}
              className="h-9 pl-9 pr-9 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label={isEs ? 'Limpiar búsqueda' : 'Clear search'}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex size-6 items-center justify-center rounded-md text-[var(--color-ink-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]"
              >
                <LuX className="text-sm" />
              </button>
            )}
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-6 text-center text-xs text-[var(--color-ink-3)]">
              {isEs
                ? 'No hay procedimientos que coincidan con la búsqueda.'
                : 'No procedures match the search.'}
            </div>
          ) : (
            <div
              role="listbox"
              aria-multiselectable="true"
              aria-label={isEs ? 'Procedimientos existentes' : 'Existing procedures'}
              className="max-h-[260px] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] divide-y divide-[var(--color-line)]"
            >
              {filtered.map((proc) => {
                const isChecked = selectedIds.has(proc.id);
                const isAlreadyLinked = alreadyLinkedIds.has(proc.id);
                return (
                  <label
                    key={proc.id}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 min-h-12 cursor-pointer transition-colors',
                      isChecked
                        ? 'bg-[var(--color-brand-tint)]'
                        : 'hover:bg-[var(--color-wash)]',
                      isAlreadyLinked && 'opacity-60',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isAlreadyLinked}
                      onChange={() => toggle(proc.id)}
                      aria-label={proc.titleEn}
                      className="size-4 shrink-0 accent-[var(--color-brand-600)] disabled:cursor-not-allowed"
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border text-sm',
                        isChecked
                          ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white'
                          : 'border-[var(--color-line-2)] bg-[var(--color-panel)] text-[var(--color-ink-2)]',
                      )}
                    >
                      <LuFileText />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-[var(--color-ink)]">
                          {proc.titleEn}
                        </span>
                        <span
                          className={cn(
                            'inline-flex h-5 items-center px-2 text-[10px] font-semibold uppercase tracking-wider rounded-md border',
                            proc.status === 'draft'
                              ? 'bg-[var(--color-warn-tint)] text-[var(--color-warn-ink)] border-[var(--color-warn)]/30'
                              : 'bg-[var(--color-ok-tint)] text-[var(--color-ok)] border-[var(--color-ok)]/30',
                          )}
                        >
                          {proc.status === 'draft' ? (isEs ? 'Borrador' : 'Draft') : (isEs ? 'Publicado' : 'Published')}
                        </span>
                        {isAlreadyLinked && (
                          <span className="inline-flex h-5 items-center px-2 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-[var(--color-panel)] text-[var(--color-ink-3)] border border-[var(--color-line-2)]">
                            {isEs ? 'Vinculado' : 'Linked'}
                          </span>
                        )}
                      </div>
                      <span className="block truncate text-xs text-[var(--color-ink-3)]">
                        {proc.titleEs}
                      </span>
                    </div>
                    {proc.station !== 'General' && (
                      <StatusPill tone="neutral">
                        {proc.station.replace(/^st-/, '')}
                      </StatusPill>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </section>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--color-line)]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-3)]">
            {isEs ? 'O crea uno nuevo' : 'Or create a new one'}
          </span>
          <div className="h-px flex-1 bg-[var(--color-line)]" />
        </div>

        {/* NEW PROCEDURE — locked target summary */}
        <section className="space-y-3">
          <div className="space-y-3">
            {/* Category row */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-3)]">
                {isEs ? 'Categoría' : 'Category'}
              </p>
              <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 min-h-9">
                <span
                  aria-hidden="true"
                  className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-panel)] text-[var(--color-ink-2)] text-xs border border-[var(--color-line-2)]"
                >
                  <Icon icon={getCategoryIcon(category)} />
                </span>
                <span className="text-sm font-semibold text-[var(--color-ink)] truncate">
                  {catName}
                </span>
              </div>
            </div>

            {/* Subcategory row */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-3)]">
                {isEs ? 'Subcategoría' : 'Subcategory'}
              </p>
              <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 min-h-9">
                <span
                  aria-hidden="true"
                  className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-panel)] text-[var(--color-ink-2)] text-xs border border-[var(--color-line-2)]"
                >
                  <LuLink />
                </span>
                <span className="text-sm font-semibold text-[var(--color-ink)] truncate">
                  {subName}
                </span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[var(--color-ink-3)]">
            {isEs
              ? `La categoría, subcategoría${sub.stations?.length ? ' y las estaciones' : ''} se rellenarán automáticamente.`
              : `Category, subcategory${sub.stations?.length ? ' and stations' : ''} will be filled in automatically.`}
          </p>
        </section>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-[var(--color-line)] bg-[var(--color-wash)] px-5 py-3 shrink-0">
        <Button
          type="button"
          variant="neutral"
          onClick={onCancel}
          className="px-4 text-xs font-semibold"
        >
          {isEs ? 'Cancelar' : 'Cancel'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCreateNew}
          className="px-4 text-xs font-semibold"
        >
          <LuPlus className="text-sm" />
          {isEs ? 'Crear nuevo' : 'Create new'}
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={!canAdd}
          onClick={() => {
            const selected = draftCatalog.filter((p) => selectedIds.has(p.id));
            onAddExisting(selected);
          }}
        >
          {isEs
            ? `Añadir ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`
            : `Add ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`}
        </Button>
      </div>
    </div>
  );
}

function StationPickerModal({
  isEs,
  sub,
  onSave,
  onCancel,
}: {
  isEs: boolean;
  sub: Subcategory;
  onSave: (selectedStationCodes: string[]) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = React.useState<string[]>(
    sub.stations ?? ['GM', 'Grill', 'Expo']
  );

  const toggleStation = (code: string) => {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-line)] p-5 pb-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-[var(--color-ink)]">
            {isEs ? 'Vincular estaciones' : 'Link stations'}
          </h2>
          <p className="text-xs text-[var(--color-ink-3)] mt-0.5">
            {isEs
              ? `Selecciona las estaciones para "${sub.nameEs || sub.nameEn}"`
              : `Select stations for "${sub.nameEn}"`}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="flex size-7 items-center justify-center rounded-md text-[var(--color-ink-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]"
        >
          <LuX className="text-lg" />
        </button>
      </div>

      <div className="p-5 space-y-3">
        <p className="text-[11px] font-semibold text-[var(--color-ink-3)] uppercase tracking-wider">
          {isEs ? 'Estaciones disponibles' : 'Available stations'}
        </p>
        <div className="space-y-2">
          {DEFAULT_STATIONS.map((stn) => {
            const isChecked = selected.includes(stn.code);
            return (
              <div
                key={stn.id}
                onClick={() => toggleStation(stn.code)}
                className={cn(
                  'flex items-center justify-between p-3 rounded-[var(--radius-md)] border cursor-pointer transition-all text-xs',
                  isChecked
                    ? 'border-[var(--color-brand-600)] bg-[var(--color-surface)] ring-1 ring-[var(--color-brand-600)]/20'
                    : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:bg-[var(--color-wash)]'
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'inline-flex min-w-[36px] h-6 items-center justify-center px-2.5 text-[11px] font-semibold tracking-[0.02em] leading-none rounded-md border transition-colors shadow-2xs',
                      isChecked
                        ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] border-[var(--color-brand-600)]/30'
                        : 'bg-[var(--color-panel-2)] text-[var(--color-ink)] border-[var(--color-line-2)]'
                    )}
                  >
                    {stn.code}
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-ink)]">{stn.code}</span>
                  <span className="text-xs font-normal text-[var(--color-ink-3)]">{stn.description}</span>
                </div>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}}
                  className="size-4 rounded text-[var(--color-brand-600)] accent-[var(--color-brand-600)]"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2.5 border-t border-[var(--color-line)] bg-[var(--color-wash)] px-5 py-3">
        <Button type="button" variant="neutral" onClick={onCancel}>
          {isEs ? 'Cancelar' : 'Cancel'}
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={() => onSave(selected)}
        >
          {isEs ? 'Guardar estaciones' : 'Save stations'}
        </Button>
      </div>
    </div>
  );
}

function SubcategoryForm({
  isEs,
  editingSub,
  onSave,
  onCancel,
}: {
  isEs: boolean;
  editingSub: Subcategory | null;
  onSave: (data: { nameEn: string; nameEs: string; isStationSpecific: boolean; stations: string[] }) => void;
  onCancel: () => void;
}) {
  const [nameEn, setNameEn] = React.useState(editingSub?.nameEn ?? '');
  const [nameEs, setNameEs] = React.useState(editingSub?.nameEs ?? '');
  const [isStationSpecific, setIsStationSpecific] = React.useState(
    Boolean(editingSub?.isStationSpecific)
  );
  const [stations, setStations] = React.useState<string[]>(editingSub?.stations ?? []);

  const trimmedEn = nameEn.trim();
  const trimmedEs = nameEs.trim();
  const enValid = trimmedEn.length > 0 && trimmedEn.length <= 100;
  const esValid = trimmedEs.length <= 100;
  const stationsValid = !isStationSpecific || stations.length > 0;
  const canSubmit = enValid && esValid && stationsValid;

  const toggleStation = (code: string) => {
    setStations((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSave({
          nameEn: trimmedEn,
          nameEs: trimmedEs,
          isStationSpecific,
          stations: isStationSpecific ? stations : [],
        });
      }}
      className="flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-line)] p-5 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-panel)] text-[var(--color-ink-2)] text-base">
            <LuLink />
          </span>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-[var(--color-ink)]">
              {editingSub
                ? isEs
                  ? 'Editar subcategoría'
                  : 'Edit subcategory'
                : isEs
                  ? 'Crear subcategoría'
                  : 'Create subcategory'}
            </h2>
            <p className="text-xs text-[var(--color-ink-3)] mt-0.5">
              {isEs
                ? 'Organiza procedimientos dentro de esta categoría.'
                : 'Organize procedures within this category.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label={isEs ? 'Cerrar' : 'Close'}
          className="flex size-7 items-center justify-center rounded-md text-[var(--color-ink-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]"
        >
          <LuX className="text-lg" />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        {/* CATEGORY DETAILS */}
        <section className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-3)]">
            {isEs ? 'Detalles de la categoría' : 'Category details'}
          </p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sub-name-en" className="text-xs font-semibold text-[var(--color-ink)]">
                {isEs ? 'Nombre (Inglés)' : 'Name (English)'}{' '}
                <span className="text-[var(--color-bad)]">*</span>
              </Label>
              <Input
                id="sub-name-en"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value.slice(0, 100))}
                placeholder="e.g. Hygiene"
                required
                maxLength={100}
                autoFocus
                aria-invalid={nameEn.length > 0 && !enValid}
                className="h-9 text-xs"
              />
              {nameEn.length > 90 && (
                <p className="text-[11px] text-[var(--color-ink-3)]">
                  {100 - nameEn.length} {isEs ? 'caracteres restantes' : 'characters left'}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-name-es" className="text-xs font-semibold text-[var(--color-ink)]">
                {isEs ? 'Nombre (Español)' : 'Name (Spanish)'}{' '}
                <span className="text-xs font-normal text-[var(--color-ink-3)]">(optional)</span>
              </Label>
              <Input
                id="sub-name-es"
                value={nameEs}
                onChange={(e) => setNameEs(e.target.value.slice(0, 100))}
                placeholder="e.g. Higiene"
                maxLength={100}
                aria-invalid={nameEs.length > 0 && !esValid}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-[var(--color-ink-3)]">
                {isEs
                  ? 'Se muestra cuando la biblioteca se ve en español.'
                  : 'Used when the library is viewed in Spanish.'}
              </p>
            </div>
          </div>
        </section>

        {/* SCOPE */}
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-3)]">
            {isEs ? 'Alcance' : 'Scope'}
          </p>

          <div role="radiogroup" aria-label={isEs ? 'Alcance' : 'Scope'} className="space-y-2">
            <ScopeCard
              checked={!isStationSpecific}
              onSelect={() => {
                setIsStationSpecific(false);
                setStations([]);
              }}
              title={isEs ? 'General' : 'General'}
              description={isEs
                ? 'Aplica a todas las estaciones.'
                : 'Applies to all stations.'}
              isEs={isEs}
            />
            <ScopeCard
              checked={isStationSpecific}
              onSelect={() => setIsStationSpecific(true)}
              title={isEs ? 'Específico de estación' : 'Station-specific'}
              description={isEs
                ? 'Solo aparece en las estaciones seleccionadas.'
                : 'Only appears for selected stations.'}
              isEs={isEs}
            />
          </div>

          {isStationSpecific && (
            <div className="space-y-3 pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-3)]">
                {isEs ? 'Estaciones' : 'Stations'}
                <span className="ml-1 normal-case tracking-normal text-[var(--color-bad)]">*</span>
              </p>

              <div
                role="group"
                aria-label={isEs ? 'Estaciones' : 'Stations'}
                className="rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-1.5"
              >
                {DEFAULT_STATIONS.map((stn) => {
                  const isChecked = stations.includes(stn.code);
                  return (
                    <label
                      key={stn.id}
                      className="flex items-center gap-3 rounded-[var(--radius-sm)] px-3 min-h-9 cursor-pointer hover:bg-[var(--color-wash)] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStation(stn.code)}
                        className="size-4 shrink-0 accent-[var(--color-brand-600)]"
                      />
                      <span className="inline-flex w-[88px] shrink-0 items-center justify-center h-5 px-2 rounded-md text-[11px] font-semibold border border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-ink)] leading-none">
                        {stn.code}
                      </span>
                      <span className="text-xs font-normal text-[var(--color-ink-3)] truncate">
                        {stn.description}
                      </span>
                    </label>
                  );
                })}
              </div>

              <p className="text-[11px] text-[var(--color-ink-3)]">
                {stations.length === 0
                  ? isEs
                    ? 'Selecciona al menos una estación.'
                    : 'Select at least one station.'
                  : isEs
                    ? `${stations.length} ${stations.length === 1 ? 'estación seleccionada' : 'estaciones seleccionadas'}`
                    : `${stations.length} ${stations.length === 1 ? 'station selected' : 'stations selected'}`}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--color-line)] bg-[var(--color-wash)]">
        <Button type="button" variant="neutral" onClick={onCancel}>
          {isEs ? 'Cancelar' : 'Cancel'}
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!canSubmit}
        >
          {isEs ? 'Crear' : 'Create'}
        </Button>
      </div>
    </form>
  );
}

function ScopeCard({
  checked,
  onSelect,
  title,
  description,
  isEs,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  isEs: boolean;
}): React.ReactElement {
  return (
    <label
      className={cn(
        'flex items-start gap-3 cursor-pointer rounded-[var(--radius-md)] border p-3 transition-colors',
        checked
          ? 'border-[var(--color-brand-600)] bg-[var(--color-surface)]'
          : 'border-[var(--color-line)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)]',
      )}
    >
      <input
        type="radio"
        name="scope"
        checked={checked}
        onChange={onSelect}
        aria-label={title}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          checked
            ? 'border-[var(--color-brand-600)] bg-[var(--color-surface)]'
            : 'border-[var(--color-line-3)] bg-[var(--color-surface)]',
        )}
      >
        {checked && <span className="size-2 rounded-full bg-[var(--color-brand-600)]" />}
      </span>
      <div className="flex-1 min-w-0">
        <span className="block text-xs font-semibold text-[var(--color-ink)]">
          {title}
        </span>
        <span className="block text-[11px] text-[var(--color-ink-3)] mt-0.5">
          {description}
        </span>
      </div>
      {!isEs && checked && (
        <span className="sr-only">{`Selected: ${title}`}</span>
      )}
    </label>
  );
}
