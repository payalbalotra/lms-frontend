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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4',
        isDragging && 'opacity-60 shadow-[var(--e-2)]',
      )}
    >
      <header className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t('actions.dragHandle')}
          className="inline-flex size-9 cursor-grab items-center justify-center rounded-md text-[var(--color-ink-3)] hover:bg-[var(--color-panel)] active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <i aria-hidden="true" className="ri-draggable" />
        </button>
        <div className="inline-flex items-center gap-2 text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-ink-2)]">
          <i aria-hidden="true" className={KIND_ICON[block.kind]} />
          {t(`kind.${block.kind}` as never)}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.moveUp')}
            disabled={index === 0}
            onClick={() => onMove('up')}
          >
            <i aria-hidden="true" className="ri-arrow-up-line" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.moveDown')}
            disabled={index === total - 1}
            onClick={() => onMove('down')}
          >
            <i aria-hidden="true" className="ri-arrow-down-line" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.duplicate')}
            onClick={onDuplicate}
          >
            <i aria-hidden="true" className="ri-file-copy-line" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.remove')}
            onClick={onRemove}
          >
            <i aria-hidden="true" className="ri-close-line" />
          </Button>
        </div>
      </header>
      <ProcedureBlockEditor block={block} onChange={onChange} />
    </div>
  );
}
