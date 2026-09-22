'use client';

import * as React from 'react';
import { LuCheck } from 'react-icons/lu';
import { cn } from '@/lib/utils';

export interface WizardStepperStep {
  id: string;
  label: string;
  num: number;
}

/**
 * Where you are in a multi-step build, and how far there is left to go.
 *
 * Navigation, not content: the steps sit on the page beside the sections they
 * move between rather than in a card of their own. Takes labels already
 * translated, so it belongs to no one namespace — the procedure wizard and the
 * course builder both wear it, which is the point.
 */
export function WizardStepper({
  steps,
  currentStep,
  ariaLabel,
  onSelectStep,
}: {
  steps: WizardStepperStep[];
  currentStep: string;
  ariaLabel: string;
  onSelectStep?: (stepId: string) => void;
}): React.ReactElement {
  // A step id that is not in the current array — the procedure type just changed
  // and took a step with it — would render every step as "not yet reached" with
  // nothing active, so it clamps to the first instead.
  const rawIdx = steps.findIndex((s) => s.id === currentStep);
  const currentIdx = rawIdx >= 0 ? rawIdx : 0;
  const activeId = steps[currentIdx]?.id;

  return (
    <nav aria-label={ariaLabel} className="my-6 w-full">
      <div className="py-2">
        <ol className="flex w-full items-center justify-between">
          {steps.map((step, idx) => {
            const isActive = step.id === activeId;
            const isCompleted = idx < currentIdx;

            return (
              <React.Fragment key={step.id}>
                <li className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => onSelectStep?.(step.id)}
                    aria-current={isActive ? 'step' : undefined}
                    className="group flex items-center gap-3 focus-visible:outline-none"
                  >
                    <span
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-e1 transition-all',
                        // One brand mark in the row: where you are. A step you
                        // have finished says so with a tick on a grey disc, and
                        // the filled connector behind it — five brand discs and
                        // a brand button made the page's one action ordinary.
                        isActive
                          ? 'scale-105 bg-[var(--color-brand-600)] text-white ring-4 ring-[var(--color-brand-tint)]'
                          : isCompleted
                            ? 'bg-[var(--color-panel)] text-[var(--color-brand-700)]'
                            : 'border border-[var(--color-line-3)] bg-[var(--color-surface)] text-[var(--color-ink-3)] group-hover:border-[var(--color-ring)]',
                      )}
                    >
                      {isCompleted ? <LuCheck aria-hidden="true" className="text-sm font-semibold" /> : step.num}
                    </span>
                    <span
                      className={cn(
                        'hidden text-sm font-semibold transition-colors sm:inline-block',
                        isActive
                          ? 'text-[var(--color-brand-700)]'
                          : isCompleted
                            ? 'text-[var(--color-ink)]'
                            : 'text-[var(--color-ink-3)] group-hover:text-[var(--color-ink-2)]',
                      )}
                    >
                      {step.label}
                    </span>
                  </button>
                </li>

                {idx < steps.length - 1 && (
                  <div className="mx-2 h-0.5 min-w-5 flex-1 overflow-hidden rounded-full bg-[var(--color-line-2)] sm:mx-3 sm:min-w-8">
                    <div
                      className={cn(
                        'h-full transition-all duration-[var(--dur)]',
                        isCompleted ? 'w-full bg-[var(--color-brand-600)]' : 'w-0',
                      )}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
