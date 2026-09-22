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

            const procedures =
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
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-600)] focus-visible:ring-inset',
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
                            className="cursor-pointer inline-flex min-w-[36px] h-6 items-center justify-center px-2.5 text-[11px] font-semibold tracking-[0.02em] leading-none rounded-md bg-[var(--color-panel-2)] text-[var(--color-ink)] border border-[var(--color-line-2)] shadow-2xs hover:bg-[var(--color-brand-tint)] hover:text-[var(--color-brand-700)] transition-colors"
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
                          onSelect: () =>
                            router.push(`/${locale}/admin/library/new?category=${category.slug}&subcategory=${sub.slug}`),
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
                        onClick={() =>
                          router.push(`/${locale}/admin/library/new?category=${category.slug}&subcategory=${sub.slug}`)
                        }
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
                                  className="bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] border border-[var(--color-brand-600)]/20 hidden sm:inline-flex"
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
        <Button type="button" variant="neutral" onClick={onCancel} className="rounded-full px-4 text-xs font-semibold">
          {isEs ? 'Cancelar' : 'Cancel'}
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={() => onSave(selected)}
          className="rounded-full bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white px-4 text-xs font-semibold shadow-e1"
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
        <Button type="button" variant="neutral" onClick={onCancel} className="px-4 text-xs font-semibold">
          {isEs ? 'Cancelar' : 'Cancel'}
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!canSubmit}
          className="px-4 text-xs font-semibold shadow-e1"
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
