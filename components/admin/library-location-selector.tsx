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
import { LuCheck, LuCircleAlert } from 'react-icons/lu';
import { cn } from '@/lib/utils';
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

  const isEs = locale === 'es';

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

  const categoryName = selectedCategory ? (isEs ? selectedCategory.nameEs : selectedCategory.nameEn) : '';
  const subcategoryName = selectedSubcategory
    ? (isEs ? selectedSubcategory.nameEs : selectedSubcategory.nameEn)
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
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-3)]">
          {t('summary.label')}
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          <SummaryPill
            label={t('summary.category')}
            value={categoryName}
            filled={Boolean(selectedCategory)}
          />
          <SummaryPill
            label={t('summary.subcategory')}
            value={subcategoryName}
            filled={Boolean(selectedSubcategory)}
          />
          <SummaryPill
            label={t('summary.station')}
            value={stationChipValue}
            filled={stationChipFilled}
          />
        </div>
      </div>

      {/* ─────────────── Two-column selector ─────────────── */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-start">
        <CategoryColumn
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={onChangeCategory}
          eyebrow={t('columns.eyebrowCategory')}
          label={t('columns.eyebrowCategory')}
          locale={locale}
        />
        <SubcategoryColumn
          subcategories={subcategories}
          selectedId={selectedSubcategoryId}
          onSelect={onChangeSubcategory}
          category={selectedCategory}
          locale={locale}
          eyebrow={t('columns.eyebrowSubcategory')}
          noSubcategoriesLabel={t('columns.noSubcategories')}
          scopeGeneralLabel={t('columns.scopeGeneral')}
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
          eyebrowLabel={t('columns.eyebrowStation')}
          subtitleLabel={t('station.subtitle')}
          allStationsLabel={t('station.allStations')}
          specificStationsLabel={t('station.specificStations')}
          suggestedLabel={t('station.suggested')}
          applySuggestionLabel={t('station.applySuggestion')}
          emptyLabel={t('station.noStations')}
          locale={locale}
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
// Summary pill — a compact, low-emphasis readout for one of the three
// selectors. Not a control — the actual selection lives in the panels
// below. Empty when nothing picked, terracotta-tinted when set, the
// "—" placeholder never reads like a value.
// ─────────────────────────────────────────────────────────────────────────

function SummaryPill({
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
        'inline-flex items-baseline gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
        filled
          ? 'border-[var(--color-brand-tint-2)] bg-[var(--color-brand-tint)]'
          : 'border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)]',
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-3)]">
        {label}
      </span>
      <span className="text-[var(--color-ink-3)]" aria-hidden="true">
        :
      </span>
      <span
        className={cn(
          'font-semibold',
          filled ? 'text-[var(--color-brand-700)]' : 'text-[var(--color-ink-3)]',
        )}
      >
        {filled ? value : '—'}
      </span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Category column — vertical list of every category. Selected row uses the
// design-system selected treatment: brand-600 border on brand-tint ground,
// brand checkmark on the right. Eyebrow above the column labels the panel;
// the panel sizes to its content and scrolls when there are many.
// ─────────────────────────────────────────────────────────────────────────

function CategoryColumn({
  categories,
  selectedId,
  onSelect,
  eyebrow,
  label,
  locale,
}: {
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
  eyebrow: string;
  label: string;
  locale: string;
}): React.ReactElement {
  const isEs = locale === 'es';
  const countText = isEs ? `${categories.length} categorías` : `${categories.length} categories`;
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xs overflow-hidden">
      <PanelHeader eyebrow={eyebrow} title={countText} />
      <ul role="listbox" aria-label={label} className="max-h-[28rem] overflow-y-auto p-1.5 space-y-1">
        {categories.map((c) => {
          const isSelected = c.id === selectedId;
          const name = isEs ? c.nameEs : c.nameEn;
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
                    {isEs
                      ? `${subCount} ${subCount === 1 ? 'subcategoría' : 'subcategorías'}`
                      : `${subCount} ${subCount === 1 ? 'subcategory' : 'subcategories'}`}
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
// Subcategory column — same shape as the category column. Header carries
// the parent category's name as a title, so the manager always knows which
// category's subcategories are showing. Each row's scope line says
// "Applies to all stations" for general subcategories and renders assigned
// stations as compact badges for station-specific ones.
// ─────────────────────────────────────────────────────────────────────────

function SubcategoryColumn({
  subcategories,
  selectedId,
  onSelect,
  category,
  locale,
  eyebrow,
  noSubcategoriesLabel,
  scopeGeneralLabel,
}: {
  subcategories: Subcategory[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  category: Category | null;
  locale: string;
  eyebrow: string;
  noSubcategoriesLabel: string;
  scopeGeneralLabel: string;
}): React.ReactElement {
  const isEs = locale === 'es';
  const parentName = category ? (isEs ? category.nameEs : category.nameEn) : '';
  const isEmpty = subcategories.length === 0;
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xs overflow-hidden">
      <PanelHeader eyebrow={eyebrow} title={parentName} placeholder={noSubcategoriesLabel} muted={!category || isEmpty} />
      {!category ? (
        <EmptyHint message={isEs ? 'Selecciona una categoría' : 'Select a category'} />
      ) : isEmpty ? (
        <EmptyHint message={noSubcategoriesLabel} />
      ) : (
        <ul role="listbox" aria-label={eyebrow} className="max-h-[28rem] overflow-y-auto p-1.5 space-y-1">
          {subcategories.map((s) => {
            const isSelected = s.id === selectedId;
            const name = isEs ? s.nameEs : s.nameEn;
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
                    {s.isStationSpecific ? (
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-[var(--color-ink-3)] mr-0.5">
                          {isEs ? 'Estaciones:' : 'Stations:'}
                        </span>
                        {(s.stations ?? []).map((id) => {
                          const code = id.replace(/^stn-/, '').toUpperCase();
                          return (
                            <span
                              key={id}
                              className="inline-flex min-w-[32px] h-5 items-center justify-center px-2 text-[11px] font-semibold tracking-[0.02em] leading-none rounded-md bg-[var(--color-panel-2)] text-[var(--color-ink)] border border-[var(--color-line-2)] shadow-2xs"
                            >
                              {code}
                            </span>
                          );
                        })}
                      </span>
                    ) : (
                      <span className="block text-xs font-medium text-[var(--color-ink-3)]">
                        {scopeGeneralLabel}
                      </span>
                    )}
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

// ─────────────────────────────────────────────────────────────────────────
// Panel header — eyebrow + title. Title is the parent context (category
// name for the subcategory panel), not the column label. Muted when empty.
// ─────────────────────────────────────────────────────────────────────────

function PanelHeader({
  eyebrow,
  title,
  subtitle,
  placeholder,
  muted,
}: {
  eyebrow: string;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  muted?: boolean;
}): React.ReactElement {
  return (
    <header className="border-b border-[var(--color-line)] px-5 pt-4 pb-3.5 bg-[var(--color-surface)]">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-3)] leading-none">
        {eyebrow}
      </h4>
      {title ? (
        <p
          className={cn(
            'mt-1.5 truncate text-sm font-semibold leading-tight',
            muted ? 'text-[var(--color-ink-3)] italic font-normal' : 'text-[var(--color-ink)]',
          )}
        >
          {title || placeholder || '—'}
        </p>
      ) : placeholder ? (
        <p className="mt-1.5 truncate text-sm font-normal text-[var(--color-ink-3)] italic leading-tight">
          {placeholder}
        </p>
      ) : null}
      {subtitle && (
        <p className="mt-1 text-xs font-medium text-[var(--color-ink-2)] leading-normal">
          {subtitle}
        </p>
      )}
    </header>
  );
}

function EmptyHint({ message }: { message: string }): React.ReactElement {
  return (
    <div className="px-4 py-6 text-center">
      <p className="text-xs text-[var(--color-ink-3)] italic">{message}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Station scope panel — only shown when the chosen subcategory is
// station-specific. Two-mode radio (Specific / All) + checkbox list.
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
  eyebrowLabel,
  subtitleLabel,
  allStationsLabel,
  specificStationsLabel,
  suggestedLabel,
  applySuggestionLabel,
  emptyLabel,
  locale,
}: {
  stations: Station[];
  selectedStationIds: Set<string>;
  mode: StationScopeMode;
  onChangeMode: (mode: StationScopeMode) => void;
  onToggleStation: (id: string) => void;
  suggestedStationIds: string[];
  eyebrowLabel: string;
  subtitleLabel: string;
  allStationsLabel: string;
  specificStationsLabel: string;
  suggestedLabel: string;
  applySuggestionLabel: string;
  emptyLabel: string;
  locale: string;
}): React.ReactElement {
  const isEs = locale === 'es';
  const hasStations = stations.length > 0;

  // Has the manager already accepted the suggestion? Used to disable the
  // [Apply suggestion] button when the picker already matches.
  const suggestionApplied =
    suggestedStationIds.length > 0 &&
    suggestedStationIds.every((id) => selectedStationIds.has(id)) &&
    selectedStationIds.size === suggestedStationIds.length;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xs overflow-hidden">
      <PanelHeader eyebrow={eyebrowLabel} subtitle={subtitleLabel} />

      <div className="space-y-3 p-4">
        {/* Mode radio pair */}
        <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
          <ScopeOption
            checked={mode === 'specific'}
            onSelect={() => onChangeMode('specific')}
            title={specificStationsLabel}
            description={isEs ? 'Elige qué estaciones pueden ver este procedimiento.' : 'Pick which stations can see this procedure.'}
          />
          <ScopeOption
            checked={mode === 'all'}
            onSelect={() => onChangeMode('all')}
            title={allStationsLabel}
            description={isEs ? 'Visible para los cocineros sin importar la estación.' : 'Visible to cooks regardless of station.'}
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
                  {suggestedStationIds.map((id) => {
                    const stn = stations.find((s) => s.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--color-line-2)] bg-[var(--color-panel-2)] px-2 py-0.5 text-xs font-semibold text-[var(--color-ink)]"
                      >
                        {stn?.name ?? id}
                      </span>
                    );
                  })}
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
                  {suggestionApplied && <LuCheck aria-hidden="true" className="text-xs" />}
                  {applySuggestionLabel}
                </button>
              </div>
            )}

            {!hasStations ? (
              <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-2 text-xs text-[var(--color-ink-3)] italic">
                {emptyLabel}
              </p>
            ) : (
              <ul role="list" className="max-h-72 overflow-y-auto space-y-1 p-1.5">
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
                  {isEs
                    ? 'Elige al menos una estación o cambia a "Todas las estaciones".'
                    : 'Pick at least one station, or switch to “All stations.”'}
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
