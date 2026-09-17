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
      <div className="space-y-4">
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] p-8 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-[var(--color-wash)] text-[var(--color-brand-700)]">
            <i aria-hidden="true" className="ri-add-line text-xl" />
          </div>
          <h3 className="font-[family-name:var(--font-ui)] text-[length:var(--text-md)] font-semibold text-[var(--color-ink)]">
            {t('emptyTitle')}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            {t('emptyBody')}
          </p>
          <div className="mt-4">
            <Button
              type="button"
              variant="secondary"
              size="default"
              onClick={() => addBlock('text')}
            >
              <i aria-hidden="true" className="ri-add-line" />
              {t('emptyCta')}
            </Button>
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
