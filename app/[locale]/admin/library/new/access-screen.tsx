'use client';

/**
 * Access step on the new-procedure wizard.
 *
 * Three blocks, in order:
 *   1. Category accordion — every category is a row. Click the row to
 *      toggle selection AND expansion. When expanded, the category's
 *      subcategories appear as chips just below it. Clicking a chip
 *      narrows the scope to that subcategory.
 *   2. Station dropdown — single-select. Empty = every station.
 *   3. Assign employees — search + multi-select.
 *
 * No Everyone/Restricted toggle, no location dropdown, no tier picker,
 * no job-role picker.
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { AccessBlock } from './access-block';
import { AccessAssignBlock } from './access-assign-block';
import { ACCESS_STATIONS, type AccessOption } from './access-data';
import { Icon } from '@/components/ui/icon';
import type { Category, Subcategory } from '@/lib/types';

interface AccessScreenProps {
  selectedStations: Set<string>;
  assignedEmployees: Set<string>;
  categories: Category[];
  selectedCategoryIds: Set<string>;
  selectedSubcategoryIds: Set<string>;
  onToggleStation: (id: string) => void;
  onToggleEmployee: (id: string) => void;
  onToggleCategory: (id: string) => void;
  onToggleSubcategory: (id: string) => void;
  locale: string;
}

export function AccessScreen({
  selectedStations,
  assignedEmployees,
  categories,
  selectedCategoryIds,
  selectedSubcategoryIds,
  onToggleStation,
  onToggleEmployee,
  onToggleCategory,
  onToggleSubcategory,
  locale,
}: AccessScreenProps): React.ReactElement {
  const tAccess = useTranslations('admin.library.new.access');
  const isEs = locale === 'es';

  // ─── Track which row is open ─────────────────────────────────────────
  // Each category in the accordion has a chevron that toggles its
  // expansion. We track this in component state so the user can browse
  // without committing to the selection. A category auto-opens the first
  // time it's selected.
  const [openCategoryIds, setOpenCategoryIds] = React.useState<Set<string>>(
    () => new Set(selectedCategoryIds),
  );

  const toggleOpen = React.useCallback((id: string): void => {
    setOpenCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Click on the row toggles BOTH selection and expansion in one motion —
  // selecting a category opens it, deselecting closes it.
  const handleRowClick = React.useCallback(
    (id: string): void => {
      onToggleCategory(id);
      setOpenCategoryIds((prev) => {
        const next = new Set(prev);
        const willBeSelected = !selectedCategoryIds.has(id);
        if (willBeSelected) next.add(id);
        else next.delete(id);
        return next;
      });
    },
    [onToggleCategory, selectedCategoryIds],
  );

  const subLabel = (s: Subcategory) => (isEs ? s.nameEs : s.nameEn);
  const catLabel = (c: Category) => (isEs ? c.nameEs : c.nameEn);

  const stationOptions: AccessOption[] = React.useMemo(
    () =>
      ACCESS_STATIONS.map((s) => ({
        id: s.id,
        label: s.label,
        sub: s.sub,
        icon: s.icon,
      })),
    [],
  );

  return (
    <div className="space-y-8">
      {/* Page-level heading */}
      <header className="flex items-start gap-3">
        <div className="flex size-tap-admin shrink-0 items-center justify-center rounded-lg bg-[var(--color-panel)] text-[var(--color-ink-2)] text-lg">
          <Icon icon="ri-shield-user-line" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase text-[var(--color-ink-3)]">
            {tAccess('accessEyebrow')}
          </p>
          <h2 className="mt-0.5 font-[family-name:var(--font-ui)] text-md font-semibold tracking-snug text-[var(--color-ink)]">
            {tAccess('accessTitle')}
          </h2>
          <p className="mt-0.5 text-sm text-[var(--color-ink-2)]">
            {tAccess('accessSubtitle')}
          </p>
        </div>
      </header>

      <section className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-e1">
        {/* 1. Category accordion */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3 pb-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-3)]">
                {tAccess('categoryAccordionEyebrow')}
              </p>
              <h3 className="mt-1 text-md font-semibold tracking-snug text-[var(--color-ink)]">
                {tAccess('categoryAccordionTitle')}
              </h3>
            </div>
            <span className="text-xs font-medium text-[var(--color-ink-3)]">
              {tAccess('rowSelected', { count: selectedCategoryIds.size })}
            </span>
          </div>

          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)]">
            {categories.map((cat, idx) => {
              const isSelected = selectedCategoryIds.has(cat.id);
              const isOpen = openCategoryIds.has(cat.id);
              const subs = cat.subcategories ?? [];
              const lastRow = idx === categories.length - 1;
              return (
                <div
                  key={cat.id}
                  className={cn(!lastRow && 'border-b border-[var(--color-line)]')}
                >
                  <button
                    type="button"
                    onClick={() => handleRowClick(cat.id)}
                    aria-expanded={isOpen}
                    aria-pressed={isSelected}
                    className={cn(
                      'group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors min-h-tap-admin',
                      isSelected
                        ? 'bg-[var(--color-brand-tint)]'
                        : 'hover:bg-[var(--color-wash)]',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-md text-sm transition-transform',
                        isOpen && 'rotate-90',
                      )}
                    >
                      <Icon icon="ri-arrow-right-s-line" className="text-base" />
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-base shadow-e1 transition-colors',
                        isSelected
                          ? 'bg-[var(--color-brand-600)] text-white'
                          : 'bg-[var(--color-panel)] text-[var(--color-ink-2)] group-hover:text-[var(--color-ink)]',
                      )}
                    >
                      <Icon icon={cat.icon ?? 'ri-folder-line'} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block text-sm font-semibold truncate',
                          isSelected ? 'text-[var(--color-brand-700)]' : 'text-[var(--color-ink)]',
                        )}
                      >
                        {catLabel(cat)}
                      </span>
                      <span className="block text-xs text-[var(--color-ink-3)] font-medium">
                        {tAccess('subcategoryCount', { count: subs.length })}
                      </span>
                    </span>
                    {isSelected && (
                      <span
                        aria-hidden="true"
                        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white"
                      >
                        <Icon icon="ri-check-line" className="text-xs font-semibold" />
                      </span>
                    )}
                  </button>

                  {/* Subcategories — only when this row is expanded. */}
                  {isOpen && (
                    <div className="border-t border-dashed border-[var(--color-line-2)] bg-[var(--color-wash)] px-4 py-3 pl-16">
                      {subs.length === 0 ? (
                        <p className="text-xs text-[var(--color-ink-3)] italic">
                          {tAccess('subcategoryNoMatchHint')}
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {subs.map((s) => {
                            const isSubSelected = selectedSubcategoryIds.has(s.id);
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={(e) => {
                                  // Stop propagation so the click doesn't
                                  // also fire the row's handleRowClick.
                                  e.stopPropagation();
                                  onToggleSubcategory(s.id);
                                }}
                                aria-pressed={isSubSelected}
                                className={cn(
                                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-all min-h-10',
                                  isSubSelected
                                    ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] shadow-e1 ring-2 ring-[var(--color-brand-tint-2)]'
                                    : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)]',
                                )}
                              >
                                {isSubSelected && (
                                  <Icon icon="ri-check-line" className="text-sm" aria-hidden="true" />
                                )}
                                <span>{subLabel(s)}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Stations — single-select dropdown. Empty = every station. */}
        <div className="mt-6 border-t border-[var(--color-line)] pt-6">
          <AccessBlock
            icon="ri-store-2-line"
            title={tAccess('stationTitle')}
            emptyLabel={tAccess('stationAllStationsLabel')}
            countLabel={(count) =>
              count === 0 ? tAccess('stationAllStationsLabel') : tAccess('stationSingleLabel')
            }
            options={stationOptions}
            selected={selectedStations}
            onToggle={onToggleStation}
            variant="dropdown"
            dropdownPlaceholder={tAccess('stationDropdownPlaceholder')}
          />
        </div>

        {/* 3. Assign employees */}
        <div className="mt-6 border-t border-[var(--color-line)] pt-6">
          <AccessAssignBlock
            title={tAccess('assignTitle')}
            emptyLabel={tAccess('assignEmpty')}
            countLabel={(count) => tAccess('rowSelected', { count })}
            selected={assignedEmployees}
            onToggle={onToggleEmployee}
            selectedStations={selectedStations}
          />
        </div>
      </section>
    </div>
  );
}
