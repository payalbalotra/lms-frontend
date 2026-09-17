'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type ProcedureTypeId = 'recipe' | 'station' | 'cleaning' | 'general';

export interface ProcedureTypeOption {
  id: ProcedureTypeId;
  icon: string;
  labelKey: 'typeRecipe' | 'typeStation' | 'typeCleaning' | 'typeGeneral';
  descKey: 'typeRecipeDesc' | 'typeStationDesc' | 'typeCleaningDesc' | 'typeGeneralDesc';
}

export const PROCEDURE_TYPES: ProcedureTypeOption[] = [
  {
    id: 'recipe',
    icon: 'ri-restaurant-line',
    labelKey: 'typeRecipe',
    descKey: 'typeRecipeDesc',
  },
  {
    id: 'station',
    icon: 'ri-community-line',
    labelKey: 'typeStation',
    descKey: 'typeStationDesc',
  },
  {
    id: 'cleaning',
    icon: 'ri-brush-line',
    labelKey: 'typeCleaning',
    descKey: 'typeCleaningDesc',
  },
  {
    id: 'general',
    icon: 'ri-file-text-line',
    labelKey: 'typeGeneral',
    descKey: 'typeGeneralDesc',
  },
];

interface ProcedureTypeSelectorProps {
  selected: ProcedureTypeId;
  onChange: (type: ProcedureTypeId) => void;
}

export function ProcedureTypeSelector({
  selected,
  onChange,
}: ProcedureTypeSelectorProps): React.ReactElement {
  const t = useTranslations('admin.library.new.types');

  return (
    <div className="space-y-2">
      <label className="text-[length:var(--text-sm)] font-semibold text-[var(--color-ink)]">
        {t('label')}
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PROCEDURE_TYPES.map((type) => {
          const isSelected = selected === type.id;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onChange(type.id)}
              className={cn(
                'group relative flex flex-col items-center justify-center rounded-[var(--radius-lg)] border p-3 text-center transition-all',
                isSelected
                  ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-tint)]/40 shadow-xs ring-2 ring-[var(--color-brand-600)]/30'
                  : 'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:border-[var(--color-brand-600)]/50 hover:bg-[var(--color-wash)]',
              )}
            >
              {isSelected && (
                <span className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-[10px] text-white">
                  ✓
                </span>
              )}
              <div
                className={cn(
                  'mb-1.5 flex size-8 items-center justify-center rounded-full text-lg transition-colors',
                  isSelected
                    ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]'
                    : 'bg-[var(--color-wash)] text-[var(--color-ink-2)] group-hover:text-[var(--color-brand-700)]',
                )}
              >
                <i aria-hidden="true" className={type.icon} />
              </div>
              <span
                className={cn(
                  'text-[length:var(--text-xs)] font-bold',
                  isSelected ? 'text-[var(--color-brand-700)]' : 'text-[var(--color-ink)]',
                )}
              >
                {t(type.labelKey)}
              </span>
              <span className="mt-0.5 line-clamp-1 text-[11px] text-[var(--color-ink-2)]">
                {t(type.descKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
