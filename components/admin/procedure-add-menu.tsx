'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Popover, PopoverGroup, PopoverItem } from '@/components/ui/popover';
import type { ProcedureBlockKind } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProcedureAddMenuProps {
  onAdd: (kind: ProcedureBlockKind) => void;
  /** When true, render a compact right-aligned button for use below the list. */
  variant?: 'standalone' | 'inline';
}

interface BlockMenuItem {
  kind: ProcedureBlockKind;
  label: string;
  description: string;
  icon: string;
  group: 'basic' | 'media' | 'structured' | 'safety';
}

export function ProcedureAddMenu({
  onAdd,
  variant = 'standalone',
}: ProcedureAddMenuProps): React.ReactElement {
  const t = useTranslations('admin.library.new.form.composer');
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const close = React.useCallback(() => {
    setOpen(false);
    setSearch('');
  }, []);

  const add = React.useCallback(
    (kind: ProcedureBlockKind) => {
      onAdd(kind);
      close();
    },
    [onAdd, close],
  );

  const menuItems: BlockMenuItem[] = React.useMemo(
    () => [
      {
        kind: 'text',
        label: 'Text',
        description: 'Add rich text with formatting options',
        icon: 'ri-text',
        group: 'basic',
      },
      {
        kind: 'heading',
        label: 'Heading',
        description: 'Add a section heading',
        icon: 'ri-h-1',
        group: 'basic',
      },
      {
        kind: 'method',
        label: 'Numbered steps',
        description: 'Add sequential steps',
        icon: 'ri-list-ordered',
        group: 'basic',
      },
      {
        kind: 'image',
        label: 'Photograph',
        description: 'Add an image with caption',
        icon: 'ri-image-line',
        group: 'media',
      },
      {
        kind: 'video',
        label: 'Video',
        description: 'Add a video with time markers',
        icon: 'ri-video-line',
        group: 'media',
      },
      {
        kind: 'attachment',
        label: 'Attachment',
        description: 'Add a file (PDF, Word, etc.)',
        icon: 'ri-attachment-line',
        group: 'media',
      },
      {
        kind: 'recipe',
        label: 'Recipe',
        description: 'Add recipe details (ingredients, yield, etc.)',
        icon: 'ri-restaurant-line',
        group: 'structured',
      },
      {
        kind: 'table',
        label: 'Table',
        description: 'Add a table with custom columns',
        icon: 'ri-table-line',
        group: 'structured',
      },
      {
        kind: 'warning',
        label: 'Warning callout',
        description: 'Highlight important safety information',
        icon: 'ri-alert-line',
        group: 'safety',
      },
    ],
    [],
  );

  const filteredItems = React.useMemo(() => {
    if (!search.trim()) return menuItems;
    const q = search.toLowerCase();
    return menuItems.filter(
      (it) => it.label.toLowerCase().includes(q) || it.description.toLowerCase().includes(q),
    );
  }, [menuItems, search]);

  const basicItems = filteredItems.filter((i) => i.group === 'basic');
  const mediaItems = filteredItems.filter((i) => i.group === 'media');
  const structuredItems = filteredItems.filter((i) => i.group === 'structured');
  const safetyItems = filteredItems.filter((i) => i.group === 'safety');

  return (
    <div className={cn('flex flex-wrap items-center gap-2', variant === 'inline' ? 'justify-between w-full' : 'justify-start')}>
      {/* Visible Block Type Quick Buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[length:var(--text-xs)] font-semibold text-[var(--color-ink-3)] mr-1">
          Add block:
        </span>
        <button
          type="button"
          onClick={() => onAdd('text')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-1.5 text-[length:var(--text-xs)] font-bold text-[var(--color-ink)] hover:bg-[var(--color-wash)] hover:border-[var(--color-brand-600)] transition-colors shadow-2xs"
        >
          <i aria-hidden="true" className="ri-text text-sm text-[var(--color-brand-700)]" />
          <span>Text</span>
        </button>
        <button
          type="button"
          onClick={() => onAdd('table')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-1.5 text-[length:var(--text-xs)] font-bold text-[var(--color-ink)] hover:bg-[var(--color-wash)] hover:border-[var(--color-brand-600)] transition-colors shadow-2xs"
        >
          <i aria-hidden="true" className="ri-table-line text-sm text-emerald-600" />
          <span>Table</span>
        </button>
        <button
          type="button"
          onClick={() => onAdd('method')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-1.5 text-[length:var(--text-xs)] font-bold text-[var(--color-ink)] hover:bg-[var(--color-wash)] hover:border-[var(--color-brand-600)] transition-colors shadow-2xs"
        >
          <i aria-hidden="true" className="ri-list-ordered text-sm text-blue-600" />
          <span>Steps</span>
        </button>
        <button
          type="button"
          onClick={() => onAdd('warning')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-1.5 text-[length:var(--text-xs)] font-bold text-[var(--color-ink)] hover:bg-[var(--color-wash)] hover:border-[var(--color-brand-600)] transition-colors shadow-2xs"
        >
          <i aria-hidden="true" className="ri-alert-line text-sm text-amber-600" />
          <span>Warning</span>
        </button>
        <button
          type="button"
          onClick={() => onAdd('heading')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-1.5 text-[length:var(--text-xs)] font-bold text-[var(--color-ink)] hover:bg-[var(--color-wash)] hover:border-[var(--color-brand-600)] transition-colors shadow-2xs"
        >
          <i aria-hidden="true" className="ri-h-1 text-sm text-purple-600" />
          <span>Heading</span>
        </button>
        <button
          type="button"
          onClick={() => onAdd('image')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-1.5 text-[length:var(--text-xs)] font-bold text-[var(--color-ink)] hover:bg-[var(--color-wash)] hover:border-[var(--color-brand-600)] transition-colors shadow-2xs"
        >
          <i aria-hidden="true" className="ri-image-line text-sm text-indigo-600" />
          <span>Image</span>
        </button>
      </div>

      {/* Dropdown Menu for All Blocks */}
      <div>
        <Button
          ref={triggerRef}
          type="button"
          variant="secondary"
          size="sm"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="gap-1.5 px-3 shadow-2xs text-[length:var(--text-xs)]"
        >
          <i aria-hidden="true" className="ri-add-line text-sm" />
          <span>More blocks</span>
          <i
            aria-hidden="true"
            className={cn(
              'ri-arrow-down-s-line text-sm transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </Button>
      </div>

      <Popover open={open} onClose={close} triggerRef={triggerRef} align="end" width={360}>
        {/* Search input bar */}
        <div className="p-2 border-b border-[var(--color-line)]/60">
          <div className="relative">
            <i
              aria-hidden="true"
              className="ri-search-line absolute left-3 top-2.5 text-base text-[var(--color-ink-3)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search content blocks..."
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-line-3)] bg-[var(--color-input)] py-1.5 pl-9 pr-3 text-[length:var(--text-sm)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus-visible:border-[var(--color-brand-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint-2)]"
            />
          </div>
        </div>

        {/* Scrollable list of groups */}
        <div className="max-h-[380px] overflow-y-auto p-1 space-y-1 divide-y divide-[var(--color-line)]/40">
          {filteredItems.length === 0 ? (
            <div className="p-6 text-center text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
              No matching blocks found.
            </div>
          ) : (
            <>
              {basicItems.length > 0 && (
                <PopoverGroup label="BASIC">
                  {basicItems.map((item) => (
                    <PopoverItem
                      key={item.kind}
                      icon={item.icon}
                      label={item.label}
                      description={item.description}
                      onClick={() => add(item.kind)}
                    />
                  ))}
                </PopoverGroup>
              )}

              {mediaItems.length > 0 && (
                <PopoverGroup label="MEDIA">
                  {mediaItems.map((item) => (
                    <PopoverItem
                      key={item.kind}
                      icon={item.icon}
                      label={item.label}
                      description={item.description}
                      onClick={() => add(item.kind)}
                    />
                  ))}
                </PopoverGroup>
              )}

              {structuredItems.length > 0 && (
                <PopoverGroup label="STRUCTURED">
                  {structuredItems.map((item) => (
                    <PopoverItem
                      key={item.kind}
                      icon={item.icon}
                      label={item.label}
                      description={item.description}
                      onClick={() => add(item.kind)}
                    />
                  ))}
                </PopoverGroup>
              )}

              {safetyItems.length > 0 && (
                <PopoverGroup label="SAFETY">
                  {safetyItems.map((item) => (
                    <PopoverItem
                      key={item.kind}
                      icon={item.icon}
                      label={item.label}
                      description={item.description}
                      onClick={() => add(item.kind)}
                    />
                  ))}
                </PopoverGroup>
              )}
            </>
          )}
        </div>
      </Popover>
    </div>
  );
}
