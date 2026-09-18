'use client';

/**
 * Access-level selector — Everyone vs Restricted.
 *
 * Two large radio cards side-by-side. This is the wizard's top-level
 * choice: the procedure is either visible to every employee, or limited
 * to the locations / roles / stations / people picked in the rows below.
 * When "Everyone" is selected, the rows below render inert — the
 * selections stay in state for the audit trail and so the manager can
 * flip back to Restricted without re-picking.
 *
 * Visually mirrors the wireframe: a filled radio dot for the chosen
 * option, hollow for the other. Brand tint on the chosen card.
 *
 * Lives in its own file so the Access screen can render it alongside the
 * compact row components without entangling the radio markup with the
 * row layout.
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type AccessLevel = 'everyone' | 'restricted';

export interface AccessLevelSelectorProps {
  value: AccessLevel;
  onChange: (next: AccessLevel) => void;
}

interface OptionDef {
  id: AccessLevel;
  icon: string;
  titleKey: 'accessLevelEveryone' | 'accessLevelRestricted';
  descKey: 'accessLevelEveryoneDesc' | 'accessLevelRestrictedDesc';
}

const OPTIONS: OptionDef[] = [
  {
    id: 'everyone',
    icon: 'ri-earth-fill',
    titleKey: 'accessLevelEveryone',
    descKey: 'accessLevelEveryoneDesc',
  },
  {
    id: 'restricted',
    icon: 'ri-shield-user-fill',
    titleKey: 'accessLevelRestricted',
    descKey: 'accessLevelRestrictedDesc',
  },
];

export function AccessLevelSelector({
  value,
  onChange,
}: AccessLevelSelectorProps): React.ReactElement {
  const tAccess = useTranslations('admin.library.new.access');

  return (
    <section className="space-y-3">
      <header>
        <p className="text-[length:var(--text-xs)] font-bold uppercase tracking-[0.08em] text-[var(--color-ink-3)]">
          {tAccess('accessLevelEyebrow')}
        </p>
      </header>
      <div
        role="radiogroup"
        aria-label={tAccess('accessLevelEyebrow')}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {OPTIONS.map((opt) => {
          const isSelected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(opt.id)}
              className={cn(
                'group relative flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 text-left transition-all min-h-[88px]',
                isSelected
                  ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-tint)]/30 shadow-xs ring-2 ring-[var(--color-brand-600)]/30'
                  : 'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)]',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  isSelected
                    ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-600)]'
                    : 'border-[var(--color-line-3)] bg-transparent group-hover:border-[var(--color-ink-3)]',
                )}
                aria-hidden="true"
              >
                {isSelected && <span className="size-2 rounded-full bg-white" />}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'flex items-center gap-2 text-[length:var(--text-md)] font-bold tracking-[-0.01em]',
                    isSelected ? 'text-[var(--color-brand-700)]' : 'text-[var(--color-ink)]',
                  )}
                >
                  <i
                    aria-hidden="true"
                    className={cn(opt.icon, 'text-base', isSelected ? 'text-[var(--color-brand-600)]' : 'text-[var(--color-ink-2)]')}
                  />
                  {tAccess(opt.titleKey)}
                </span>
                <span className="mt-1 block text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
                  {tAccess(opt.descKey)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
