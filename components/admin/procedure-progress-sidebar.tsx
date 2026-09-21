'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import type { ProcedureTypeId } from './procedure-type-selector';

interface ProgressSidebarProps {
  completedCount: number;
  totalCount: number;
  selectedType: ProcedureTypeId;
  categoryLabel: string;
  hasEn: boolean;
  hasEs: boolean;
  clearanceLabel: string;
  sections: Array<{ key: string; label: string; completed: boolean }>;
}

export function ProcedureProgressSidebar({
  completedCount,
  totalCount,
  selectedType,
  categoryLabel,
  hasEn,
  hasEs,
  clearanceLabel,
  sections,
}: ProgressSidebarProps): React.ReactElement {
  const t = useTranslations('admin.library.new.sidebar');
  const tTypes = useTranslations('admin.library.new.types');

  const typeLabel = tTypes(
    selectedType === 'recipe'
      ? 'typeRecipe'
      : selectedType === 'station'
        ? 'typeStation'
        : selectedType === 'cleaning'
          ? 'typeCleaning'
          : 'typeGeneral',
  );

  const percentage = Math.round((completedCount / totalCount) * 100);

  const languagesStr =
    hasEn && hasEs ? 'EN · ES' : hasEn ? 'English' : hasEs ? 'Español' : 'Not started';

  return (
    <aside className="space-y-6">
      {/* 1. Progress Card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-ink-3)]">
            {t('progressTitle')}
          </h3>
          <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
            {completedCount} of {totalCount} complete
          </p>
        </div>

        {/* Visual Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-line-2)]">
          <div
            className="h-full bg-[var(--color-brand-600)] transition-all duration-[var(--dur)] ease-[var(--ease)]"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <ul className="space-y-3 text-sm pt-1 border-t border-[var(--color-line)]">
          {sections.map((sec) => (
            <li key={sec.key} className="flex items-center gap-3">
              {sec.completed ? (
                <span className="flex size-4 items-center justify-center rounded-full bg-[var(--color-ok)] text-white text-sm font-bold">
                  ✓
                </span>
              ) : (
                <span className="size-4 rounded-full border border-[var(--color-line-3)]" />
              )}
              <span
                className={
                  sec.completed
                    ? 'font-medium text-[var(--color-ink)]'
                    : 'text-[var(--color-ink-2)]'
                }
              >
                {sec.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* 2. Quick info Card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-ink-3)]">
          {t('quickInfoTitle')}
        </h3>
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-[var(--color-ink-3)]">{t('quickType')}</dt>
            <dd className="font-semibold text-[var(--color-ink)]">{typeLabel}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[var(--color-ink-3)]">{t('quickCategory')}</dt>
            <dd className="font-semibold text-[var(--color-ink)]">{categoryLabel}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[var(--color-ink-3)]">{t('quickLanguages')}</dt>
            <dd className="font-semibold text-[var(--color-ink)]">{languagesStr}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[var(--color-ink-3)]">Access</dt>
            <dd className="font-semibold text-[var(--color-ink)]">{clearanceLabel}</dd>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-[var(--color-line)]">
            <dt className="text-[var(--color-ink-3)]">Status</dt>
            <dd className="font-semibold text-[var(--color-ink-2)]">Draft</dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}
