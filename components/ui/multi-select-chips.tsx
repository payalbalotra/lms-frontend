'use client';

import * as React from 'react';
import { LuPlus, LuX } from 'react-icons/lu';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverItem } from '@/components/ui/popover';

export interface MultiSelectOption {
  value: string;
  label: string;
  /** Optional helper text, surfaced in the picker for ambiguity. */
  description?: string;
}

interface MultiSelectChipsProps {
  label: string;
  hint?: string;
  value: string[];
  onChange: (next: string[]) => void;
  options: MultiSelectOption[];
  disabled?: boolean;
  addLabel: string;
  emptyText: string;
  blockedReason?: string;
  id?: string;
  visibleChipLimit?: number;
  labelTrailing?: React.ReactNode;
}

export function MultiSelectChips({
  label,
  hint,
  value,
  onChange,
  options,
  disabled,
  addLabel,
  emptyText,
  blockedReason,
  id,
  visibleChipLimit = 6,
  labelTrailing,
}: MultiSelectChipsProps): React.ReactElement {
  const labelsById = React.useMemo(
    () => new Map(options.map((o) => [o.value, o.label])),
    [options],
  );

  const selectedOptions = value
    .map((v) => ({ value: v, label: labelsById.get(v) ?? v }))
    .filter((o) => labelsById.has(o.value));

  // Available options = everything minus what's already picked.
  const pickableOptions = React.useMemo(
    () => options.filter((o) => !value.includes(o.value)),
    [options, value],
  );

  const handleAdd = (picked: string): void => {
    if (!picked || value.includes(picked)) return;
    onChange([...value, picked]);
  };

  const handleRemove = (id: string): void => {
    onChange(value.filter((v) => v !== id));
  };

  const overflow = Math.max(0, selectedOptions.length - visibleChipLimit);
  const visibleChips = selectedOptions.slice(0, visibleChipLimit);
  const isBlocked = Boolean(blockedReason);
  const triggerDisabled = disabled || isBlocked || pickableOptions.length === 0;

  return (
    <div className="grid gap-2" data-slot="multi-select-chips">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-[var(--color-ink)]">
          {label}
          {labelTrailing}
        </span>
        {hint ? (
          <span className="text-sm text-[var(--color-ink-2)]">{hint}</span>
        ) : null}
      </div>

      <div
        className={cn(
          'flex min-h-tap-admin flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-3 shadow-e1',
          isBlocked && 'bg-[var(--color-panel)]',
        )}
        id={id}
        role="group"
        aria-label={label}
      >
        {selectedOptions.length === 0 ? (
          <span
            className={cn(
              'text-sm',
              isBlocked
                ? 'italic text-[var(--color-ink-3)]'
                : 'text-[var(--color-ink-3)]',
            )}
          >
            {isBlocked ? blockedReason : emptyText}
          </span>
        ) : (
          <>
            {visibleChips.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-brand-tint)] px-3 py-1 text-sm font-semibold text-[var(--color-brand-700)] shadow-[inset_0_0_0_1px_var(--color-brand-600)]"
              >
                <span className="truncate">{opt.label}</span>
                <button
                  type="button"
                  aria-label={`Remove ${opt.label}`}
                  onClick={() => handleRemove(opt.value)}
                  disabled={disabled}
                  className="-mr-1 ml-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[var(--color-brand-700)] transition-colors hover:bg-[var(--color-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:opacity-50"
                >
                  <LuX className="text-sm" aria-hidden="true" />
                </button>
              </span>
            ))}
            {overflow > 0 ? (
              <span className="inline-flex items-center rounded-full bg-[var(--color-panel)] px-3 py-1 text-sm font-semibold text-[var(--color-ink-2)]">
                +{overflow}
              </span>
            ) : null}
          </>
        )}

        <div className="ml-auto">
          <PickerTrigger
            disabled={triggerDisabled}
            disabledReason={isBlocked ? blockedReason : undefined}
            options={pickableOptions}
            addLabel={addLabel}
            onPick={handleAdd}
          />
        </div>
      </div>
    </div>
  );
}

function PickerTrigger({
  disabled,
  disabledReason,
  options,
  addLabel,
  onPick,
}: {
  disabled: boolean;
  disabledReason?: string;
  options: MultiSelectOption[];
  addLabel: string;
  onPick: (value: string) => void;
}): React.ReactElement {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);

  if (disabled) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled
        title={disabledReason}
        icon={LuPlus}
      >
        {addLabel}
      </Button>
    );
  }

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="menu"
        aria-expanded={open}
        icon={LuPlus}
      >
        {addLabel}
      </Button>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
      >
        {options.length === 0 ? (
          <div className="px-3 py-2 text-sm text-[var(--color-ink-3)]">
            No more options.
          </div>
        ) : (
          options.map((opt) => (
            <PopoverItem
              key={opt.value}
              label={opt.label}
              description={opt.description}
              onClick={() => {
                onPick(opt.value);
                setOpen(false);
              }}
            />
          ))
        )}
      </Popover>
    </>
  );
}
