'use client';

/**
 * Assign tab — search input + scrollable list of employees.
 *
 * Separate file from the location/role/station AccessBlock because it has a
 * different layout (search box + list with avatar + meta) and shares nothing
 * with the option grid. The wizard only needs to import and render this; no
 * other wizard code changes when this file is updated.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { filterEmployees } from './access-data';

export interface AccessAssignBlockProps {
  title: string;
  subtitle: string;
  emptyLabel: string;
  searchPlaceholder: string;
  hint: string;
  selectedCount: number;
  selectedLabel: (count: number) => string;
  selected: Set<string>;
  onToggle: (id: string) => void;
  search: string;
  onSearchChange: (next: string) => void;
}

export function AccessAssignBlock({
  title,
  subtitle,
  emptyLabel,
  searchPlaceholder,
  hint,
  selectedCount,
  selectedLabel,
  selected,
  onToggle,
  search,
  onSearchChange,
}: AccessAssignBlockProps): React.ReactElement {
  const filtered = filterEmployees(search);

  return (
    <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-sm">
      <header className="flex items-start justify-between gap-4 border-b border-[var(--color-line)]/60 pb-3">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] text-lg">
            <i aria-hidden="true" className="ri-team-line" />
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
        {selectedCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-ok-tint)] px-2.5 py-1 text-[length:var(--text-xs)] font-bold text-[var(--color-ok)] border border-[var(--color-ok-tint-2)]">
            <i aria-hidden="true" className="ri-check-line text-sm" />
            {selectedLabel(selectedCount)}
          </span>
        )}
      </header>

      <div className="space-y-3 pt-1">
        <div className="relative">
          <i
            aria-hidden="true"
            className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-3)]"
          />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-3 text-sm h-9 bg-[var(--color-surface)] border-[var(--color-line-2)] focus:border-[var(--color-brand-600)]"
          />
        </div>

        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)]">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-[var(--color-ink-3)] italic">
              {emptyLabel}
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-line)]/60 max-h-72 overflow-y-auto">
              {filtered.map((emp) => {
                const isAssigned = selected.has(emp.id);
                return (
                  <li key={emp.id}>
                    <button
                      type="button"
                      onClick={() => onToggle(emp.id)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        isAssigned
                          ? 'bg-[var(--color-brand-tint)]/30'
                          : 'hover:bg-[var(--color-wash)]',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase tracking-wide shadow-2xs',
                          isAssigned
                            ? 'bg-[var(--color-brand-600)] text-white'
                            : 'bg-[var(--color-panel)] text-[var(--color-ink-2)] border border-[var(--color-line-2)]',
                        )}
                        aria-hidden="true"
                      >
                        {isAssigned ? <i className="ri-check-line" /> : emp.initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
                          {emp.name}
                        </span>
                        <span className="block truncate text-xs text-[var(--color-ink-2)]">
                          {emp.role} · {emp.station}
                        </span>
                      </span>
                      <i
                        aria-hidden="true"
                        className={cn(
                          'ri-checkbox-blank-circle-line text-lg',
                          isAssigned
                            ? 'text-[var(--color-brand-600)]'
                            : 'text-[var(--color-ink-3)]',
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="text-xs text-[var(--color-ink-3)] italic">{hint}</p>
      </div>
    </section>
  );
}
