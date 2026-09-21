import * as React from 'react';
import Link from 'next/link';
import { getCategoryIcon } from '@/lib/category-icons';
import { Icon } from '@/components/ui/icon';
import type { Category, Procedure } from '@/lib/types';
import { LuArrowRight, LuChevronRight, LuSearch } from 'react-icons/lu';
import { ProcedureRow, type FlagLabels, type ProcedureFlags } from '@/components/employee/procedure-row';

/*
 * The cook's home, following /employee-home.html: who is signed in, the question
 * ("What do you need?"), then rows of real things with their photographs, and a
 * tab bar at the bottom of the screen.
 *
 * No greeting, no progress ring, no "procedure of the day" — a greeting costs the
 * top of a phone screen and says nothing, and the other two have no data behind
 * them. Targets are 48px and up, text starts at 16px.
 */

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

/** The reason the screen exists: one question, mid-shift, with wet hands. A plain
 *  form, so it works before JavaScript has loaded. */
export function Ask({
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
    <section aria-labelledby="ask-h" className="mt-10">
      <h1
        id="ask-h"
        className="font-[family-name:var(--font-display)] text-xl font-bold leading-display tracking-tight text-[var(--color-ink)]"
      >
        {heading}
      </h1>
      <form action={`/${locale}/procedures`} role="search" className="mt-4">
        <label htmlFor="q" className="sr-only">
          {label}
        </label>
        <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line-3)] bg-[var(--color-surface)] px-4 py-1 transition-colors duration-[var(--dur)] ease-[var(--ease)] focus-within:border-[var(--color-brand)]">
          <LuSearch aria-hidden="true" className="text-xl text-[var(--color-ink-2)]" />
          <input
            id="q"
            name="q"
            type="search"
            placeholder={placeholder}
            className="h-tap min-w-0 flex-1 border-0 bg-transparent text-md text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
          />
          <button
            type="submit"
            aria-label={label}
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-brand-700)]"
          >
            <LuArrowRight aria-hidden="true" className="text-lg" />
          </button>
        </div>
      </form>
      <p className="mt-3 text-base text-[var(--color-ink-2)]">{hint}</p>
    </section>
  );
}

function SectionHead({ title, all }: { title: string; all?: { href: string; label: string } }): React.ReactElement {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="min-w-0 text-md font-semibold leading-heading text-[var(--color-ink)]">{title}</h2>
      {all ? (
        <Link
          href={all.href}
          className="inline-flex min-h-tap shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-[var(--color-brand-700)]"
        >
          {all.label}
          <LuChevronRight aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

/** A row is the whole target: photograph, what it is, and where it lives. */
export function ProcedureRows({
  locale,
  heading,
  all,
  rows,
  flagLabels,
  empty,
}: {
  locale: string;
  heading: string;
  all?: { href: string; label: string };
  rows: {
    procedure: Procedure;
    cover?: string;
    title: string;
    meta: string;
    flags?: ProcedureFlags;
  }[];
  flagLabels: FlagLabels;
  empty: string;
}): React.ReactElement {
  return (
    <section className="mt-12">
      <SectionHead title={heading} all={all} />
      {rows.length === 0 ? (
        <p className="mt-3 text-base text-[var(--color-ink-2)]">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map(({ procedure, cover, title, meta, flags }) => (
            <li key={procedure.id}>
              <ProcedureRow
                href={`/${locale}/procedures/${procedure.slug}`}
                cover={cover}
                category={procedure.category}
                title={title}
                meta={meta}
                flags={flags}
                flagLabels={flagLabels}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CategoryGrid({
  locale,
  heading,
  all,
  categories,
  countOf,
  countLabel,
  empty,
}: {
  locale: string;
  heading: string;
  all?: { href: string; label: string };
  categories: Category[];
  countOf: (c: Category) => number;
  countLabel: (n: number) => string;
  empty: string;
}): React.ReactElement {
  return (
    <section className="mt-12">
      <SectionHead title={heading} all={all} />
      {categories.length === 0 ? (
        <p className="mt-3 text-base text-[var(--color-ink-2)]">{empty}</p>
      ) : (
        /* Chips, not cards. Six cards each the size of a postcard push everything
           else below the fold and say nothing more than their own name; a row of
           chips puts the whole library one tap away and still clears 48px. */
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {categories.map((c) => {
            const n = countOf(c);
            return (
              <li key={c.id}>
                <Link
                  href={`/${locale}/procedures?category=${encodeURIComponent(c.slug)}`}
                  className={`flex min-h-tap w-full items-center gap-2 rounded-full px-4 text-base font-semibold transition-colors duration-[var(--dur)] ease-[var(--ease)] ${
                    n === 0
                      ? 'bg-[var(--color-panel)] text-[var(--color-ink-3)]'
                      : 'bg-[var(--color-panel)] text-[var(--color-ink)] hover:bg-[var(--color-panel-2)]'
                  }`}
                >
                  {/* The chip the design system already specifies (.step-time): bone
                      ground, ink label, and the brand colour on the mark. Tried
                      neutral marks to quieten the row; the colour is what makes a
                      category scannable at a glance, so it stays. An empty category
                      keeps a grey mark, because there is nothing behind it to open. */}
                  <Icon
                    icon={getCategoryIcon(c)}
                    className={`text-lg ${n === 0 ? 'text-[var(--color-ink-3)]' : 'text-[var(--color-brand-600)]'}`}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {locale === 'es' ? c.nameEs || c.nameEn : c.nameEn || c.nameEs}
                  </span>
                  {n > 0 ? <span className="shrink-0 font-normal text-[var(--color-ink-2)]">{n}</span> : null}
                  <span className="sr-only">{countLabel(n)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
