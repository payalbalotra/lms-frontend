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
  /** The form-field label rendered above the chips. */
  label: string;
  /** Hint text under the label — explains what the field is for. */
  hint?: string;
  /** The currently selected values, in insertion order. */
  value: string[];
  /** Adds, removes, and re-orders selections. */
  onChange: (next: string[]) => void;
  /** The full list of options the user can pick from. */
  options: MultiSelectOption[];
  /** Disabled state — disables every chip and the add button. */
  disabled?: boolean;
  /** Placeholder for the add button when nothing is selected yet. */
  addLabel: string;
  /** What renders when nothing is selected and the picker is closed.
   *  Distinct from `hint` — it's the empty state, not the descriptor. */
  emptyText: string;
  /** Called when the picker would open but is suppressed (e.g. no upstream
   *  job role selected). Receives a string suitable for an `aria-disabled`
   *  tooltip / status. */
  blockedReason?: string;
  /** Aria id for the field group. */
  id?: string;
  /** Truncates selected chips beyond this count with a "+N more" pill.
   *  Hidden chips remain in `value` — this is display-only. */
  visibleChipLimit?: number;
  /** Renders inline beside the label (e.g. required asterisk). */
  labelTrailing?: React.ReactNode;
}

/**
 * A multi-select chip picker built on `Button` + `Popover` — the same primitives
 * every other admin action uses, so the "+ Add" trigger reads as a secondary
 * action (peach pill with brand-700 text) instead of looking like an input
 * with an orange outline.
 *
 * The shape mirrors the user's mental model from the spec:
 *
 *   [ Line Cook × ]  [ Prep Cook × ]   [+ Add job role]
 *
 * — selected items become removable chips, the add button opens a popover
 * (one pick closes it), and the underlying `Popover` keeps the keyboard /
 * focus / portal behaviour identical to every other menu on the admin side.
 */
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
                  className="-mr-1 ml-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[var(--color-brand-700)] transition-colors hover:bg-[var(--color-brand-tint-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:opacity-50"
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

/** The "+ Add" trigger + popover. Uses Button + Popover (not CustomSelect) so
 *  the trigger reads as a peach pill like every other `[+ Add]` on the admin
 *  side — the CustomSelect trigger was being mistaken for an input with an
 *  error-state orange outline. */
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
