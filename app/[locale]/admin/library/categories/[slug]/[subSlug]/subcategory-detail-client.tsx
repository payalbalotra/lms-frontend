'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Category, Subcategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { RowActions } from '@/components/ui/row-actions';
import { getCategoryIcon } from '@/lib/category-icons';
import { cn } from '@/lib/utils';
import {
  LuArrowLeft,
  LuChevronRight,
  LuFileText,
  LuPlus,
  LuSearch,
  LuClock,
} from 'react-icons/lu';

interface SubcategoryDetailClientProps {
  category: Category;
  subcategory: Subcategory;
  locale: string;
}

const MOCK_PROCEDURES = [
  {
    id: 'proc-1',
    slug: 'cold-section-plating-sop',
    titleEn: 'Cold Section Plating SOP',
    titleEs: 'Emplatado - Sección fría',
    station: 'GM',
    updatedAgoEn: 'Updated 2 days ago',
    updatedAgoEs: 'Actualizado hace 2 días',
  },
  {
    id: 'proc-2',
    slug: 'grill-plating-sop',
    titleEn: 'Grill Plating SOP',
    titleEs: 'Emplatado - Parrilla',
    station: 'Grill',
    updatedAgoEn: 'Updated 3 days ago',
    updatedAgoEs: 'Actualizado hace 3 días',
  },
  {
    id: 'proc-3',
    slug: 'expo-plating-sop',
    titleEn: 'Expo Plating SOP',
    titleEs: 'Emplatado - Expo',
    station: 'Expo',
    updatedAgoEn: 'Updated 4 days ago',
    updatedAgoEs: 'Actualizado hace 4 días',
  },
  {
    id: 'proc-4',
    slug: 'prep-kitchen-plating-sop',
    titleEn: 'Prep Kitchen Plating SOP',
    titleEs: 'Emplatado - Cocina de preparación',
    station: 'Prep Kitchen',
    updatedAgoEn: 'Updated 5 days ago',
    updatedAgoEs: 'Actualizado hace 5 días',
  },
];

