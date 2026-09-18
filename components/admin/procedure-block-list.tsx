'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ProcedureBlockCard } from './procedure-block-card';
import { ProcedureAddMenu } from './procedure-add-menu';
import { BLOCK_FACTORIES, duplicateBlock } from '@/lib/procedure-blocks';
import type { ProcedureBlock, ProcedureBlockKind } from '@/lib/types';

function arrayMoveById<T extends { id: string }>(arr: T[], fromId: string, toId: string): T[] {
  const from = arr.findIndex((x) => x.id === fromId);
  const to = arr.findIndex((x) => x.id === toId);
  if (from === -1 || to === -1 || from === to) return arr;
  return arrayMove(arr, from, to);
}

export function ProcedureBlockList({
  blocks,
  onChange,
}: {
  blocks: ProcedureBlock[];
  onChange: (next: ProcedureBlock[]) => void;
}): React.ReactElement {
  const t = useTranslations('admin.library.new.form.composer');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent): void {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    onChange(arrayMoveById(blocks, String(active.id), String(over.id)));
  }

  function updateBlock(id: string, next: ProcedureBlock): void {
    onChange(blocks.map((b) => (b.id === id ? next : b)));
  }
  function removeBlock(id: string): void {
    onChange(blocks.filter((b) => b.id !== id));
  }
  function moveBlock(id: string, direction: 'up' | 'down'): void {
    const i = blocks.findIndex((b) => b.id === id);
    if (i === -1) return;
    const j = direction === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= blocks.length) return;
    onChange(arrayMove(blocks, i, j));
  }
  function duplicateById(id: string): void {
    const i = blocks.findIndex((b) => b.id === id);
    if (i < 0) return;
    const clone = duplicateBlock(blocks[i]);
    onChange([...blocks.slice(0, i + 1), clone, ...blocks.slice(i + 1)]);
  }
  function addBlock(kind: ProcedureBlockKind): void {
    onChange([...blocks, BLOCK_FACTORIES[kind]()]);
  }

  if (blocks.length === 0) {
    return (
      <div className="space-y-5">
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] p-6 space-y-4">
          <div className="text-center">
            <h3 className="font-[family-name:var(--font-ui)] text-[length:var(--text-md)] font-bold text-[var(--color-ink)]">
              Choose a content block to add
            </h3>
            <p className="mt-0.5 text-[length:var(--text-xs)] text-[var(--color-ink-2)]">
              Click any block below to start adding instructions, tables, warnings, or media.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { kind: 'text', label: 'Text Area', icon: 'ri-text', color: 'text-amber-600 bg-amber-50 border-amber-200' },
              { kind: 'table', label: 'Table', icon: 'ri-table-line', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
              { kind: 'method', label: 'Numbered Steps', icon: 'ri-list-ordered', color: 'text-blue-600 bg-blue-50 border-blue-200' },
              { kind: 'warning', label: 'Warning Callout', icon: 'ri-alert-line', color: 'text-orange-600 bg-orange-50 border-orange-200' },
              { kind: 'heading', label: 'Heading', icon: 'ri-h-1', color: 'text-purple-600 bg-purple-50 border-purple-200' },
              { kind: 'image', label: 'Photograph', icon: 'ri-image-line', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
              { kind: 'video', label: 'Video', icon: 'ri-video-line', color: 'text-rose-600 bg-rose-50 border-rose-200' },
              { kind: 'attachment', label: 'Attachment', icon: 'ri-attachment-line', color: 'text-slate-600 bg-slate-50 border-slate-200' },
            ].map((item) => (
              <button
                key={item.kind}
                type="button"
                onClick={() => addBlock(item.kind as ProcedureBlockKind)}
                className="group flex flex-col items-center justify-center rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-3.5 text-center transition-all duration-150 hover:bg-[var(--color-wash)] hover:border-[var(--color-brand-600)] shadow-2xs hover:shadow-xs active:scale-95"
              >
                <div className={cn('mb-2 flex size-9 items-center justify-center rounded-lg border text-lg transition-transform group-hover:scale-110', item.color)}>
                  <i aria-hidden="true" className={item.icon} />
                </div>
                <span className="font-bold text-[length:var(--text-xs)] text-[var(--color-ink)] group-hover:text-[var(--color-brand-700)]">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <ProcedureAddMenu onAdd={addBlock} variant="inline" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {blocks.map((block, i) => (
              <ProcedureBlockCard
                key={block.id}
                block={block}
                index={i}
                total={blocks.length}
                onChange={(next) => updateBlock(block.id, next)}
                onRemove={() => removeBlock(block.id)}
                onMove={(dir) => moveBlock(block.id, dir)}
                onDuplicate={() => duplicateById(block.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <ProcedureAddMenu onAdd={addBlock} variant="inline" />
    </div>
  );
}
