'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { LuBrush, LuBuilding2, LuFileText, LuUtensils } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import type { IconType } from 'react-icons';

export type ProcedureTypeId = 'recipe' | 'station' | 'cleaning' | 'general';

export interface ProcedureTypeOption {
  id: ProcedureTypeId;
  icon: IconType;
  labelKey: 'typeRecipe' | 'typeStation' | 'typeCleaning' | 'typeGeneral';
  descKey: 'typeRecipeDesc' | 'typeStationDesc' | 'typeCleaningDesc' | 'typeGeneralDesc';
}

export const PROCEDURE_TYPES: ProcedureTypeOption[] = [
  {
    id: 'recipe',
    icon: LuUtensils,
    labelKey: 'typeRecipe',
    descKey: 'typeRecipeDesc',
  },
  {
    id: 'station',
    icon: LuBuilding2,
    labelKey: 'typeStation',
    descKey: 'typeStationDesc',
  },
  {
    id: 'cleaning',
    icon: LuBrush,
    labelKey: 'typeCleaning',
    descKey: 'typeCleaningDesc',
  },
  {
    id: 'general',
    icon: LuFileText,
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
      <label className="text-sm font-semibold text-[var(--color-ink)]">
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
                  ? 'border-[var(--color-brand-600)] bg-[var(--color-surface)] ring-1 ring-[var(--color-brand-600)]'
                  : 'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:border-[var(--color-brand-tint-2)] hover:bg-[var(--color-wash)]',
              )}
            >
              {isSelected && (
                <span className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-sm text-white">
                  ✓
                </span>
              )}
              <div
                className={cn(
                  'mb-2 flex size-8 items-center justify-center rounded-full text-lg transition-colors',
                  isSelected
                    ? 'bg-[var(--color-panel)] text-[var(--color-ink)]'
                    : 'bg-[var(--color-wash)] text-[var(--color-ink-2)] group-hover:text-[var(--color-brand-700)]',
                )}
              >
                <Icon icon={type.icon} />
              </div>
              <span
                className={cn(
                  'text-sm font-semibold',
                  'text-[var(--color-ink)]',
                )}
              >
                {t(type.labelKey)}
              </span>
              <span className="mt-0.5 line-clamp-1 text-sm text-[var(--color-ink-2)]">
                {t(type.descKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
