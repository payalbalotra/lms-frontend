import * as React from 'react';
import Link from 'next/link';
import { StatusPill } from '@/components/ui/status-pill';
import type { Procedure } from '@/lib/types';
import {
  LuCheck,
  LuChevronRight,
  LuClock3,
  LuPlay,
  LuSearch,
  LuArrowRight,
} from 'react-icons/lu';
import type { TrainingAssignmentRow } from '@/lib/types';

/*
 * The cook's home, action-first.
 *
 * Visual hierarchy (per DESIGN.md §8 + product spec):
 *
 *   1. Identity + time-of-day greeting              — compact
 *   2. Search                                       — compact, always visible
 *   3. Training section                             — one small stacked card
 *                                                     per unfinished training
 *                                                     (overdue, due-soon,
 *                                                     in-progress, assigned
 *                                                     further out all share
 *                                                     the same card shape),
 *                                                     with an inline stats row
 *                                                     (assigned / completed /
 *                                                     all) at the top of the
 *                                                     section. Empty state is
 *                                                     a single ✓ "caught up"
 *                                                     line.
 *   4. Procedures relevant to role / station        — compact LIST ROWS, not
 *                                                     cards. Fills the page
 *                                                     with useful content
 *                                                     without competing with
 *                                                     the training cards.
 *
 * Completed training is intentionally absent from the visible cards — the
 * stats row carries the count and the Training tab holds the history.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export type GreetingKey = 'greetingMorning' | 'greetingAfternoon' | 'greetingEvening';

export function greetingForDate(date: Date): GreetingKey {
  const h = date.getHours();
  if (h < 12) return 'greetingMorning';
  if (h < 18) return 'greetingAfternoon';
  return 'greetingEvening';
}

// ---------------------------------------------------------------------------
// WhoBar — identity row. Avatar + name + role/station line.
// ---------------------------------------------------------------------------

export function WhoBar({ name, line }: { name: string; line: string }): React.ReactElement {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-panel)] text-base font-semibold text-[var(--color-ink-2)]"
      >
        {initials}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-base font-semibold leading-heading text-[var(--color-ink)]">
          {name}
        </span>
        <span className="block truncate text-base leading-meta text-[var(--color-ink-2)]">{line}</span>
      </span>
    </div>
  );
}

/**
 * "Good morning, Chef Raúl". The page picks the greeting key server-side, so
 * SSR and hydration agree (no clock drift in the first paint).
 */
export function Greeting({
  firstName,
  greetingKey,
  greetingMorning,
  greetingAfternoon,
  greetingEvening,
}: {
  firstName: string;
  greetingKey: GreetingKey;
  greetingMorning: string;
  greetingAfternoon: string;
  greetingEvening: string;
}): React.ReactElement {
  const greeting =
    greetingKey === 'greetingMorning'
      ? greetingMorning
      : greetingKey === 'greetingAfternoon'
        ? greetingAfternoon
        : greetingEvening;
  return (
    <h1 className="mt-6 font-[family-name:var(--font-display)] text-2xl font-bold leading-display tracking-tight text-[var(--color-ink)] sm:text-3xl">
      {greeting || firstName}
    </h1>
  );
}

// ---------------------------------------------------------------------------
// SearchHero — submit to /procedures?q=…
// ---------------------------------------------------------------------------

export function SearchHero({
  locale,
  heading,
  label,
  placeholder,
  hint,
}: {
  locale: string;
  heading: string;
  label: string;
  placeholder: string;
  hint: string;
}): React.ReactElement {
  return (
    <section aria-labelledby="ask-h" className="mt-6">
      <p
        id="ask-h"
        className="font-[family-name:var(--font-display)] text-md font-semibold leading-heading tracking-tight text-[var(--color-ink)]"
      >
        {heading}
      </p>
      <form action={`/${locale}/procedures`} role="search" className="mt-3">
        <label htmlFor="q" className="sr-only">
          {label}
        </label>
        <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line-3)] bg-[var(--color-surface)] px-4 py-1 transition-colors duration-[var(--dur)] ease-[var(--ease)] focus-within:border-[var(--color-brand)]">
          <LuSearch aria-hidden="true" className="text-lg text-[var(--color-ink-2)]" />
          <input
            id="q"
            name="q"
            type="search"
            placeholder={placeholder}
            className="h-tap min-w-0 flex-1 border-0 bg-transparent text-base text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
          />
          <button
            type="submit"
            aria-label={label}
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-brand-hover)]"
          >
            <LuArrowRight aria-hidden="true" className="text-lg" />
          </button>
        </div>
      </form>
      <p className="mt-2 text-base text-[var(--color-ink-2)]">{hint}</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// SectionHead — small uppercase eyebrow shared by the three sections.
