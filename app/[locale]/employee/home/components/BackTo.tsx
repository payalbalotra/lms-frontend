'use client';

import * as React from 'react';
import { ProcedureRow } from '@/components/employee/procedure-row';
import { readRecentViews, type RecentView } from '@/lib/recent-views';
import { SectionHead } from './SectionHead';

/**
 * The last two procedures this person opened. Read on the device after mount,
 * so the section is simply absent on first paint and for anyone who has not
 * opened anything yet.
 */
export function BackTo({
  locale,
  heading,
  openedLabel,
  readsSpanish,
}: {
  locale: string;
  heading: string;
  /** "Opened {when}"; the time is filled in here, where it is known. */
  openedLabel: string;
  readsSpanish: boolean;
}): React.ReactElement | null {
  const [views, setViews] = React.useState<RecentView[]>([]);
  React.useEffect(() => setViews(readRecentViews().slice(0, 2)), []);
  if (views.length === 0) return null;

  const rel = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const ago = (iso: string): string => {
    const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
    if (mins > -60) return rel.format(mins, 'minute');
    const hours = Math.round(mins / 60);
    if (hours > -24) return rel.format(hours, 'hour');
    return rel.format(Math.round(hours / 24), 'day');
  };

  return (
    <section aria-labelledby="back-h" className="mt-12">
      <SectionHead id="back-h" title={heading} />
      <ul className="mt-4 space-y-3">
        {views.map((v) => (
          <li key={v.slug}>
            <ProcedureRow
              href={`/${locale}/procedures/${v.slug}`}
              cover={v.cover}
              title={readsSpanish ? v.titleEs || v.titleEn : v.titleEn || v.titleEs}
              meta={openedLabel.replace('{when}', ago(v.at))}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
