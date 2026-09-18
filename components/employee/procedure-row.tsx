import * as React from 'react';
import Link from 'next/link';
import { LuChevronRight, LuCircleAlert, LuFocus, LuLanguages } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import { getCategoryIcon } from '@/lib/category-icons';
import type { Category } from '@/lib/types';

/**
 * One procedure, as a row a cook taps.
 *
 * There was one of these on the home and a second, slightly different one on the
 * browse page: 80px photo against 64px, flush against inset, flags on one and not
 * the other. Same object, same reader, same action — so it is one component, and
 * a change to it lands on both lists.
 *
 * The photograph fills the row rather than sitting in it as a square: a row with
 * warnings under the title is taller than one without, and a fixed square left a
 * band of empty card beside the flags. Stretching is also what makes the photo
 * read as the procedure's cover rather than as an icon of one.
 */

export interface ProcedureFlags {
  allergens: string[];
  hasCriticalStep: boolean;
  notInYourLanguage: boolean;
}

export interface FlagLabels {
  allergen: (list: string) => string;
  critical: string;
  english: string;
}

export function ProcedureRow({
  href,
  cover,
  category,
  title,
  meta,
  flags,
  flagLabels,
}: {
  href: string;
  cover?: string;
  /** Falls back to the category's icon when there is no photograph. */
  category?: Category | null;
  title: string;
  meta: string;
  flags?: ProcedureFlags;
  flagLabels?: FlagLabels;
}): React.ReactElement {
  const marks =
    flags && flagLabels && (flags.allergens.length > 0 || flags.hasCriticalStep || flags.notInYourLanguage);

  return (
    <Link
      href={href}
      className="flex items-stretch gap-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] pr-4"
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="w-20 shrink-0 self-stretch object-cover object-top" loading="lazy" />
      ) : (
        <span
          aria-hidden="true"
          className="flex w-20 shrink-0 items-center justify-center self-stretch bg-[var(--color-panel)] text-[var(--color-ink-2)]"
        >
          <Icon icon={getCategoryIcon(category ?? { slug: '' })} className="text-xl" />
        </span>
      )}

      <span className="min-w-0 flex-1 py-3">
        <span className="block text-md font-semibold leading-heading text-[var(--color-ink)]">{title}</span>
        <span className="mt-1 block text-base leading-meta text-[var(--color-ink-2)]">{meta}</span>
        {marks ? (
          <span className="mt-2 flex flex-wrap gap-2">
            {flags.allergens.length > 0 ? (
              <Flag tone="warn" icon={LuCircleAlert} text={flagLabels.allergen(flags.allergens.join(', '))} />
            ) : null}
            {flags.hasCriticalStep ? <Flag tone="bad" icon={LuFocus} text={flagLabels.critical} /> : null}
            {flags.notInYourLanguage ? <Flag tone="ink" icon={LuLanguages} text={flagLabels.english} /> : null}
          </span>
        ) : null}
      </span>

      <LuChevronRight aria-hidden="true" className="shrink-0 self-center text-xl text-[var(--color-ink-3)]" />
    </Link>
  );
}

/** A badge, not a button: rectangle, no tap target of its own. Colour carries the
 *  meaning — amber for an allergen, red for a step where safety is controlled. */
function Flag({
  tone,
  icon: Glyph,
  text,
}: {
  tone: 'warn' | 'bad' | 'ink';
  icon: typeof LuCircleAlert;
  text: string;
}): React.ReactElement {
  const tones = {
    warn: 'bg-[var(--color-warn-tint)] text-[var(--color-warn-ink)]',
    bad: 'bg-[var(--color-bad-tint)] text-[var(--color-bad)]',
    ink: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-0.5 text-sm font-semibold leading-meta ${tones[tone]}`}
    >
      <Glyph aria-hidden="true" />
      {text}
    </span>
  );
}