// ---------------------------------------------------------------------------

function SectionHead({
  title,
  seeAll,
}: {
  title: string;
  seeAll?: { href: string; label: string };
}): React.ReactElement {
  return (
    <div className="mt-12 flex items-baseline justify-between gap-3 first:mt-8">
      <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--color-ink-2)] sm:text-base">
        {title}
      </h2>
      {seeAll ? (
        <Link
          href={seeAll.href}
          className="inline-flex min-h-tap shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-[var(--color-brand-700)]"
        >
          {seeAll.label}
          <LuChevronRight aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrainingStackSection — one small stacked card per unfinished training.
// All statuses (overdue, due-soon, in-progress, assigned further out) share
// the same card shape so the list reads as a single queue. A compact stats
// row sits at the top of the section (assigned / completed / all counts).
// ---------------------------------------------------------------------------

export type TrainingCard = {
  href: string;
  title: string;
  statusPill: { tone: 'bad' | 'warn' | 'progress' | 'neutral'; text: string };
  /** Trailing text under the title — e.g. "Due in 3 days" or "Started 2 days ago". */
  dueLabel: string;
  /** "start" or "continue". */
  action: 'start' | 'continue';
  actionLabel: string;
};

export type TrainingStats = {
  /** Completed assignments. */
  completed: number;
  /** Total assignments (assigned + completed). */
  total: number;
  /** Localised "{done} of {total} completed" string. */
  progressLabel: string;
  /** Localised "# remaining" string. */
  remainingLabel: string;
};

export function TrainingStackSection({
  cards,
  stats,
  caughtUpTitle,
  caughtUpBody,
  seeAll,
}: {
  cards: TrainingCard[];
  stats: TrainingStats;
  caughtUpTitle: string;
  caughtUpBody: string;
  seeAll?: { href: string; label: string };
}): React.ReactElement {
  const isCaughtUp = cards.length === 0;

  // Progress 0..1 — derived from completed / total so the bar reads the same
  // whether the cook is fully caught up (1.0) or just starting (0). Capped at
  // 0 if there are no assignments at all (no bar to draw).
  const progressPercent =
    stats.total > 0 ? Math.min(100, Math.max(0, (stats.completed / stats.total) * 100)) : 0;

  return (
    <section aria-labelledby="training-h" className="mt-12 first:mt-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="training-h"
          className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--color-ink-2)] sm:text-base"
        >
          Your training
        </h2>
        {seeAll ? (
          <Link
            href={seeAll.href}
            className="inline-flex min-h-tap shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-[var(--color-brand-700)]"
          >
            {seeAll.label}
            <LuChevronRight aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      <div className="mt-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-semibold text-[var(--color-ink)]">{stats.progressLabel}</span>
          <span className="text-[var(--color-ink-2)]">{stats.remainingLabel}</span>
        </div>
        <div
          className="progress mt-2"
          role="progressbar"
          aria-label={stats.progressLabel}
          aria-valuenow={Math.round(progressPercent)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="track">
            <i style={{ width: `${Math.max(2, progressPercent)}%` }} />
          </div>
        </div>
      </div>

      {isCaughtUp ? (
        <div className="mt-3 flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3">
          <span
            aria-hidden="true"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-ok-tint)] text-[var(--color-ok)]"
          >
            <LuCheck className="text-base" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="font-semibold leading-heading text-[var(--color-ink)]">{caughtUpTitle}</span>
            <span className="text-sm text-[var(--color-ink-2)]">{caughtUpBody}</span>
          </span>
        </div>
      ) : (
        <ul
          className={`mt-3 grid gap-3 ${
            cards.length === 1
              ? 'grid-cols-1'
              : cards.length === 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {cards.slice(0, 6).map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="flex h-full flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-wash)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-600)]"
              >
                <StatusPill tone={r.statusPill.tone} withDot className="self-start font-semibold">
                  {r.statusPill.text}
                </StatusPill>
                <span className="min-w-0 flex-1">
                  <span className="block text-md font-semibold leading-heading text-[var(--color-ink)]">
                    {r.title}
                  </span>
                  <span className="mt-1 block text-sm leading-meta text-[var(--color-ink-2)]">{r.dueLabel}</span>
                </span>
                <span
                  className={`inline-flex min-h-tap w-full items-center justify-center gap-1 self-stretch rounded-full px-4 text-sm font-semibold ${
                    r.action === 'continue'
                      ? 'bg-[var(--color-brand-600)] text-white'
                      : 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]'
                  }`}
                >
                  <LuPlay aria-hidden="true" className="text-sm" />
                  {r.actionLabel}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// RelevantProceduresSection — compact list rows. Fills the page with useful
// content without competing with the training card.
// ---------------------------------------------------------------------------

export type ProcedureRowData = {
  href: string;
  title: string;
  meta: string;
};

export function RelevantProceduresSection({
  rows,
  title,
  seeAll,
  emptyBody,
  emptyBrowseLabel,
  emptyBrowseHref,
}: {
  rows: ProcedureRowData[];
  title: string;
  seeAll?: { href: string; label: string };
  emptyBody: string;
  emptyBrowseLabel?: string;
  emptyBrowseHref?: string;
}): React.ReactElement {
  return (
    <section aria-labelledby="relevant-h">
      <SectionHead title={title} seeAll={seeAll} />
      {rows.length === 0 ? (
        <div className="mt-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-4">
          <p className="text-base text-[var(--color-ink-2)]">{emptyBody}</p>
          {emptyBrowseLabel && emptyBrowseHref ? (
            <Link
              href={emptyBrowseHref}
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-700)]"
            >
              {emptyBrowseLabel}
              <LuChevronRight aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--color-line)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
          {rows.slice(0, 4).map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="flex min-h-tap items-center gap-3 px-4 py-3 transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-wash)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-brand-600)]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-md font-semibold leading-heading text-[var(--color-ink)]">{r.title}</span>
                  <span className="mt-0.5 block truncate text-sm leading-meta text-[var(--color-ink-2)]">{r.meta}</span>
                </span>
                <span aria-hidden="true" className="text-xl text-[var(--color-ink-3)]">
                  <LuChevronRight />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Top-level composition
// ---------------------------------------------------------------------------

export function EmployeeHome({
  locale,
  greetingKey,
  firstName,
  fullName,
  whoLine,
  searchHeading,
  searchLabel,
  searchPlaceholder,
  searchHint,
  greetingMorning,
  greetingAfternoon,
  greetingEvening,
  training,
  procedures,
  caughtUpTitle,
  caughtUpBody,
  errored = false,
  errorBody,
}: {
  locale: string;
  greetingKey: GreetingKey;
  firstName: string;
  fullName: string;
  whoLine: string;
  searchHeading: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchHint: string;
  greetingMorning: string;
  greetingAfternoon: string;
  greetingEvening: string;
  training: { cards: TrainingCard[]; stats: TrainingStats; seeAll?: { href: string; label: string } };
  procedures: { rows: ProcedureRowData[]; title: string; seeAll?: { href: string; label: string }; emptyBody: string; browseLabel?: string; browseHref?: string };
  caughtUpTitle: string;
  caughtUpBody: string;
  errored?: boolean;
  errorBody: string;
}): React.ReactElement {
  return (
    <>
      <WhoBar name={fullName} line={whoLine} />
      <Greeting
        firstName={firstName}
        greetingKey={greetingKey}
        greetingMorning={greetingMorning}
        greetingAfternoon={greetingAfternoon}
        greetingEvening={greetingEvening}
      />
      <SearchHero
        locale={locale}
        heading={searchHeading}
        label={searchLabel}
        placeholder={searchPlaceholder}
        hint={searchHint}
      />

      {errored ? (
        <p className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-bad-tint)] bg-[var(--color-bad-tint)] px-4 py-3 text-base text-[var(--color-bad)]">
          {errorBody}
        </p>
      ) : null}

      <TrainingStackSection
        cards={training.cards}
        stats={training.stats}
        caughtUpTitle={caughtUpTitle}
        caughtUpBody={caughtUpBody}
        seeAll={training.seeAll}
      />

      <RelevantProceduresSection
        rows={procedures.rows}
        title={procedures.title}
        seeAll={procedures.seeAll}
        emptyBody={procedures.emptyBody}
        emptyBrowseLabel={procedures.browseLabel}
        emptyBrowseHref={procedures.browseHref}
      />
    </>
  );
}

export type { TrainingAssignmentRow, Procedure };
