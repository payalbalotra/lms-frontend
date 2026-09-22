'use client';

/**
 * Library location selector — the "where does this procedure live in the
 * library" picker that replaced the old 4-column category card grid.
 *
 * Three related choices sit on the same Details card so the manager does
 * the picking once:
 *   1. Category       — the top-level group
 *   2. Subcategory    — narrows the category (filtered list on the right)
 *   3. Station scope  — only when the subcategory is station-specific;
 *                       otherwise the chip reports "All stations".
 *
 * Owns no state of its own — the wizard holds categoryId / subcategoryId /
 * stationScope in form state and passes them down plus change handlers.
 *
 * Touch targets follow DESIGN.md §5: 36 px on admin desk, 48 px on phone.
 * At < 640 px the two columns stack and the row height bumps.
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LuCheck, LuChevronRight, LuCircleAlert, LuMapPin } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import type { Category, Station, Subcategory } from '@/lib/types';
import { getCategoryIcon } from '@/lib/category-icons';

export type StationScopeMode = 'all' | 'specific';

export interface LibraryLocationPickerProps {
  categories: Category[];
  stations: Station[];
  selectedCategoryId: string;
  selectedSubcategoryId: string | null;
  stationScopeMode: StationScopeMode;
  selectedStationIds: Set<string>;
  onChangeCategory: (id: string) => void;
  onChangeSubcategory: (id: string | null) => void;
  onChangeStationScopeMode: (mode: StationScopeMode) => void;
  onToggleStation: (id: string) => void;
  locale: string;
}

export function LibraryLocationPicker({
  categories,
  stations,
  selectedCategoryId,
  selectedSubcategoryId,
  stationScopeMode,
  selectedStationIds,
  onChangeCategory,
  onChangeSubcategory,
  onChangeStationScopeMode,
  onToggleStation,
  locale,
}: LibraryLocationPickerProps): React.ReactElement {
  const t = useTranslations('admin.library.new.form.location');

  const selectedCategory: Category | null = React.useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const subcategories: Subcategory[] = React.useMemo(
    () => selectedCategory?.subcategories ?? [],
    [selectedCategory],
  );

  const selectedSubcategory: Subcategory | null = React.useMemo(
    () => subcategories.find((s) => s.id === selectedSubcategoryId) ?? null,
    [subcategories, selectedSubcategoryId],
  );

  const isStationSpecific = selectedSubcategory?.isStationSpecific === true;

  const sortedStations = React.useMemo(
    () => [...stations].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [stations],
  );

  const categoryName = selectedCategory
    ? (locale === 'es' ? selectedCategory.nameEs : selectedCategory.nameEn)
    : '';
  const subcategoryName = selectedSubcategory
    ? (locale === 'es' ? selectedSubcategory.nameEs : selectedSubcategory.nameEn)
    : '';

  // Selection chip text for station. Falls back to empty string when the
  // manager hasn't picked yet — the chip stays empty rather than showing
  // a misleading "All stations" before the subcategory is chosen.
  const stationChipValue = !selectedSubcategory
    ? ''
    : !isStationSpecific
      ? t('summary.allStations')
      : stationScopeMode === 'all'
        ? t('summary.allStations')
        : selectedStationIds.size === 0
          ? ''
          : t('summary.stationsCount', { count: selectedStationIds.size });

  const stationChipFilled = Boolean(
    selectedSubcategory &&
      (!isStationSpecific || (stationScopeMode === 'specific' && selectedStationIds.size > 0) || stationScopeMode === 'all'),
  );

  return (
    <div className="space-y-5">
      {/* ─────────────── Selection summary ─────────────── */}
      <div
        aria-label={t('summary.label')}
        className="flex flex-wrap items-center gap-2"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-3)] mr-1">
          {t('summary.label')}
        </span>
        <SummaryChip label={t('summary.category')} value={categoryName} filled={Boolean(selectedCategory)} />
        <SummaryChip label={t('summary.subcategory')} value={subcategoryName} filled={Boolean(selectedSubcategory)} />
        <SummaryChip label={t('summary.station')} value={stationChipValue} filled={stationChipFilled} />
      </div>

      {/* ─────────────── Two-column selector ─────────────── */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <CategoryColumn
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={onChangeCategory}
          label={t('columns.category')}
          locale={locale}
        />
        <SubcategoryColumn
          subcategories={subcategories}
          selectedId={selectedSubcategoryId}
          onSelect={onChangeSubcategory}
          category={selectedCategory}
          label={t('columns.subcategory')}
          locale={locale}
          noSubcategoriesLabel={t('columns.noSubcategories')}
          addSubcategoryLabel={t('columns.addSubcategory')}
        />
      </div>

      {/* ─────────────── Station scope (conditional) ─────────────── */}
      {selectedSubcategory && isStationSpecific && (
        <StationScopePanel
          stations={sortedStations}
          selectedStationIds={selectedStationIds}
          mode={stationScopeMode}
          onChangeMode={onChangeStationScopeMode}
          onToggleStation={onToggleStation}
          suggestedStationIds={selectedSubcategory.stations ?? []}
          headingLabel={t('station.heading')}
          subtitleLabel={t('station.subtitle')}
          allStationsLabel={t('station.allStations')}
          specificStationsLabel={t('station.specificStations')}
          suggestedLabel={t('station.suggested')}
          applySuggestionLabel={t('station.applySuggestion')}
          emptyLabel={t('station.noStations')}
        />
      )}

      {selectedSubcategory && !isStationSpecific && (
        <p className="text-xs text-[var(--color-ink-3)] italic">
          {t('station.appliesToAll')}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Summary chip — a small pill that reports the current value of one of the
// three selectors. Empty when nothing picked, terracotta-tinted when set.
// ─────────────────────────────────────────────────────────────────────────

function SummaryChip({
  label,
  value,
  filled,
}: {
  label: string;
  value: string;
  filled: boolean;
}): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
        filled
          ? 'border-[var(--color-brand-tint-2)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]'
          : 'border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-3)]',
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-wider opacity-75">
        {label}
      </span>
      <span className="font-semibold">
        {filled ? value : '—'}
      </span>
      {filled && (
        <LuCheck aria-hidden="true" className="text-xs text-[var(--color-brand-600)]" />
      )}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Category column — vertical list of every category. Same look as the old
// category tile but stretched to a full-width row inside the column.
// ─────────────────────────────────────────────────────────────────────────

function CategoryColumn({
  categories,
  selectedId,
  onSelect,
  label,
  locale,
}: {
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
  label: string;
  locale: string;
}): React.ReactElement {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xs overflow-hidden">
      <header className="border-b border-[var(--color-line)] px-4 py-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-3)]">
          {label}
        </h4>
      </header>
      <ul role="listbox" aria-label={label} className="max-h-[38vh] overflow-y-auto p-1.5 space-y-1">
        {categories.map((c) => {
          const isSelected = c.id === selectedId;
          const name = locale === 'es' ? c.nameEs : c.nameEn;
          const subCount = c.subcategories?.length ?? 0;
          const CatIcon = getCategoryIcon(c);
          return (
            <li key={c.id}>
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onSelect(c.id)}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2 text-left transition-colors min-h-tap-admin',
                  isSelected
                    ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-tint)]'
                    : 'border-transparent bg-transparent hover:bg-[var(--color-wash)] hover:border-[var(--color-line)]',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-base transition-colors',
                    isSelected
                      ? 'bg-[var(--color-surface)] text-[var(--color-brand-700)]'
                      : 'bg-[var(--color-panel)] text-[var(--color-ink-2)] group-hover:text-[var(--color-ink)]',
                  )}
                >
                  <Icon icon={CatIcon} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
                    {name}
                  </span>
                  <span className="block text-xs text-[var(--color-ink-3)] font-medium">
                    {subCount} {subCount === 1 ? 'subcategory' : 'subcategories'}
                  </span>
                </span>
                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white"
                  >
                    <LuCheck className="text-xs font-semibold" />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Subcategory column — vertical list filtered to the chosen category.
// ─────────────────────────────────────────────────────────────────────────

function SubcategoryColumn({
  subcategories,
  selectedId,
  onSelect,
  category,
  label,
  locale,
  noSubcategoriesLabel,
  addSubcategoryLabel,
}: {
  subcategories: Subcategory[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  category: Category | null;
  label: string;
  locale: string;
  noSubcategoriesLabel: string;
  addSubcategoryLabel: string;
}): React.ReactElement {
  const isEs = locale === 'es';
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xs overflow-hidden">
      <header className="border-b border-[var(--color-line)] px-4 py-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-3)]">
          {label}
        </h4>
      </header>
      {!category ? (
        <EmptyState message={isEs ? 'Selecciona una categoría' : 'Select a category'} />
      ) : subcategories.length === 0 ? (
        <EmptyStateWithAction
          message={noSubcategoriesLabel}
          actionLabel={addSubcategoryLabel}
          href={
            category
              ? `/en/admin/library/categories/${category.slug}`
              : '/en/admin/library/categories'
          }
          isEs={isEs}
        />
      ) : (
        <ul role="listbox" aria-label={label} className="max-h-[38vh] overflow-y-auto p-1.5 space-y-1">
          {subcategories.map((s) => {
            const isSelected = s.id === selectedId;
            const name = isEs ? s.nameEs : s.nameEn;
            const stationHint = s.isStationSpecific
              ? (isEs ? 'Específico de estación' : 'Station-specific')
              : (isEs ? 'General' : 'General');
            return (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onSelect(isSelected ? null : s.id)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2 text-left transition-colors min-h-tap-admin',
                    isSelected
                      ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-tint)]'
                      : 'border-transparent bg-transparent hover:bg-[var(--color-wash)] hover:border-[var(--color-line)]',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
                      {name}
                    </span>
                    <span className="block text-xs text-[var(--color-ink-3)] font-medium">
                      {stationHint}
                    </span>
                  </span>
                  {isSelected && (
                    <span
                      aria-hidden="true"
                      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white"
                    >
                      <LuCheck className="text-xs font-semibold" />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }): React.ReactElement {
  return (
    <div className="flex items-center justify-center px-4 py-8 text-center">
      <p className="text-xs text-[var(--color-ink-3)] italic">{message}</p>
    </div>
  );
}

function EmptyStateWithAction({
  message,
  actionLabel,
  href,
  isEs,
}: {
  message: string;
  actionLabel: string;
  href: string;
  isEs: boolean;
}): React.ReactElement {
  // Locale-aware href: the categories admin lives under [locale]; we
  // switch on the browser locale so the link resolves correctly. The
  // form passes `locale` through but the subcategory column is given only
  // the category, not the full path. Keep the URL simple — the next-intl
  // routing will rewrite to the active locale on click.
  const localisedHref = isEs ? href.replace(/^\/en\//, '/es/') : href;
  return (
    <div className="space-y-3 px-4 py-6 text-center">
      <p className="text-xs text-[var(--color-ink-2)] italic">{message}</p>
      <Link
        href={localisedHref}
        className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] hover:border-[var(--color-brand-600)] hover:bg-[var(--color-brand-tint)] hover:text-[var(--color-brand-700)] transition-colors"
      >
        {actionLabel}
        <LuChevronRight aria-hidden="true" className="text-xs" />
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Station scope panel — only shown when the chosen subcategory is
// station-specific. Two-mode radio (All / Specific) + checkbox list.
// "Suggested" row pre-ticks whatever's in subcategory.stations?.[]. The
// manager can override with [Apply suggestion] or by clicking rows.
// ─────────────────────────────────────────────────────────────────────────

function StationScopePanel({
  stations,
  selectedStationIds,
  mode,
  onChangeMode,
  onToggleStation,
  suggestedStationIds,
  headingLabel,
  subtitleLabel,
  allStationsLabel,
  specificStationsLabel,
  suggestedLabel,
  applySuggestionLabel,
  emptyLabel,
}: {
  stations: Station[];
  selectedStationIds: Set<string>;
  mode: StationScopeMode;
  onChangeMode: (mode: StationScopeMode) => void;
  onToggleStation: (id: string) => void;
  suggestedStationIds: string[];
  headingLabel: string;
  subtitleLabel: string;
  allStationsLabel: string;
  specificStationsLabel: string;
  suggestedLabel: string;
  applySuggestionLabel: string;
  emptyLabel: string;
}): React.ReactElement {
  const hasStations = stations.length > 0;

  // Has the manager already accepted the suggestion? Used to disable the
  // [Apply suggestion] button when the picker already matches.
  const suggestionApplied =
    suggestedStationIds.length > 0 &&
    suggestedStationIds.every((id) => selectedStationIds.has(id)) &&
    selectedStationIds.size === suggestedStationIds.length;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xs">
      <header className="border-b border-[var(--color-line)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex size-tap-admin shrink-0 items-center justify-center rounded-lg bg-[var(--color-panel)] text-[var(--color-ink-2)] text-base"
          >
            <Icon icon={LuMapPin} />
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold tracking-snug text-[var(--color-ink)]">
              {headingLabel}
            </h4>
            <p className="text-xs text-[var(--color-ink-2)] mt-0.5">{subtitleLabel}</p>
          </div>
        </div>
      </header>

      <div className="space-y-3 p-4">
        {/* Mode radio pair */}
        <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
          <ScopeOption
            checked={mode === 'specific'}
            onSelect={() => onChangeMode('specific')}
            title={specificStationsLabel}
            description="Pick which stations can see this procedure."
          />
          <ScopeOption
            checked={mode === 'all'}
            onSelect={() => onChangeMode('all')}
            title={allStationsLabel}
            description="Visible to cooks regardless of station."
          />
        </div>

        {/* Suggested + station list */}
        {mode === 'specific' && (
          <>
            {suggestedStationIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-2">
                <span className="text-xs font-semibold text-[var(--color-ink-3)]">
                  {suggestedLabel}:
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {suggestedStationIds.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center rounded-md border border-[var(--color-line-2)] bg-[var(--color-panel-2)] px-2 py-0.5 text-xs font-semibold text-[var(--color-ink)]"
                    >
                      {id}
                    </span>
                  ))}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    // Replace selection with the suggested set. We
                    // don't toggle individual stations — applying a
                    // suggestion is an atomic "match the hint" action.
                    for (const id of stations.map((s) => s.id)) {
                      const shouldHave = suggestedStationIds.includes(id);
                      const has = selectedStationIds.has(id);
                      if (shouldHave && !has) onToggleStation(id);
                      if (!shouldHave && has) onToggleStation(id);
                    }
                  }}
                  disabled={suggestionApplied}
                  className={cn(
                    'ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
                    suggestionApplied
                      ? 'text-[var(--color-ink-3)] cursor-default'
                      : 'text-[var(--color-brand-700)] hover:bg-[var(--color-brand-tint)]',
                  )}
                >
                  {suggestionApplied && (
                    <LuCheck aria-hidden="true" className="text-xs" />
                  )}
                  {applySuggestionLabel}
                </button>
              </div>
            )}

            {!hasStations ? (
              <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-2 text-xs text-[var(--color-ink-3)] italic">
                {emptyLabel}
              </p>
            ) : (
              <ul role="list" className="space-y-1">
                {stations.map((stn) => {
                  const isChecked = selectedStationIds.has(stn.id);
                  return (
                    <li key={stn.id}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2 transition-colors min-h-tap-admin',
                          isChecked
                            ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-tint)]'
                            : 'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)]',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleStation(stn.id)}
                          className="size-4 shrink-0 accent-[var(--color-brand-600)]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-[var(--color-ink)]">
                            {stn.name}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            {selectedStationIds.size === 0 && hasStations && (
              <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-warn-tint)] bg-[var(--color-warn-tint)] px-3 py-2 text-xs text-[var(--color-warn-ink)]">
                <LuCircleAlert aria-hidden="true" className="text-base shrink-0 mt-0.5" />
                <span>
                  Pick at least one station, or switch to “All stations.”
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// One option in the Specific / All toggle. Click anywhere on the card to
// select — same radiogroup pattern the categories admin uses.
function ScopeOption({
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
          ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-tint)]'
          : 'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)]',
      )}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onSelect}
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
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-[var(--color-ink)]">{title}</span>
        <span className="block text-xs text-[var(--color-ink-2)] mt-0.5">{description}</span>
      </span>
    </label>
  );
}