'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LuCircleAlert, LuEllipsisVertical } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import type { IconType } from 'react-icons';

/**
 * RowActions — ⋯ kebab menu for table rows.
 *
 * Replaces the [Edit] [Archive] pattern where destructive actions sit
 * as peers of safe ones. The destructive action is buried behind the
 * ⋯ and asks for a confirmation before firing.
 *
 * Behaviour (DESIGN.md §3.6):
 *   - Clicking the trigger opens a small menu anchored to its right.
 *   - Clicking a non-destructive item fires `onSelect` immediately.
 *   - Clicking a destructive item replaces the menu with an inline
 *     confirm row (Yes, … / Cancel) — the destructive action is only
 *     fired when the user confirms.
 *   - ESC closes the menu (and the confirm row if it was open).
 *   - Click outside closes the menu.
 *   - Menu uses `role="menu"` / `role="menuitem"`.
 */

export interface RowActionItem {
  /** Visible label. */
  label: string;
  /** Called when a non-destructive item is selected. */
  onSelect: () => void;
  /** If true, the item is styled bad-tone and triggers an inline confirm. */
  destructive?: boolean;
  /** Overrides the confirm button's label, for a destructive item whose
   *  consequence is worth naming ("Delete block"). */
  confirmLabel?: string;
  /** The icon, as a component (`LuPencil`) or as a name the registry resolves
   *  (`ri-pencil-line`). Names exist because a server component cannot hand a
   *  function to a client one, and because the screens merged in from
   *  feat/procedures were written against the old icon-class convention. */
  icon?: IconType | string;
}

interface RowActionsProps {
  items: RowActionItem[];
  /** aria-label on the trigger (e.g. "Open actions for {name}"). */
  triggerLabel?: string;
  /** Optional className on the trigger wrapper. */
  className?: string;
}

export function RowActions({ items, triggerLabel, className }: RowActionsProps): React.ReactElement {
  const t = useTranslations('admin');
  const [open, setOpen] = React.useState(false);
  const [confirmIndex, setConfirmIndex] = React.useState<number | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; right: number; origin: string } | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // The menu is fixed to the viewport, so it has to be re-anchored whenever the
  // trigger moves: a scroll, a resize, a row opening above it.
  const anchor = React.useCallback((): void => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const height = menuRef.current?.offsetHeight ?? 160;
    const below = window.innerHeight - r.bottom;
    const flipped = below < height + 12 && r.top > height + 12;
    const top = flipped ? r.top - height - 4 : r.bottom + 4;
    setPos({ top, right: Math.max(8, window.innerWidth - r.right), origin: flipped ? 'bottom right' : 'top right' });
  }, []);

  React.useLayoutEffect(() => {
    if (!open) return;
    anchor();
    window.addEventListener('scroll', anchor, true);
    window.addEventListener('resize', anchor);
    return () => {
      window.removeEventListener('scroll', anchor, true);
      window.removeEventListener('resize', anchor);
    };
  }, [open, confirmIndex, anchor]);

  // Close on outside click + Escape; reset confirm state when menu closes.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false);
        setConfirmIndex(null);
      }
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setOpen(false);
        setConfirmIndex(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function closeAll(): void {
    setOpen(false);
    setConfirmIndex(null);
  }

  function handleSelect(idx: number): void {
    const item = items[idx];
    if (!item) return;
    if (item.destructive) {
      // Show the inline confirm; do not fire yet.
      setConfirmIndex(idx);
      return;
    }
    closeAll();
    item.onSelect();
  }

  function handleConfirm(): void {
    if (confirmIndex === null) return;
    const item = items[confirmIndex];
    if (!item) return;
    closeAll();
    item.onSelect();
  }

  return (
    <div className={cn('relative inline-flex', className)}>
      <Button
        ref={triggerRef}
        type="button"
        size="icon"
        variant="ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel ?? t('rowActionsLabel')}
        onClick={() => {
          setOpen((v) => !v);
          setConfirmIndex(null);
        }}
      >
        <LuEllipsisVertical aria-hidden="true" className="text-md" />
      </Button>

      {open && mounted
        ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={triggerLabel ?? t('rowActionsLabel')}
          style={{ top: pos?.top ?? -9999, right: pos?.right ?? 0, ['--pop-origin' as string]: pos?.origin ?? 'top right' }}
          className={cn(
            'pop-in fixed z-dropdown min-w-field-md',
            'rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)]',
            'shadow-[var(--e-3)]',
          )}
        >
          {confirmIndex !== null ? (
            <div className="space-y-2 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-bad)]">
                <LuCircleAlert aria-hidden="true" />
                {t('rowActionsConfirmTitle')}
              </p>
              <p className="text-sm text-[var(--color-ink)]">
                {items[confirmIndex]?.label}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="neutral" onClick={closeAll}>
                  {t('confirmNo')}
                </Button>
                <Button size="sm" variant="destructive" onClick={handleConfirm}>
                  {items[confirmIndex]?.confirmLabel ??
                    (items[confirmIndex]?.destructive === true ? t('confirmDelete') : t('confirmYes'))}
                </Button>
              </div>
            </div>
          ) : (
            <ul className="py-1">
              {items.map((item, idx) => (
                <li key={idx} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleSelect(idx)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left',
                      'text-sm font-medium',
                      'transition-colors duration-[var(--dur)] ease-[var(--ease)]',
                      'focus-visible:outline-none focus-visible:bg-[var(--color-panel)]',
                      item.destructive
                        ? 'text-[var(--color-bad)] hover:bg-[var(--color-bad-tint)]'
                        : 'text-[var(--color-ink)] hover:bg-[var(--color-panel)]',
                    )}
                  >
                    {item.icon ? (
                      <Icon icon={item.icon} className="text-md" />
                    ) : null}
                    <span className="flex-1">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}