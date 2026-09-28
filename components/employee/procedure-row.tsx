import * as React from 'react';
import Link from 'next/link';
import { LuChevronRight, LuCircleAlert, LuFocus, LuLanguages } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import { getCategoryIcon } from '@/lib/category-icons';
import { StatusPill } from '@/components/ui/status-pill';
import type { Category } from '@/lib/types';


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
        <span className="block text-base font-semibold leading-heading text-[var(--color-ink)]">{title}</span>
        <span className="mt-1 block text-sm leading-meta text-[var(--color-ink-2)]">{meta}</span>
        {marks ? (
          <span className="mt-2 flex flex-wrap gap-2">
            {flags.allergens.length > 0 ? (
              <StatusPill tone="warn" icon={LuCircleAlert} className="font-semibold">
                {flagLabels.allergen(flags.allergens.join(', '))}
              </StatusPill>
            ) : null}
            {flags.hasCriticalStep ? (
              <StatusPill tone="bad" icon={LuFocus} className="font-semibold">
                {flagLabels.critical}
              </StatusPill>
            ) : null}
            {flags.notInYourLanguage ? (
              <StatusPill tone="info" icon={LuLanguages} className="font-semibold">
                {flagLabels.english}
              </StatusPill>
            ) : null}
          </span>
        ) : null}
      </span>

      <LuChevronRight aria-hidden="true" className="shrink-0 self-center text-xl text-[var(--color-ink-3)]" />
    </Link>
  );
}
