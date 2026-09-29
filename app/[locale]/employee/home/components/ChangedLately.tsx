'use client';

import * as React from 'react';
import { SectionHead } from './SectionHead';

/**
 * Procedures that changed lately, rendered as the server passed them in. The
 * server already filtered by the 14-day window and the station audience; this
 * component is a thin client-side presenter — no localStorage read, no
 * "hide if already seen" filter, so the SSR paint matches the post-hydration
 * paint (no flash where the section appears and then disappears the moment
 * `useEffect` runs).
 */
export function ChangedLately({
  heading,
  items,
}: {
  heading: string;
  items: { key: string; slug: string; updatedAt: string; row: React.ReactNode }[];
}): React.ReactElement | null {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="changed-h" className="mt-12">
      <SectionHead id="changed-h" title={heading} />
      <ul className="mt-4 space-y-3">
        {items.map((i) => (
          <li key={i.key}>{i.row}</li>
        ))}
      </ul>
    </section>
  );
}
