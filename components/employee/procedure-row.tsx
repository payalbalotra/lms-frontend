import * as React from 'react';
import Link from 'next/link';
import { LuChevronRight, LuCircleAlert, LuFocus, LuLanguages } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import { CategoryArt } from '@/components/admin/category-art';
import { HoverImagePreview } from '@/components/ui/hover-image-preview';
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
  iconImageUrl,
  category,
  title,
  meta,
  flags,
  flagLabels,
}: {
  href: string;
  cover?: string;
  iconImageUrl?: string | null;
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
      className="group flex items-stretch gap-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] pr-4"
    >
      {cover ? (
        <HoverImagePreview src={cover} alt="">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="w-20 shrink-0 self-stretch rounded-l-[var(--radius-lg)] object-cover object-top" loading="lazy" />
        </HoverImagePreview>
      ) : iconImageUrl ? (
        <HoverImagePreview src={iconImageUrl} alt="">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={iconImageUrl}
            alt=""
            className="w-20 shrink-0 self-stretch rounded-l-[var(--radius-lg)] bg-[var(--color-panel)] object-contain p-2"
            loading="lazy"
          />
        </HoverImagePreview>
      ) : (
        <span
          aria-hidden="true"
          className="flex w-20 shrink-0 items-center justify-center self-stretch rounded-l-[var(--radius-lg)] bg-[var(--color-panel)] p-2"
        >
          <CategoryArt slug={category?.slug ?? null} className="size-full" />
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

// keep getCategoryIcon in the public re-export surface so callers that still
// import it via this module continue to work; remove once all callers switch.
export { getCategoryIcon };
