'use client';

/**
 * Multi-select access block — Location, Role, Station.
 *
 * One card per option, 2-up grid. The card lights up (brand border + tint +
 * check badge) when its id is in the `selected` set. The header shows the
 * block title, subtitle, and either a green count chip or a dashed "empty"
 * placeholder.
 *
 * Lives in its own file so the Access screen can be merged independently of
 * the wizard form. The wizard only imports this component; nothing else in
 * the form changes.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { AccessOption } from './access-data';

export interface AccessBlockProps {
  icon: string;
  title: string;
  subtitle: string;
  count: number;
  emptyLabel: string;
  items: AccessOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  hint: string;
}

export function AccessBlock({
  icon,
  title,
  subtitle,
  count,
  emptyLabel,
  items,
  selected,
  onToggle,
  hint,
}: AccessBlockProps): React.ReactElement {
  return (
    <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-sm">
      <header className="flex items-start justify-between gap-4 border-b border-[var(--color-line)]/60 pb-3">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] text-lg">
            <i aria-hidden="true" className={icon} />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-ui)] text-[length:var(--text-md)] font-bold tracking-[-0.01em] text-[var(--color-ink)]">
              {title}
            </h2>
            <p className="mt-0.5 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
              {subtitle}
            </p>
          </div>
        </div>
        {count > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-ok-tint)] px-2.5 py-1 text-[length:var(--text-xs)] font-bold text-[var(--color-ok)] border border-[var(--color-ok-tint-2)]">
            <i aria-hidden="true" className="ri-check-line text-sm" />
            {count}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--color-line-3)] bg-[var(--color-wash)] px-2.5 py-1 text-[length:var(--text-xs)] font-semibold text-[var(--color-ink-3)]">
            <i aria-hidden="true" className="ri-add-line text-sm" />
            {emptyLabel}
          </span>
        )}
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
        {items.map((opt) => {
          const isSelected = selected.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt.id)}
              aria-pressed={isSelected}
              className={cn(
                'group relative flex items-start gap-3 rounded-[var(--radius-lg)] border p-3.5 text-left transition-all min-h-[64px]',
                isSelected
                  ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-tint)]/40 shadow-xs ring-2 ring-[var(--color-brand-600)]/30'
                  : 'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)]',
              )}
            >
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-lg text-base shadow-2xs transition-colors',
                  isSelected
                    ? 'bg-[var(--color-brand-600)] text-white'
                    : 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
                )}
                aria-hidden="true"
              >
                <i className={opt.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[var(--color-ink)] truncate">
                  {opt.label}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--color-ink-2)] truncate">
                  {opt.sub}
                </span>
              </span>
              {isSelected && (
                <span className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white text-xs shadow-xs">
                  <i aria-hidden="true" className="ri-check-line font-bold" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-[var(--color-ink-3)] italic">{hint}</p>
    </section>
  );
}
