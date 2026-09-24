import * as React from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { StatusPill, type StatusTone } from '@/components/ui/status-pill';
import { buttonClassName } from '@/components/ui/button';
import { ProcedureRow, type FlagLabels, type ProcedureFlags } from '@/components/employee/procedure-row';
import { AskBox } from './AskBox';
import { BackTo } from './BackTo';
import { ChangedLately } from './ChangedLately';
import { SectionHead } from './SectionHead';

/**
 * The employee's home: a line cook, a dishwasher, an intern on their third day.
 *
 * One page for all of them, arranged by what this person needs now rather than
 * by their job. Every section is there only when it has something in it, and
 * the order changes in one place: someone in their first weeks, or with training
 * past its date, sees their training first, because that is the work in front
 * of them. Everyone else sees Ask first, the thing they open the app for
 * mid-shift. (PROJECT_OVERVIEW §01: "procedures for their station, the training
 * assigned to them, and a search box".)
 *
 *   who  ·  [training | ask]  ·  back to  ·  changed for your station  ·  your station
 *
 * It restores what the first home had and the second dropped -- Ask, the shared
 * procedure row with its photo and its allergen and critical-step flags -- and
 * keeps what the second added: the training progress the client asked for.
 */

export interface HomeRow {
  key: string;
  slug: string;
  updatedAt: string;
  href: string;
  cover?: string;
  category: React.ComponentProps<typeof ProcedureRow>['category'];
  title: string;
  meta: string;
  flags: ProcedureFlags;
}

export interface TrainingSummary {
  heading: string;
  /** "1 of 4 done". */
  doneLine: string;
  /** "1 overdue", only when something is. */
  overdueLine?: string;
  done: number;
  total: number;
  /** The one thing to do next; absent when everything is done. */
  next?: { href: string; title: string; pill: { tone: StatusTone; text: string }; when: string; action: string };
  caughtUp: string;
  all: { href: string; label: string };
}

export function EmployeeHome({
  locale,
  readsSpanish,
  who,
  ask,
  training,
  trainingFirst,
  backTo,
  changed,
  station,
  flagLabels,
}: {
  locale: string;
  readsSpanish: boolean;
  who: { name: string; initials: string; line: string };
  ask: React.ComponentProps<typeof AskBox>;
  training: TrainingSummary | null;
  trainingFirst: boolean;
  backTo: { heading: string; opened: string };
  changed: { heading: string; rows: HomeRow[] };
  station: { heading: string; rows: HomeRow[]; all: { href: string; label: string }; empty: string };
  flagLabels: FlagLabels;
}): React.ReactElement {
  const trainingBlock = training ? <Training summary={training} first={trainingFirst} /> : null;

  return (
    <>
      {/* Who is signed in, once. The top bar says it too, in small type; the
          greeting that said it a third time is gone. */}
      <div className="flex items-center gap-3">
        <Avatar initials={who.initials} />
        <span className="min-w-0">
          <span className="block truncate text-base font-semibold leading-heading text-[var(--color-ink)]">{who.name}</span>
          <span className="block truncate text-sm leading-meta text-[var(--color-ink-2)]">{who.line}</span>
        </span>
      </div>

      {trainingFirst ? (
        <>
          {trainingBlock}
          <div className="mt-12">
            <AskBox {...ask} />
          </div>
        </>
      ) : (
        <>
          <div className="mt-8">
            <AskBox {...ask} />
          </div>
          {trainingBlock}
        </>
      )}

      {/* Back to a recipe left half-read: read on the device, absent until one is opened. */}
      <BackTo locale={locale} heading={backTo.heading} openedLabel={backTo.opened} readsSpanish={readsSpanish} />

      <ChangedLately
        heading={changed.heading}
        items={changed.rows.map((r) => ({
          key: r.key,
          slug: r.slug,
          updatedAt: r.updatedAt,
          row: (
            <ProcedureRow
              href={r.href}
              cover={r.cover}
              category={r.category}
              title={r.title}
              meta={r.meta}
              flags={r.flags}
              flagLabels={flagLabels}
            />
          ),
        }))}
      />

      <Rows
        id="station-h"
        heading={station.heading}
        rows={station.rows}
        flagLabels={flagLabels}
        all={station.all}
        empty={station.empty}
      />
    </>
  );
}

/**
 * Where this person stands and what to do next. The whole list lives on the
 * Training tab; the home carries the count, a bar, and the one next course, so
 * it answers "how much have I done" and "what now" without becoming the list.
 */
function Training({ summary, first }: { summary: TrainingSummary; first: boolean }): React.ReactElement {
  const pct = summary.total ? Math.round((summary.done / summary.total) * 100) : 0;
  return (
    <section aria-labelledby="training-h" className={first ? 'mt-8' : 'mt-12'}>
      <SectionHead id="training-h" title={summary.heading} all={summary.all} />
      <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <p className="flex flex-wrap items-baseline gap-x-2 text-base">
          <span className="font-semibold text-[var(--color-ink)]">{summary.doneLine}</span>
          {summary.overdueLine ? (
            <span className="font-semibold text-[var(--color-bad)]">· {summary.overdueLine}</span>
          ) : null}
        </p>
        <div
          role="progressbar"
          aria-label={summary.doneLine}
          aria-valuemin={0}
          aria-valuemax={summary.total}
          aria-valuenow={summary.done}
          className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-panel)]"
        >
          <div className="h-full rounded-full bg-[var(--color-ok-fill)]" style={{ width: `${pct}%` }} />
        </div>

        {summary.next ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--color-line)] pt-4">
            <span className="min-w-0 flex-1 basis-48">
              <span className="block font-semibold leading-heading text-[var(--color-ink)]">{summary.next.title}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--color-ink-2)]">
                <StatusPill tone={summary.next.pill.tone} withDot>
                  {summary.next.pill.text}
                </StatusPill>
                {summary.next.when}
              </span>
            </span>
            <Link href={summary.next.href} className={buttonClassName({ variant: 'primary', className: 'min-h-tap w-full sm:w-auto' })}>
              {summary.next.action}
            </Link>
          </div>
        ) : (
          <p className="mt-4 border-t border-[var(--color-line)] pt-4 font-semibold text-[var(--color-ok)]">{summary.caughtUp}</p>
        )}
      </div>
    </section>
  );
}

function Rows({
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
  /** Shown instead of hiding the section; without it an empty section is left out. */
  empty?: string;
}): React.ReactElement | null {
  if (rows.length === 0 && !empty) return null;
  return (
    <section aria-labelledby={id} className="mt-12">
      <SectionHead id={id} title={heading} all={all} />
      {rows.length === 0 ? (
        <p className="mt-4 text-base text-[var(--color-ink-2)]">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li key={r.key}>
              <ProcedureRow
                href={r.href}
                cover={r.cover}
                category={r.category}
                title={r.title}
                meta={r.meta}
                flags={r.flags}
                flagLabels={flagLabels}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
