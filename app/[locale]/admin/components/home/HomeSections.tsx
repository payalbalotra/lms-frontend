import * as React from 'react';
import Link from 'next/link';
import { getCategoryIcon } from '@/lib/category-icons';
import type { Procedure } from '@/lib/types';
import { categoryName, coverOf, titleOf, type AttentionGroup, type AttentionItem } from './home-data';
import { LuArrowRight, LuArrowUp, LuCalendar, LuCheck, LuChevronRight, LuFileText, LuPencil, LuPlus } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import { Meter } from '@/components/ui/meter';
import { CountBadge, StatusPill } from '@/components/ui/status-pill';
import { Button, buttonClassName } from '@/components/ui/button';
import type { IconType } from 'react-icons';

/*
 * One column. White surfaces sit on the admin ground where there is something
 * to read or act on; nothing is boxed twice, and nothing moves on hover except
 * the controls themselves.
 */


/* ---------------------------------------------------------------- header -- */

export function HomeHeader({
  place,
  headline,
  actions,
}: {
  place: string;
  headline: string;
  actions: { href: string; label: string; icon: IconType; primary?: boolean }[];
}): React.ReactElement {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-2)]">
          <LuCalendar aria-hidden="true" />
          {place}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold leading-display tracking-tight text-[var(--color-ink)] sm:text-2xl">
          {headline}
        </h1>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className={buttonClassName({ variant: a.primary ? 'primary' : 'surface' })}
          >
            {a.label}
            <Icon icon={a.icon} className="text-base" />
          </Link>
        ))}
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------- stats -- */

export interface Stat {
  label: string;
  icon: IconType;
  value: string;
  note: string;
  /** Both halves must be real. A tile with nothing to measure gets no ring. */
  meter?: { value: number; total: number; tone?: 'ok' | 'warn' };
  /** up: something was added. caution: something is waiting on the manager.
   *  muted: nothing to count yet. */
  tone?: 'up' | 'caution' | 'muted';
}

/** Four numbers, each on its own white card with its icon. Read, not clicked:
 *  the lists they count are one step away in the sidebar and in the rows below. */
