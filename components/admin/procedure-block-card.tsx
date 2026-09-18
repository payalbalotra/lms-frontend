'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ProcedureBlock, ProcedureBlockKind } from '@/lib/types';
import { ProcedureBlockEditor } from './procedure-block-editor';

const KIND_ICON: Record<ProcedureBlockKind, string> = {
  text: 'ri-text',
  heading: 'ri-h-1',
  method: 'ri-list-ordered',
  recipe: 'ri-restaurant-line',
  image: 'ri-image-line',
  video: 'ri-video-line',
  warning: 'ri-alert-line',
  attachment: 'ri-attachment-line',
  table: 'ri-table-line',
};

interface BlockTheme {
  border: string;       // 4px left accent border
  bgHeader: string;     // Card header background
  badgeBg: string;      // Badge background
  badgeText: string;    // Badge text color
  badgeBorder: string;  // Badge border color
  iconColor: string;    // Icon color
  label: string;        // Human readable display label
}

const BLOCK_THEMES: Record<ProcedureBlockKind, BlockTheme> = {
  text: {
    border: 'border-l-amber-500',
    bgHeader: 'bg-amber-50/50',
    badgeBg: 'bg-amber-100/90',
    badgeText: 'text-amber-900',
    badgeBorder: 'border-amber-300',
    iconColor: 'text-amber-600',
    label: 'Text Area',
  },
  table: {
    border: 'border-l-emerald-500',
    bgHeader: 'bg-emerald-50/50',
    badgeBg: 'bg-emerald-100/90',
    badgeText: 'text-emerald-900',
    badgeBorder: 'border-emerald-300',
    iconColor: 'text-emerald-600',
    label: 'Table',
  },
  method: {
    border: 'border-l-blue-500',
    bgHeader: 'bg-blue-50/50',
    badgeBg: 'bg-blue-100/90',
    badgeText: 'text-blue-900',
    badgeBorder: 'border-blue-300',
    iconColor: 'text-blue-600',
    label: 'Numbered Steps',
  },
  warning: {
    border: 'border-l-orange-500',
    bgHeader: 'bg-orange-50/50',
    badgeBg: 'bg-orange-100/90',
    badgeText: 'text-orange-900',
    badgeBorder: 'border-orange-300',
    iconColor: 'text-orange-600',
    label: 'Warning Callout',
  },
  heading: {
    border: 'border-l-purple-500',
    bgHeader: 'bg-purple-50/50',
    badgeBg: 'bg-purple-100/90',
    badgeText: 'text-purple-900',
    badgeBorder: 'border-purple-300',
    iconColor: 'text-purple-600',
    label: 'Section Heading',
  },
  image: {
    border: 'border-l-indigo-500',
    bgHeader: 'bg-indigo-50/50',
    badgeBg: 'bg-indigo-100/90',
    badgeText: 'text-indigo-900',
    badgeBorder: 'border-indigo-300',
    iconColor: 'text-indigo-600',
    label: 'Photograph',
  },
  video: {
    border: 'border-l-rose-500',
    bgHeader: 'bg-rose-50/50',
    badgeBg: 'bg-rose-100/90',
    badgeText: 'text-rose-900',
    badgeBorder: 'border-rose-300',
    iconColor: 'text-rose-600',
    label: 'Video',
  },
  attachment: {
    border: 'border-l-teal-500',
    bgHeader: 'bg-teal-50/50',
    badgeBg: 'bg-teal-100/90',
    badgeText: 'text-teal-900',
    badgeBorder: 'border-teal-300',
    iconColor: 'text-teal-600',
    label: 'Attachment',
  },
  recipe: {
    border: 'border-l-orange-600',
    bgHeader: 'bg-orange-50/70',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-950',
    badgeBorder: 'border-orange-300',
    iconColor: 'text-orange-600',
    label: 'Recipe',
  },
};

export function ProcedureBlockCard({
  block,
  index,
  total,
  onChange,
  onRemove,
  onMove,
  onDuplicate,
}: {
  block: ProcedureBlock;
  index: number;
  total: number;
  onChange: (next: ProcedureBlock) => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onDuplicate: () => void;
}): React.ReactElement {
  const t = useTranslations('admin.library.new.form.composer');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const theme = BLOCK_THEMES[block.kind] || BLOCK_THEMES.text;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] border-l-4 transition-all shadow-2xs hover:shadow-xs',
        theme.border,
        isDragging && 'opacity-60 shadow-[var(--e-2)]',
      )}
    >
      {/* Visual Header Bar with Tinted Background & Distinct Badge */}
      <header className={cn('flex items-center justify-between border-b border-[var(--color-line-2)] px-4 py-2.5', theme.bgHeader)}>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label={t('actions.dragHandle')}
            className="inline-flex size-7 cursor-grab items-center justify-center rounded-md text-[var(--color-ink-3)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] active:cursor-grabbing transition-colors"
            {...attributes}
            {...listeners}
          >
            <i aria-hidden="true" className="ri-draggable text-base" />
          </button>

          {/* Color Badge Indicator for Block Type */}
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-[length:var(--text-xs)] font-bold uppercase tracking-wide shadow-2xs',
              theme.badgeBg,
              theme.badgeText,
              theme.badgeBorder,
            )}
          >
            <i aria-hidden="true" className={cn(KIND_ICON[block.kind], 'text-base', theme.iconColor)} />
            <span>{theme.label}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.moveUp')}
            disabled={index === 0}
            onClick={() => onMove('up')}
            className="size-8"
          >
            <i aria-hidden="true" className="ri-arrow-up-line text-sm" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.moveDown')}
            disabled={index === total - 1}
            onClick={() => onMove('down')}
            className="size-8"
          >
            <i aria-hidden="true" className="ri-arrow-down-line text-sm" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.duplicate')}
            onClick={onDuplicate}
            className="size-8"
          >
            <i aria-hidden="true" className="ri-file-copy-line text-sm" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.remove')}
            onClick={onRemove}
            className="size-8 text-[var(--color-ink-3)] hover:text-[var(--color-bad)] hover:bg-red-50"
          >
            <i aria-hidden="true" className="ri-close-line text-sm" />
          </Button>
        </div>
      </header>

      {/* Block Editor Content */}
      <div className="p-4">
        <ProcedureBlockEditor block={block} onChange={onChange} />
      </div>
    </div>
  );
}