export function SubcategoryDetailClient({
  category,
  subcategory,
  locale,
}: SubcategoryDetailClientProps): React.ReactElement {
  const router = useRouter();
  const isEs = locale === 'es';
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStation, setSelectedStation] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('newest');

  const catName = isEs ? category.nameEs : category.nameEn;
  const subName = isEs ? subcategory.nameEs : subcategory.nameEn;
  const subNameSecondary = isEs ? subcategory.nameEn : subcategory.nameEs;

  const stationList = subcategory.stations && subcategory.stations.length > 0
    ? subcategory.stations
    : ['GM', 'Grill', 'Expo', 'Prep Kitchen'];

  const filteredProcedures = React.useMemo(() => {
    return MOCK_PROCEDURES.filter((proc) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        proc.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proc.titleEs.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStation =
        selectedStation === 'all' ||
        proc.station.toLowerCase() === selectedStation.toLowerCase();
      return matchSearch && matchStation;
    });
  }, [searchQuery, selectedStation]);

  return (
    <div className="mx-auto max-w-page space-y-4 pb-12">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--color-ink-3)] font-medium">
        <Link
          href={`/${locale}/admin/library/categories`}
          className="hover:text-[var(--color-ink)] transition-colors"
        >
          {isEs ? 'Categorías' : 'Categories'}
        </Link>
        <LuChevronRight className="text-[10px] text-[var(--color-ink-3)]" />
        <Link
          href={`/${locale}/admin/library/categories/${category.slug}`}
          className="hover:text-[var(--color-ink)] transition-colors"
        >
          {catName}
        </Link>
        <LuChevronRight className="text-[10px] text-[var(--color-ink-3)]" />
        <span className="text-[var(--color-ink)] font-semibold">{subName}</span>
      </nav>

      {/* Subcategory Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-line)] pb-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-panel)] text-[var(--color-ink-2)] text-xl border border-[var(--color-line-2)] mt-0.5"
          >
            <Icon icon={getCategoryIcon(category)} />
          </span>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--color-ink)]">
                {subName}
              </h1>
              {subNameSecondary && subNameSecondary !== subName && (
                <span className="text-xs font-normal text-[var(--color-ink-3)]">
                  ({subNameSecondary})
                </span>
              )}
            </div>

            {/* Scope badge */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-[var(--radius-sm)] bg-[var(--color-panel)] px-2 py-0.5 text-xs font-medium text-[var(--color-ink-2)] border border-[var(--color-line)]">
                {subcategory.isStationSpecific
                  ? isEs
                    ? `Específico de estación: ${stationList.join(' · ')}`
                    : `Station-specific: ${stationList.join(' · ')}`
                  : isEs
                    ? 'General (se aplica a todas las estaciones)'
                    : 'General (applies to all stations)'}
              </span>
            </div>

            <p className="text-xs text-[var(--color-ink-2)] pt-0.5">
              {isEs
                ? `Procedimientos para emplatado y presentación final de platillos en ${subName}.`
                : `Procedures for ${subName.toLowerCase()} and final presentation of dishes.`}
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={() => router.push(`/${locale}/admin/library/new?category=${category.slug}&subcategory=${subcategory.slug}`)}
          className="shrink-0 font-semibold shadow-2xs"
        >
          <LuPlus className="text-base" />
          <span>{isEs ? 'Añadir procedimiento' : 'Add procedure'}</span>
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-[var(--color-surface)] p-2.5 rounded-[var(--radius-lg)] border border-[var(--color-line-2)] shadow-2xs">
        <div className="relative w-full sm:w-80">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-3)] text-sm" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isEs ? 'Buscar procedimientos...' : 'Search procedures...'}
            className="pl-8 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {/* Station Filter */}
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 h-9 text-xs font-medium text-[var(--color-ink-2)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
          >
            <option value="all">{isEs ? 'Todas las estaciones' : 'All stations'}</option>
            {stationList.map((stn) => (
              <option key={stn} value={stn}>
                {stn}
              </option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 h-9 text-xs font-medium text-[var(--color-ink-2)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
          >
            <option value="newest">{isEs ? 'Más recientes' : 'Sort by newest'}</option>
            <option value="alphabetical">{isEs ? 'Alfabético' : 'Sort A-Z'}</option>
          </select>
        </div>
      </div>

      {/* Procedures List */}
      {filteredProcedures.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] p-10 text-center">
          <p className="text-xs text-[var(--color-ink-2)] mb-3">
            {isEs
              ? 'No se encontraron procedimientos en esta subcategoría.'
              : 'No procedures found in this subcategory.'}
          </p>
          <Button
            variant="neutral"
            icon={LuPlus}
            onClick={() => router.push(`/${locale}/admin/library/new?category=${category.slug}&subcategory=${subcategory.slug}`)}
            className="text-xs"
          >
            {isEs ? 'Crear procedimiento' : 'Create procedure'}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProcedures.map((proc) => (
            <article
              key={proc.id}
              onClick={() => router.push(`/${locale}/admin/library/${proc.slug}`)}
              className={cn(
                'group flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-line-2)]',
                'bg-[var(--color-surface)] p-3.5 shadow-2xs transition-all cursor-pointer',
                'hover:border-[var(--color-line-hover)] hover:shadow-e1 gap-3'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-panel)] text-[var(--color-ink-2)] text-base transition-colors group-hover:text-[var(--color-ink)]"
                >
                  <LuFileText />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-[var(--color-ink)]">
                    {proc.titleEn}
                  </h3>
                  <p className="truncate text-[11px] text-[var(--color-ink-3)] font-normal">
                    {proc.titleEs}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                <span className="hidden sm:inline-flex min-w-[36px] h-6 items-center justify-center px-2.5 text-[11px] font-semibold tracking-[0.02em] leading-none rounded-md bg-[var(--color-panel-2)] text-[var(--color-ink)] border border-[var(--color-line-2)] shadow-2xs">
                  {proc.station}
                </span>
                <span className="text-[11px] text-[var(--color-ink-3)] font-normal hidden sm:inline-flex items-center gap-1">
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
            </article>
          ))}
        </div>
      )}

      {/* Footer Stats & Pagination */}
      <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-3 text-xs font-medium text-[var(--color-ink-3)]">
        <span>
          {filteredProcedures.length} {isEs ? 'procedimientos' : 'procedures'}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled
            className="px-2 py-0.5 rounded border border-[var(--color-line-2)] opacity-40 cursor-not-allowed text-xs"
          >
            ‹
          </button>
          <span className="px-2 py-0.5 rounded bg-[var(--color-panel)] font-bold text-[var(--color-ink)] text-xs">
            1
          </span>
          <button
            type="button"
            disabled
            className="px-2 py-0.5 rounded border border-[var(--color-line-2)] opacity-40 cursor-not-allowed text-xs"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
