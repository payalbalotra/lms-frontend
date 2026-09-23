'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCategoryIcon } from '@/lib/category-icons';
import type { Category, Subcategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { RowActions } from '@/components/ui/row-actions';
import { StatusPill } from '@/components/ui/status-pill';
import { cn } from '@/lib/utils';
import { useUpdateCategory } from '@/services/categories/hooks';
import { LuArrowLeft, LuChevronRight, LuClock, LuFileText, LuLink, LuPlus, LuSearch, LuShieldAlert, LuShieldCheck, LuSparkles, LuTag, LuX } from 'react-icons/lu';
import { IconTile } from '@/components/ui/icon-tile';
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

const DEFAULT_STATIONS = [
  { id: 'stn-gm', code: 'GM', description: 'Cold section + fryer' },
  { id: 'stn-grill', code: 'Grill', description: 'Hot Line / Grill' },
  { id: 'stn-expo', code: 'Expo', description: 'Expo Station' },
  { id: 'stn-prep', code: 'Prep Kitchen', description: 'Prep & Cold Station' },
  { id: 'stn-dish', code: 'Dishwasher', description: 'Sanitation & Dish' },
];

/** Subcategories store station ids (`stn-gm`, `st-grill`, …). The row
 *  badges surface the human-readable `code` instead — the raw id is a
 *  meaningless slug for the manager. The `EXISTING_PROCEDURES` catalog
 *  uses the Access step's `st-` ids, so we map both prefixes. Falls back
 *  to the input so an unknown id still renders rather than blowing up
 *  the row. */
const STATION_CODE_BY_ID: Record<string, string> = Object.fromEntries(
  DEFAULT_STATIONS.flatMap((s) => [
    [s.id, s.code],
    [s.id.replace(/^stn-/, 'st-'), s.code],
  ]),
);
function stationCode(id: string): string {
  return STATION_CODE_BY_ID[id] ?? id;
}

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
  initialCategory,
  slug,
  locale,
}: CategoryDetailClientProps): React.ReactElement {
  const router = useRouter();
  const isEs = locale === 'es';
  const [category, setCategory] = React.useState<Category | null>(initialCategory);
  const [isResolving, setIsResolving] = React.useState<boolean>(initialCategory === null);
  const [notFound, setNotFound] = React.useState<boolean>(false);
  const [addSubOpen, setAddSubOpen] = React.useState(false);
  const [editingSub, setEditingSub] = React.useState<Subcategory | null>(null);

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

  // State for the single expanded subcategory (accordion). One open at a time —
  // multi-expand fragments the manager's focus and turns the panel into a list.
  // `initialCategory` is nullable on first render (the server may not have seen
  // a category created only in the client mock store); the lazy initializer
  // short-circuits to `null` in that case and the first real expanded sub is
  // decided after the client-side resolve lands.
  const [expandedSubSlug, setExpandedSubSlug] = React.useState<string | null>(() => {
    return initialCategory?.subcategories?.[0]?.slug ?? null;
  });

  const toggleExpand = (subSlug: string) => {
    setExpandedSubSlug((prev) => (prev === subSlug ? null : subSlug));
  };

  const updateMutation = useUpdateCategory();
  // `category` is `Category | null` while the client-side resolve is in flight
  // (the server only knows about seed categories — anything created through
  // the modal lives in localStorage). Loading + not-found states are rendered
  // before any code below touches `category.subcategories` / `category.id`.
  const subcategories = category?.subcategories ?? [];
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
    // The mutation is only ever invoked from inside the main panel render —
    // by that point the loading / not-found guards above have already
    // narrowed `category` to non-null. Re-check here so strict TypeScript
    // narrows `category.id` inside the closure without a non-null assertion.
    if (!category) return;
    const targetCategory = category;
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
        id: targetCategory.id,
        input: {
          subcategories: updatedSubs.map((s) => ({
            nameEn: s.nameEn,
            nameEs: s.nameEs,
            isStationSpecific: s.isStationSpecific,
          })),
        },
      });
      setCategory((prev) => (prev ? { ...prev, subcategories: updatedSubs } : prev));
    } catch {
      // Optimistic state preserved
    }
  }

  const [stationPickerSub, setStationPickerSub] = React.useState<Subcategory | null>(null);

  async function handleSaveStations(subToUpdate: Subcategory, selectedStations: string[]) {
    if (!category) return;
    const targetCategory = category;
    const updatedSubs = subcategories.map((s) =>
      s.id === subToUpdate.id || s.slug === subToUpdate.slug
        ? { ...s, stations: selectedStations, isStationSpecific: true }
        : s
    );

    try {
      await updateMutation.mutateAsync({
        id: targetCategory.id,
        input: {
          subcategories: updatedSubs.map((s) => ({
            nameEn: s.nameEn,
            nameEs: s.nameEs,
            isStationSpecific: s.isStationSpecific,
          })),
        },
      });
      setCategory((prev) => (prev ? { ...prev, subcategories: updatedSubs } : prev));
    } catch {
      // Optimistic state preserved
    }
  }

  // Loading: the server's seed fetch missed (only client mock store has it),
  // and the client-side resolve is still running. Show a quiet pulse so the
  // user doesn't think the link was broken.
  if (isResolving) {
    return (
      <div className="mx-auto max-w-5xl pb-12">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 pt-6 text-xs text-[var(--color-ink-3)] font-medium"
        >
          <Link
            href={`/${locale}/admin/library/categories`}
            className="hover:text-[var(--color-ink)] transition-colors flex items-center gap-1"
          >
            <LuArrowLeft className="text-sm" />
            <span>{isEs ? 'Categorías' : 'Categories'}</span>
          </Link>
        </nav>
        <div
          role="status"
          aria-live="polite"
          className="mt-4 flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] p-12 text-center"
        >
          <p className="text-sm font-medium text-[var(--color-ink-2)] animate-pulse">
            {isEs ? 'Cargando categoría…' : 'Loading category…'}
          </p>
        </div>
      </div>
    );
  }

  // Not found: the mock store also doesn't have a category with this slug —
  // either the row was deleted or the user opened a stale link. Mirror the
  // 404 shape on /procedures/[id] but keep it inside the admin shell chrome
  // (no full-page takeover) so the sidebar remains usable.
  if (!category || notFound) {
    return (
      <div className="mx-auto max-w-5xl pb-12">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 pt-6 text-xs text-[var(--color-ink-3)] font-medium"
        >
          <Link
            href={`/${locale}/admin/library/categories`}
            className="hover:text-[var(--color-ink)] transition-colors flex items-center gap-1"
          >
            <LuArrowLeft className="text-sm" />
            <span>{isEs ? 'Categorías' : 'Categories'}</span>
          </Link>
        </nav>
        <div className="mt-4 flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] p-12 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--color-ink)]">
            {isEs ? 'Categoría no encontrada' : 'Category not found'}
          </h1>
          <p className="mt-2 max-w-md text-sm text-[var(--color-ink-2)]">
            {isEs
              ? 'La categoría solicitada no existe o fue eliminada.'
              : 'The requested category does not exist or has been removed.'}
          </p>
          <Link
            href={`/${locale}/admin/library/categories`}
            className="mt-6 inline-flex min-h-tap-admin items-center gap-2 rounded-full bg-[var(--color-brand-600)] px-5 py-2.5 text-sm font-semibold text-white shadow-e1 hover:bg-[var(--color-brand-hover)]"
          >
            <LuArrowLeft aria-hidden="true" />
            {isEs ? 'Volver a Categorías' : 'Back to Categories'}
          </Link>
        </div>
      </div>
    );
  }

  const subWord = isEs
    ? subcategories.length === 1
      ? 'subcategoría'
      : 'subcategorías'
    : subcategories.length === 1
      ? 'subcategory'
      : 'subcategories';
  const countLine =
    `${subcategories.length} ${subWord}` +
    (totalProcedures > 0 ? ` · ${totalProcedures} ${isEs ? 'procedimientos' : 'procedures'}` : '');

  return (
    <div className="mx-auto max-w-page space-y-6">
      {/* The header every admin page wears. The eyebrow is the list this came
          from and the way back to it; the breadcrumb, the back arrow and the
          icon beside the title said the same place three more times. */}
      <PageHeader
        eyebrow={isEs ? 'Categorías' : 'Categories'}
        eyebrowHref={`/${locale}/admin/library/categories`}
        title={isEs ? category.nameEs : category.nameEn}
        subtitle={countLine}
        actions={
          <Button
            icon={LuPlus}
            onClick={() => {
              setEditingSub(null);
              setAddSubOpen(true);
            }}
          >
            {isEs ? 'Añadir subcategoría' : 'Add subcategory'}
          </Button>
        }
      />

      {subcategories.length === 0 ? (
        <EmptyState
          title={isEs ? 'Esta categoría aún no tiene subcategorías.' : 'This category does not have subcategories yet.'}
          action={
            <Button variant="secondary" icon={LuPlus} onClick={() => setAddSubOpen(true)}>
              {isEs ? 'Crear la primera subcategoría' : 'Create first subcategory'}
            </Button>
          }
        />
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

            // Subcategory records can store either form (the live fixtures
            // ship `stn-gm`/`st-grill`, the seed stories ship `GM`/`Grill`),
            // and the Access modal round-trips them as codes — normalise
            // through `stationCode` so the badge text always lands on the
            // human-readable form the manager expects.
            const stationCodes = (sub.stations ?? (isGeneral ? [] : ['GM', 'Grill', 'Expo'])).map(stationCode);
            const visibleStations = stationCodes.slice(0, 3);
            const hiddenStationCount = stationCodes.length - visibleStations.length;
            const procedureLabel = isEs ? 'procedimientos' : 'procedures';

            return (
              <div
                key={sub.id || sub.slug}
                className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xs"
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
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]',
                    isExpanded ? 'bg-[var(--color-wash)]' : 'hover:bg-[var(--color-wash)]',
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <IconTile size="md" icon={SubIcon} />

                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <h2 className="truncate text-base font-semibold text-[var(--color-ink)]">
                          {isEs ? sub.nameEs : sub.nameEn}
                        </h2>
                        {sub.nameEs !== sub.nameEn && (
                          <span className="hidden truncate text-sm text-[var(--color-ink-3)] sm:inline">
                            ({isEs ? sub.nameEn : sub.nameEs})
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-sm leading-meta text-[var(--color-ink-3)]">
                        {procedures.length} {procedureLabel}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 pl-3">
                    {/* Where the subcategory applies, in the badge every other
                        list uses. "General" was the word for a subcategory with no
                        station of its own, and it did not say what it meant: it
                        applies at every station. Changing which stations is in
                        the menu, so the badges are labels, not buttons. */}
                    {!isExpanded && (
                      <div className="hidden flex-wrap items-center gap-2 sm:flex">
                        {isGeneral ? (
                          <StatusPill tone="neutral">{isEs ? 'Todas las estaciones' : 'All stations'}</StatusPill>
                        ) : (
                          <>
                            {visibleStations.map((code) => (
                              <StatusPill key={code} tone="neutral">
                                {code}
                              </StatusPill>
                            ))}
                            {hiddenStationCount > 0 && <StatusPill tone="neutral">+{hiddenStationCount}</StatusPill>}
                          </>
                        )}
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

                {/* The procedures, as rows inside the card they belong to. Each
                    was a bordered card of its own inside this one, with the same
                    file icon and a clock on every row. */}
                {isExpanded && (
                  <div id={panelId} role="region" aria-labelledby={headerId} className="border-t border-[var(--color-line)]">
                    <div className="flex items-center justify-between gap-3 px-4 py-2">
                      <h3 className="text-sm font-semibold text-[var(--color-ink-2)]">
                        {isEs ? 'Procedimientos' : 'Procedures'}
                      </h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={LuPlus}
                        onClick={() => setLinkProceduresSub(sub)}
                      >
                        {isEs ? 'Añadir procedimiento' : 'Add procedure'}
                      </Button>
                    </div>

                    {procedures.length === 0 ? (
                      <div className="px-4 pb-4">
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
                      <ul className="divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
                        {procedures.map((proc) => (
                          <li key={proc.id}>
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => router.push(`/${locale}/admin/library/${proc.slug}`)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  router.push(`/${locale}/admin/library/${proc.slug}`);
                                }
                              }}
                              className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-[var(--color-wash)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]"
                            >
                              <div className="min-w-0">
                                <h4 className="truncate text-sm font-semibold text-[var(--color-ink)]">
                                  {proc.titleEn}
                                </h4>
                                <p className="truncate text-sm text-[var(--color-ink-2)]">{proc.titleEs}</p>
                              </div>

                              <div className="flex shrink-0 items-center gap-4 pl-2" onClick={(e) => e.stopPropagation()}>
                                {proc.station !== 'General' && (
                                  <StatusPill tone="neutral" className="hidden sm:inline-flex">
                                    {proc.station}
                                  </StatusPill>
                                )}
                                <span className="hidden text-sm leading-meta text-[var(--color-ink-3)] md:inline">
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
                          </li>
                        ))}
                      </ul>
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
    <div className="flex max-h-[80vh] flex-col">
      <ModalHeader
        title={isEs ? 'Añadir procedimiento' : 'Add procedure'}
        description={
          isEs
            ? 'Vincula uno o varios procedimientos existentes o crea uno nuevo.'
            : 'Link one or several existing procedures, or create a new one.'
        }
        onClose={onCancel}
        closeLabel={isEs ? 'Cerrar' : 'Close'}
      />

      <ModalBody className="flex-1 overflow-y-auto">
        <section className="space-y-3">
          {/* Only drafts can be linked, so the list says so once rather than
              every row wearing a DRAFT badge. */}
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[var(--color-ink-2)]">
              {isEs ? 'Procedimientos en borrador' : 'Draft procedures'}
            </h3>
            <span className="shrink-0 text-sm leading-meta text-[var(--color-ink-3)]">
              {selectedIds.size > 0
                ? isEs
                  ? `${selectedIds.size} seleccionado${selectedIds.size === 1 ? '' : 's'}`
                  : `${selectedIds.size} selected`
                : isEs
                  ? `${filtered.length} disponible${filtered.length === 1 ? '' : 's'}`
                  : `${filtered.length} available`}
            </span>
          </div>

          <div className="find max-w-none" role="search">
            <LuSearch aria-hidden="true" className="i" />
            <label className="sr-only" htmlFor="add-procedure-search">
              {isEs ? 'Buscar procedimientos' : 'Search procedures'}
            </label>
            <input
              id="add-procedure-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isEs ? 'Buscar procedimientos…' : 'Search procedures…'}
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label={isEs ? 'Limpiar búsqueda' : 'Clear search'}
                className="shrink-0 text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
              >
                <LuX aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              compact
              title={isEs ? 'No hay procedimientos que coincidan con la búsqueda.' : 'No procedures match the search.'}
            />
          ) : (
            <div
              role="group"
              aria-label={isEs ? 'Procedimientos en borrador' : 'Draft procedures'}
              className="max-h-[260px] divide-y divide-[var(--color-line)] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-line-2)]"
            >
              {filtered.map((proc) => {
                const isChecked = selectedIds.has(proc.id);
                const isAlreadyLinked = alreadyLinkedIds.has(proc.id);
                return (
                  <label
                    key={proc.id}
                    className={cn(
                      'flex min-h-12 cursor-pointer items-center gap-3 px-4 py-3 transition-colors',
                      isChecked ? 'bg-[var(--color-brand-tint)]' : 'hover:bg-[var(--color-wash)]',
                      isAlreadyLinked && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isAlreadyLinked}
                      onChange={() => toggle(proc.id)}
                      className="size-4 shrink-0 accent-[var(--color-brand-600)] disabled:cursor-not-allowed"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-[var(--color-ink)]">{proc.titleEn}</span>
                        {isAlreadyLinked && <StatusPill tone="neutral">{isEs ? 'Vinculado' : 'Linked'}</StatusPill>}
                      </span>
                      <span className="block truncate text-sm text-[var(--color-ink-2)]">{proc.titleEs}</span>
                    </span>
                    {proc.station !== 'General' && (
                      <StatusPill tone="neutral">{proc.station.replace(/^st-/, '')}</StatusPill>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </section>

        <div className="flex items-center gap-3" role="separator">
          <div className="h-px flex-1 bg-[var(--color-line)]" />
          <span className="text-sm text-[var(--color-ink-3)]">{isEs ? 'O crea uno nuevo' : 'Or create a new one'}</span>
          <div className="h-px flex-1 bg-[var(--color-line)]" />
        </div>

        {/* What a new procedure starts with. It is a statement, not a form:
            the two bordered boxes looked like fields you could change. */}
        <section className="space-y-2">
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-[var(--color-ink-3)]">{isEs ? 'Categoría' : 'Category'}</dt>
            <dd className="truncate font-semibold text-[var(--color-ink)]">{catName}</dd>
            <dt className="text-[var(--color-ink-3)]">{isEs ? 'Subcategoría' : 'Subcategory'}</dt>
            <dd className="truncate font-semibold text-[var(--color-ink)]">{subName}</dd>
          </dl>
          <p className="text-sm text-[var(--color-ink-3)]">
            {isEs
              ? `La categoría, subcategoría${sub.stations?.length ? ' y las estaciones' : ''} se rellenarán automáticamente.`
              : `Category, subcategory${sub.stations?.length ? ' and stations' : ''} will be filled in automatically.`}
          </p>
        </section>
      </ModalBody>

      <ModalFooter>
        <Button type="button" variant="neutral" onClick={onCancel}>
          {isEs ? 'Cancelar' : 'Cancel'}
        </Button>
        <Button type="button" variant="secondary" icon={LuPlus} onClick={onCreateNew}>
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
      </ModalFooter>
    </div>
  );
}

/**
 * The stations as a checklist. The station picker and the subcategory form each
 * drew their own -- one with a clickable <div> whose checkbox ignored the
 * keyboard, and both printing the station code twice. A <label> around a real
 * checkbox is clickable, focusable and toggled by Space without any handler.
 */
function StationChecklist({
  selected,
  onToggle,
  label,
}: {
  selected: string[];
  onToggle: (code: string) => void;
  label: string;
}): React.ReactElement {
  return (
    <div
      role="group"
      aria-label={label}
      className="divide-y divide-[var(--color-line)] rounded-[var(--radius-md)] border border-[var(--color-line-2)]"
    >
      {DEFAULT_STATIONS.map((stn) => (
        <label
          key={stn.id}
          className="flex min-h-tap-admin cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-[var(--color-wash)]"
        >
          <input
            type="checkbox"
            checked={selected.includes(stn.code)}
            onChange={() => onToggle(stn.code)}
            className="size-4 shrink-0 accent-[var(--color-brand-600)]"
          />
          <span className="text-sm font-semibold text-[var(--color-ink)]">{stn.code}</span>
          <span className="truncate text-sm text-[var(--color-ink-3)]">{stn.description}</span>
        </label>
      ))}
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
      <ModalHeader
        title={isEs ? 'Vincular estaciones' : 'Link stations'}
        description={
          isEs
            ? `Selecciona las estaciones para "${sub.nameEs || sub.nameEn}"`
            : `Select stations for "${sub.nameEn}"`
        }
        onClose={onCancel}
        closeLabel={isEs ? 'Cerrar' : 'Close'}
      />

      <ModalBody className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-ink-2)]">
          {isEs ? 'Estaciones disponibles' : 'Available stations'}
        </h3>
        <StationChecklist
          selected={selected}
          onToggle={toggleStation}
          label={isEs ? 'Estaciones disponibles' : 'Available stations'}
        />
      </ModalBody>

      <ModalFooter>
        <Button type="button" variant="neutral" onClick={onCancel}>
          {isEs ? 'Cancelar' : 'Cancel'}
        </Button>
        <Button type="button" variant="primary" onClick={() => onSave(selected)}>
          {isEs ? 'Guardar estaciones' : 'Save stations'}
        </Button>
      </ModalFooter>
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
      <ModalHeader
        title={
          editingSub
            ? isEs
              ? 'Editar subcategoría'
              : 'Edit subcategory'
            : isEs
              ? 'Crear subcategoría'
              : 'Create subcategory'
        }
        description={isEs ? 'Organiza procedimientos dentro de esta categoría.' : 'Organize procedures within this category.'}
        onClose={onCancel}
        closeLabel={isEs ? 'Cerrar' : 'Close'}
      />

      <ModalBody className="space-y-6">
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--color-ink-2)]">
            {isEs ? 'Detalles de la subcategoría' : 'Subcategory details'}
          </h3>

          <div className="space-y-1.5">
            <Label htmlFor="sub-name-en">
              {isEs ? 'Nombre (Inglés)' : 'Name (English)'}{' '}
              <span aria-hidden="true" className="text-[var(--color-bad)]">*</span>
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
            />
            {nameEn.length > 90 && (
              <p className="text-sm text-[var(--color-ink-3)]">
                {100 - nameEn.length} {isEs ? 'caracteres restantes' : 'characters left'}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sub-name-es">
              {isEs ? 'Nombre (Español)' : 'Name (Spanish)'}{' '}
              <span className="font-normal text-[var(--color-ink-3)]">{isEs ? '(opcional)' : '(optional)'}</span>
            </Label>
            <Input
              id="sub-name-es"
              value={nameEs}
              onChange={(e) => setNameEs(e.target.value.slice(0, 100))}
              placeholder="e.g. Higiene"
              maxLength={100}
              aria-invalid={nameEs.length > 0 && !esValid}
            />
            <p className="text-sm text-[var(--color-ink-3)]">
              {isEs ? 'Se muestra cuando la biblioteca se ve en español.' : 'Used when the library is viewed in Spanish.'}
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--color-ink-2)]">{isEs ? 'Alcance' : 'Scope'}</h3>

          <div role="radiogroup" aria-label={isEs ? 'Alcance' : 'Scope'} className="space-y-2">
            <ScopeCard
              checked={!isStationSpecific}
              onSelect={() => {
                setIsStationSpecific(false);
                setStations([]);
              }}
              title={isEs ? 'Todas las estaciones' : 'All stations'}
              description={isEs ? 'Se muestra en todas las estaciones.' : 'Shown at every station.'}
            />
            <ScopeCard
              checked={isStationSpecific}
              onSelect={() => setIsStationSpecific(true)}
              title={isEs ? 'Específico de estación' : 'Station-specific'}
              description={isEs ? 'Solo aparece en las estaciones seleccionadas.' : 'Only appears for selected stations.'}
            />
          </div>

          {isStationSpecific && (
            <div className="space-y-3 pt-1">
              <h3 className="text-sm font-semibold text-[var(--color-ink-2)]">
                {isEs ? 'Estaciones' : 'Stations'}
                <span aria-hidden="true" className="ml-1 text-[var(--color-bad)]">*</span>
              </h3>
              <StationChecklist
                selected={stations}
                onToggle={toggleStation}
                label={isEs ? 'Estaciones' : 'Stations'}
              />
              <p className="text-sm text-[var(--color-ink-3)]">
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
      </ModalBody>

      <ModalFooter>
        <Button type="button" variant="neutral" onClick={onCancel}>
          {isEs ? 'Cancelar' : 'Cancel'}
        </Button>
        {/* It said Create while editing an existing subcategory. */}
        <Button type="submit" variant="primary" disabled={!canSubmit}>
          {editingSub ? (isEs ? 'Guardar' : 'Save') : isEs ? 'Crear' : 'Create'}
        </Button>
      </ModalFooter>
    </form>
  );
}

function ScopeCard({
  checked,
  onSelect,
  title,
  description,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}): React.ReactElement {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border p-3 transition-colors',
        checked
          ? 'border-[var(--color-ring)] bg-[var(--color-surface)]'
          : 'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)]',
      )}
    >
      <input
        type="radio"
        name="scope"
        checked={checked}
        onChange={onSelect}
        className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand-600)]"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[var(--color-ink)]">{title}</span>
        <span className="mt-0.5 block text-sm text-[var(--color-ink-3)]">{description}</span>
      </span>
    </label>
  );
}