export function StatStrip({ stats }: { stats: Stat[] }): React.ReactElement {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map((s) => (
        <li
          key={s.label}
          className="flex min-w-0 flex-col rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 shadow-e1 sm:p-5"
        >
          {/* The icon sits on the label, not in a grey tile of its own: four cards
              each carrying an identical rounded tile is the shape that makes a
              dashboard read as generated rather than designed. */}
          <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)]">
            <Icon icon={s.icon} className="text-base text-[var(--color-ink-3)]" />
            {s.label}
          </span>
          {/* Number and note share a line, so a card reads as one sentence — "7,
              two added this week" — rather than a figure with a caption parked
              under it. Common baseline; the note drops under the number only when
              the card is too narrow to hold both. */}
          {/* A share reads as a ring with the figure inside it; a count reads as the
              figure with its note beside it. Two shapes, because they are two
              different kinds of number. */}
          {/* Ring over note on a phone, side by side from sm up. In a two-column
              grid at 390px the card is 168px wide: a 72px ring, a 16px gap and a
              line that must not break left the row 53px wider than its column,
              and the page scrolled sideways. */}
          {s.meter ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Meter value={s.meter.value} total={s.meter.total} tone={s.meter.tone} size={64} stroke={7} label={s.value} />
              <span className="min-w-0 text-sm leading-meta text-[var(--color-ink-2)]">{s.note}</span>
            </div>
          ) : (
          <div className="mt-4 flex items-center gap-4">
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
            {/* A tile with nothing to count says so in words. An em dash standing
                where the number goes reads as a value that failed to load, and
                beside the note it reads as a strikethrough. */}
            {s.value ? (
            <span
              className={`font-[family-name:var(--font-display)] text-2xl font-bold leading-display tracking-tight ${
                s.tone === 'muted' ? 'text-[var(--color-ink-3)]' : 'text-[var(--color-ink)]'
              }`}
            >
              {s.value}
            </span>
            ) : null}
            <span
              className={`flex min-w-0 flex-1 items-baseline gap-1 leading-meta ${
                s.value ? 'text-sm' : 'text-md'
              } ${
                s.tone === 'caution'
                  ? 'font-semibold text-[var(--color-warn-ink)]'
                  : s.tone === 'up'
                    ? 'font-semibold text-[var(--color-ink)]'
                    : 'text-[var(--color-ink-2)]'
              }`}
            >
              {s.tone === 'caution' ? <span aria-hidden="true" className="mr-1 size-2 shrink-0 -translate-y-0.5 rounded-full bg-[var(--color-warn)]" /> : null}
              {s.tone === 'up' ? <LuArrowUp aria-hidden="true" className="shrink-0" /> : null}
              {s.note}
            </span>
            </div>
          </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------------------------------------- resume -- */

/** Where you left off, as one line under the numbers: impossible to miss, and no
 *  bigger than the thing it points at. */
export function ResumeLine({
  procedure,
  locale,
  label,
  meta,
  cta,
}: {
  procedure: Procedure;
  locale: string;
  label: string;
  meta: string;
  cta: string;
}): React.ReactElement {
  const cover = coverOf(procedure, locale);
  return (
    <Link
      href={`/${locale}/procedures/${procedure.slug}`}
      className="group flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 shadow-e1 sm:px-6"
    >
      <Thumb src={cover?.src} icon={procedure.category ? getCategoryIcon(procedure.category) : LuPencil} tint />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[var(--color-brand-700)]">{label}</span>
        <span className="block truncate text-md font-semibold leading-heading text-[var(--color-ink)]">{titleOf(procedure, locale)}</span>
        <span className="block text-sm text-[var(--color-ink-2)]">{meta}</span>
      </span>
      {/* The one peach control on the admin home, and the one with an arrow: the
          arrow belongs to resumption, which the research says has to be
          impossible to miss. A row action that borrowed either would be claiming
          to be this.

          Written out rather than built from the shared button class: that class
          sets inline-flex, this control is hidden below sm, and which of the two
          wins would depend on CSS order. */}
      <span className={`${buttonClassName({ variant: 'secondary' })} hidden shrink-0 font-semibold sm:inline-flex`}>
        {cta}
        <LuArrowRight aria-hidden="true" />
      </span>
      <LuChevronRight aria-hidden="true" className="text-lg text-[var(--color-ink-3)] sm:hidden" />
    </Link>
  );
}

function Thumb({ src, icon, initials, tint }: { src?: string; icon?: IconType; initials?: string; tint?: boolean }): React.ReactElement {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="size-12 shrink-0 rounded-[var(--radius-md)] object-cover" />;
  }
  if (initials) {
    return (
      <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-panel)] font-semibold text-[var(--color-ink)]">
        {initials}
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${
        tint ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]' : 'bg-[var(--color-panel)] text-[var(--color-ink-2)]'
      }`}
    >
      <Icon icon={icon ?? LuFileText} className="text-lg" />
    </span>
  );
}

/* ------------------------------------------------------------- attention -- */

export interface GroupCopy {
  title: string;
  action: string;
  tone: 'warn' | 'bad' | 'ink';
}

const TONE_DOT: Record<GroupCopy['tone'], string> = {
  warn: 'bg-[var(--color-warn)]',
  bad: 'bg-[var(--color-bad-fill)]',
  ink: 'bg-[var(--color-ink-3)]',
};

/**
 * A row's action is neutral, always — including the drafts group, which used to
 * take the peach secondary.
 *
 * Peach said "this one matters more", but the row is not what matters: the group
 * is, and the group already says so with its dot, its heading and its place in
 * the order. Five peach pills down a card are five claims of "most important" on
 * one screen, and the screen has exactly one of those — Continue, on the resume
 * line. Same reason the library's row actions are neutral.
 */
function AttentionRow({ item, action }: { item: AttentionItem; action: string }): React.ReactElement {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--color-line)] py-4 last:border-b-0">
      <Thumb src={item.image?.src} icon={item.icon} initials={item.initials} />
      <div className="min-w-0 flex-1 basis-[var(--field-md)]">
        <p className="text-md font-semibold leading-heading text-[var(--color-ink)]">{item.title}</p>
        <p className="mt-1 text-sm leading-meta text-[var(--color-ink-2)]">{item.meta.join(' · ')}</p>
      </div>
      <Link href={item.href} className="ml-16 sm:ml-0">
        <Button
          type="button"
          variant="neutral"
          size="sm"
          icon={item.kind === 'emptyCategory' ? LuPlus : undefined}
        >
          {action}
          <span className="sr-only">: {item.title}</span>
        </Button>
      </Link>
    </li>
  );
}

export function AttentionList({
  heading,
  groups,
  copy,
  empty,
}: {
  heading: string;
  groups: AttentionGroup[];
  copy: Record<AttentionGroup['kind'], GroupCopy>;
  empty: { title: string; body: string };
}): React.ReactElement {
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return (
    <section
      aria-labelledby="attn-h"
      className="rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-5 shadow-e1 sm:px-6 sm:py-6"
    >
      <div className="flex items-center gap-3">
        <h2 id="attn-h" className="text-lg font-semibold leading-heading tracking-snug text-[var(--color-ink)]">
          {heading}
        </h2>
        {total > 0 ? (
          <CountBadge tone="warn">{total}</CountBadge>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <p className="mt-4 flex items-start gap-3">
          <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-ok-tint)] text-[var(--color-ok)]">
            <LuCheck />
          </span>
          <span>
            <span className="block font-semibold text-[var(--color-ink)]">{empty.title}</span>
            <span className="block text-[var(--color-ink-2)]">{empty.body}</span>
          </span>
        </p>
      ) : (
        groups.map((g, i) => {
          const c = copy[g.kind];
          return (
            <div key={g.kind} className={i === 0 ? 'mt-5' : 'mt-2 border-t border-[var(--color-line)] pt-5'}>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)]">
                <span aria-hidden="true" className={`size-2 rounded-full ${TONE_DOT[c.tone]}`} />
                {c.title}
                <CountBadge tone={c.tone === 'bad' ? 'bad' : c.tone === 'warn' ? 'warn' : 'info'}>
                  {g.items.length}
                </CountBadge>
              </h3>
              <ul className="mt-1">
                {g.items.map((it) => (
                  <AttentionRow key={it.key} item={it} action={c.action} />
                ))}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- recent -- */

export function RecentProcedures({
  locale,
  heading,
  seeAll,
  procedures,
  metaFor,
  statusLabel,
}: {
  locale: string;
  heading: string;
  seeAll: string;
  procedures: Procedure[];
  metaFor: (p: Procedure) => string;
  statusLabel: (p: Procedure) => string;
}): React.ReactElement | null {
  if (procedures.length === 0) return null;
  return (
    <section aria-labelledby="recent-h">
      <div className="flex items-center justify-between gap-3">
        <h2 id="recent-h" className="text-lg font-semibold leading-heading tracking-snug text-[var(--color-ink)]">
          {heading}
        </h2>
        <Link
          href={`/${locale}/admin/library`}
          className="inline-flex min-h-tap-admin items-center gap-1 text-sm font-semibold text-[var(--color-brand-700)] hover:text-[var(--color-brand-600)]"
        >
          {seeAll}
          <LuArrowRight aria-hidden="true" />
        </Link>
      </div>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {procedures.map((p) => {
          const cover = coverOf(p, locale);
          return (
            <li key={p.id}>
              <Link
                href={`/${locale}/procedures/${p.slug}`}
                className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-e1"
              >
                <span className="relative flex aspect-video items-center justify-center overflow-hidden bg-[var(--color-panel)]">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    // Fills the card, anchored to the top: these covers carry their
                    // own title across the top, so what gets cropped is the floor,
                    // not the heading.
                    <img src={cover.src} alt="" className="size-full object-cover object-top" />
                  ) : (
                    <Icon icon={p.category ? getCategoryIcon(p.category) : LuFileText} className="text-3xl text-[var(--color-ink-3)]" />
                  )}
                  <StatusPill
                    tone={p.status === 'published' ? 'ok' : 'neutral'}
                    withDot
                    className="absolute left-3 top-3 font-semibold shadow-e1"
                  >
                    {statusLabel(p)}
                  </StatusPill>
                </span>
                <span className="flex flex-1 flex-col p-4">
                  {/* On a card the category stands alone above the title, so it is
                      a badge and wears the badge shape. In a list row it sits in a
                      meta sentence — "Station Procedures · EN/ES · Updated Sep 4" —
                      where a badge would be a box around one word of a line. */}
                  {p.category ? (
                    <StatusPill tone="info" className="self-start gap-2">
                      <Icon icon={getCategoryIcon(p.category)} className="text-base" />
                      {categoryName(p.category, locale)}
                    </StatusPill>
                  ) : null}
                  <span className="mt-3 block text-md font-semibold leading-heading text-[var(--color-ink)]">{titleOf(p, locale)}</span>
                  <span className="mt-auto block pt-2 text-sm text-[var(--color-ink-2)]">{metaFor(p)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
