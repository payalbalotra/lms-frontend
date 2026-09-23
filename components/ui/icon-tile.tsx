import * as React from 'react';
import type { IconType } from 'react-icons';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

/**
 * The square an icon sits in.
 *
 * Forty of these were built by hand across twenty-nine files, in seven sizes —
 * 20, 24, 28, 32, 36, 40 and 48px — with three radii, some bordered and some
 * not, so the same mark looked different on every screen it appeared on. It is
 * one object, so it is one component, on an 8px scale:
 *
 *   xs  24px  a mark inside a chip or a dense list inside a dialog
 *   sm  32px  a row nested inside a card
 *   md  40px  a card, a section header, a dialog header
 *   lg  48px  a row in a page's primary list
 *
 * Neutral by rule: the brand says three things (the one action, current/
 * selected, focus), and a tile is none of them. `quiet` is the fainter mark an
 * empty state or a menu item wears; `circle` is for those two, whose marks are
 * round.
 */
export type IconTileSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE: Record<IconTileSize, string> = {
  xs: 'size-6 rounded-[var(--radius-sm)] text-sm',
  sm: 'size-8 rounded-[var(--radius-md)] text-base',
  md: 'size-10 rounded-[var(--radius-md)] text-lg',
  lg: 'size-12 rounded-[var(--radius-lg)] text-xl',
};

const TONE = {
  neutral: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
  quiet: 'bg-[var(--color-wash)] text-[var(--color-ink-3)]',
} as const;

export function IconTile({
  icon,
  size = 'md',
  tone = 'neutral',
  shape = 'square',
  className,
}: {
  /** A component, or a name the icon registry resolves. */
  icon: IconType | string;
  size?: IconTileSize;
  tone?: keyof typeof TONE;
  shape?: 'square' | 'circle';
  /** Placement and hover only — `group-hover:text-…`, a margin. Not colour at rest. */
  className?: string;
}): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center transition-colors',
        SIZE[size],
        TONE[tone],
        shape === 'circle' && 'rounded-full',
        className,
      )}
    >
      <Icon icon={icon} />
    </span>
  );
}
