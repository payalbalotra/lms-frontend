import * as React from 'react';
import Link from 'next/link';
import { LuChevronRight, LuCircleAlert, LuFocus, LuLanguages } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import { HoverImagePreview } from '@/components/ui/hover-image-preview';
import { getCategoryIcon, getProcedureIcon, getSubcategoryIcon } from '@/lib/category-icons';
import { StatusPill } from '@/components/ui/status-pill';
import type { Category, Subcategory } from '@/lib/types';


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
  subcategory,
  title,
  meta,
  flags,
  flagLabels,
}: {
  href: string;
  cover?: string;
  iconImageUrl?: string | null;
  category?: Category | null;
  /** Slim subcategory — id and slug are all the icon resolver needs. */
  subcategory?: Pick<Subcategory, 'id' | 'slug'> | null;
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
      {/*
        Icon priority, mirroring the admin library card:
          1. the body's first image (the recipe photo / buckets for cleaning) — cover
          2. the manager's iconImageUrl override
          3. the per-subcategory Phosphor mark via getProcedureIcon
             (procedures under different subcategories wear different glyphs;
             categories stay visually distinct from subcategories and procedures)
        Stale `blob:` URLs from a previous session fall through to the icon
        tile instead of a broken <img>, so the row never shows a tile with no image.
      */}
      {(() => {
        const isRenderable = (u?: string | null): u is string =>
          typeof u === 'string' && u.length > 0 && !u.startsWith('blob:');
        const photo = isRenderable(cover) ? cover : null;
        const override = isRenderable(iconImageUrl) ? iconImageUrl : null;
        if (photo) {
          return (
            <HoverImagePreview src={photo} alt="">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt=""
                className="w-20 shrink-0 self-stretch rounded-l-[var(--radius-lg)] object-cover object-top"
                loading="lazy"
              />
            </HoverImagePreview>
          );
        }
        if (override) {
          return (
            <HoverImagePreview src={override} alt="">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={override}
                alt=""
                className="w-20 shrink-0 self-stretch rounded-l-[var(--radius-lg)] bg-[var(--color-panel)] object-contain p-2"
                loading="lazy"
              />
            </HoverImagePreview>
          );
        }
        const fallbackIcon = getProcedureIcon(
          { iconImageUrl: null, subcategoryId: subcategory?.id ?? null },
          subcategory ?? null,
        );
        return (
          <span
            aria-hidden="true"
            className="flex w-20 shrink-0 items-center justify-center self-stretch rounded-l-[var(--radius-lg)] bg-[var(--color-panel)] p-2 text-[var(--color-ink-2)]"
          >
            <Icon icon={fallbackIcon} className="text-3xl" />
          </span>
        );
      })()}

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

export { getCategoryIcon, getProcedureIcon, getSubcategoryIcon };
