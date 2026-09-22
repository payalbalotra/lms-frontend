'use client';

/**
 * Access-tier row — single-select Manager / Head Chef vs Employee.
 * Same pill-tab pattern as Job Role / Station rows so all three scan at
 * the same density. The picked tier's description surfaces as a small
 * helper line under the picker (only when something is picked).
 *
 * Admin is not offered here — admins can see everything, so the picker
 * doesn't need to surface them. Single-select lives outside the
 * `accessSelections` Set because a string carries the "no tier" state
 * more cleanly than a wrapper.
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { ACCESS_TIER_ROLES, type AccessOption } from './access-data';
import { AccessRow } from './access-row';

export interface AccessTierRowProps {
  title: string;
  emptyLabel: string;
  countLabel: (count: number) => string;
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
}

export function AccessTierRow({
  title,
  emptyLabel,
  countLabel,
  value,
  onChange,
  disabled = false,
}: AccessTierRowProps): React.ReactElement {
  const tAccess = useTranslations('admin.library.new.access');

  const handleSelect = (opt: AccessOption) => {
    // Clicking the already-selected tab clears the tier (lets the
    // manager revisit the row without committing to either option).
    onChange(value === opt.id ? null : opt.id);
  };

  const selectedDesc =
    value === 'role-manager'
      ? tAccess('tierManagerDesc')
      : value === 'role-employee'
        ? tAccess('tierEmployeeDesc')
        : null;

  return (
    <AccessRow
      icon="ri-shield-user-line"
      title={title}
      count={value ? 1 : 0}
      emptyLabel={emptyLabel}
      countLabel={countLabel}
      disabled={disabled}
    >
      <div
        role="radiogroup"
        aria-label={title}
        className={cn(
          'grid grid-cols-2 gap-2 pl-10 pt-1',
          disabled && 'pointer-events-none',
        )}
      >
        {ACCESS_TIER_ROLES.map((opt) => {
          const isSelected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSelect(opt)}
              disabled={disabled}
              className={cn(
                'group relative flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-left transition-all min-h-10',
                isSelected
                  ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] shadow-e1 ring-2 ring-[var(--color-brand-tint-2)]'
                  : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)]',
                disabled && 'cursor-not-allowed hover:bg-[var(--color-surface)] hover:border-[var(--color-line-2)] hover:text-[var(--color-ink)]',
              )}
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-md text-sm shadow-e1 transition-colors',
                  isSelected
                    ? 'bg-[var(--color-brand-600)] text-white'
                    : 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
                )}
                aria-hidden="true"
              >
                <Icon icon={opt.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-sm font-semibold truncate',
                    isSelected ? 'text-[var(--color-brand-700)]' : 'text-[var(--color-ink)]',
                  )}
                >
                  {opt.label}
                </span>
              </span>
              {isSelected && (
                <span
                  aria-hidden="true"
                  className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white text-sm shadow-e1"
                >
                  <Icon icon="ri-check-line" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Description surfaces only when a tier is picked — keeps the row quiet at rest. */}
      {selectedDesc && (
        <p className="pl-10 pt-2 text-sm text-[var(--color-ink-2)]">
          {selectedDesc}
        </p>
      )}

      {disabled && (
        <p className="pl-10 text-sm text-[var(--color-ink-3)] italic">
          {tAccess('publicDisabledHint')}
        </p>
      )}
    </AccessRow>
  );
}
