import * as React from 'react';
import { ProcedureRow, type FlagLabels } from '@/components/employee/procedure-row';
import { SectionHead } from './SectionHead';
import type { HomeRow } from './EmployeeHome';

/**
 * The station's own procedures (and kitchen-wide procedures the cook may read).
 * Renders a "See all" link to the full Procedures tab.
 * Wrapped in a bordered card to group rows visually (matching reference design).
 *
 * All spacing uses inline styles — Tailwind v4 resets --spacing-* so mt-x,
 * space-y-x, p-x for non-registered steps produce zero CSS.
 */
export function StationSection({
  id,
  heading,
  rows,
  flagLabels,
  all,
  empty,
}: {
  id: string;
  heading: string;
  rows: HomeRow[];
  flagLabels: FlagLabels;
  all?: { href: string; label: string };
  empty?: string;
}): React.ReactElement | null {
  if (rows.length === 0 && !empty) return null;
  return (
    <section aria-labelledby={id} style={{ marginTop: '16px' }}>
      {/* Bordered card wrapping heading + rows */}
      <div
        className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]"
        style={{ padding: '14px 14px' }}
      >
        <SectionHead id={id} title={heading} all={all} />
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-2)]" style={{ marginTop: '10px' }}>{empty}</p>
        ) : (
          <ul style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rows.map((r) => (
              <li key={r.key}>
                <ProcedureRow
                  href={r.href}
                  cover={r.cover}
                  iconImageUrl={r.iconImageUrl}
                  category={r.category}
                  subcategory={r.subcategory}
                  title={r.title}
                  meta={r.meta}
                  flags={r.flags}
                  flagLabels={flagLabels}
                  locked={r.locked}
                  lockedHref={r.lockedHref}
                  lockedReason={r.lockedReason}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
