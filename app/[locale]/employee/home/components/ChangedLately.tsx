'use client';

import * as React from 'react';
import { readRecentViews } from '@/lib/recent-views';
import { SectionHead } from './SectionHead';

/**
 * Procedures that changed lately, less the ones this person has already read
 * since the change: "changed" is only news until you have seen it. The rows
 * are rendered by the server and handed in; this only decides which to keep,
 * once the device's reading history is available after mount. Nothing left,
 * no section.
 */
export function ChangedLately({
  heading,
  items,
}: {
  heading: string;
  items: { key: string; slug: string; updatedAt: string; row: React.ReactNode }[];
}): React.ReactElement | null {
  const [readAt, setReadAt] = React.useState<Map<string, number> | null>(null);
  React.useEffect(() => {
    setReadAt(new Map(readRecentViews().map((v) => [v.slug, new Date(v.at).getTime()])));
  }, []);

  const fresh = items.filter((i) => {
    const seen = readAt?.get(i.slug);
    return !seen || seen < new Date(i.updatedAt).getTime();
  });
  if (fresh.length === 0) return null;

  return (
    <section aria-labelledby="changed-h" className="mt-12">
      <SectionHead id="changed-h" title={heading} />
      <ul className="mt-4 space-y-3">
        {fresh.map((i) => (
          <li key={i.key}>{i.row}</li>
        ))}
      </ul>
    </section>
  );
}
