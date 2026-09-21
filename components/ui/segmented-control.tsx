'use client';

import * as React from 'react';
import type { IconType } from 'react-icons';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';

export interface Segment {
  value: string;
  label: string;
  /** Optional mark before the label, where the seats name a mechanism. */
  icon?: IconType | string;
}

/**
 * A few seats on one tray, one of them filled: which language am I writing,
 * which view am I looking at, which batch size am I scaling to.
 *
 * The same control as the admin bar's EN/ES switch and the recipe scaler —
 * `.segbar` — so every place the app asks "which one of these few?" looks alike.
 * For an open-ended set (categories, statuses) use `FilterChips` instead: a tray
 * of seven seats becomes a white bar across the page.
 */
export function SegmentedControl({
  label,
  segments,
  value,
  onChange,
  className,
}: {
  /** The question, for a screen reader: "Title language", "View". */
  label: string;
  segments: Segment[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}): React.ReactElement {
  return (
    <div className={cn('segbar', className)} role="group" aria-label={label}>
      {segments.map((seg) => (
        <button
          key={seg.value}
          type="button"
          aria-current={seg.value === value ? 'true' : undefined}
          onClick={() => onChange(seg.value)}
        >
          {seg.icon ? <Icon icon={seg.icon} /> : null}
          {seg.label}
        </button>
      ))}
    </div>
  );
}
