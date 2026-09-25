'use client';

import * as React from 'react';
import { LuCheck } from 'react-icons/lu';
import { cn } from '@/lib/utils';

export interface WizardStep {
  id: string;
  label: string;
  /** A number in [0, 1] — how much of this step the user has filled in.
   *  The stepper turns it into a connector fill width and a circle state
   *  (empty / started / complete). The stepper does not compute it — the
   *  caller passes a value it has already derived from form state. */
  progress: number;
}

/**
 * Where you are in a multi-step build, and how far there is left to go.
 *
 * Each step has a progress value (0–1) that the caller computes from real
 * form state. The stepper reflects it in two places:
 *
 *  - The connector line AFTER each step fills from left to right according
 *    to THAT step's progress, animated at ~400 ms.
 *  - The circle's state:
 *      empty (p = 0)              — white ground, grey border and number
 *      started (0 < p < 1)        — white ground, brand border and number
 *      complete (p = 1)           — brand fill, white check
 *      current (any p)            — brand fill + soft halo ring,
 *                                   bold brand-coloured label
 *    A current step can also be complete (brand fill, white check, halo).
 *
 * The stepper knows nothing about the form. Anything that can be expressed
 * as "this step is X% done" can drive it.
 */
export function WizardStepper({
  steps,
  current,
  ariaLabel,
  onSelect,
}: {
  steps: WizardStep[];
  current: string;
  ariaLabel: string;
  onSelect?: (stepId: string) => void;
}): React.ReactElement {
  const rawIdx = steps.findIndex((s) => s.id === current);
  const activeIdx = rawIdx >= 0 ? rawIdx : 0;

  const [maxVisited, setMaxVisited] = React.useState(activeIdx);
  React.useEffect(() => {
    setMaxVisited((prev) => Math.max(prev, activeIdx));
  }, [activeIdx]);

  // prefers-reduced-motion — globals.css already collapses every transition
  // to 0.01 ms under the same media query, but reading it here lets us also
  // skip the React-side class churn (cheaper render). Initial state matches
  // the server (false) so hydration doesn't see a mismatch.
  const [reducedMotion, setReducedMotion] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const motion = reducedMotion ? '' : 'transition-all duration-[400ms] ease-out';

  return (
    <nav aria-label={ariaLabel} className="my-6 w-full">
      <div className="py-2">
        <ol className="flex w-full items-center justify-between">
          {steps.map((step, idx) => {
            const isPast = idx < activeIdx;
            const isActive = step.id === current;
            const isFuture = idx > activeIdx;
            const isComplete = isPast || (idx <= maxVisited && step.progress >= 1);
            const isStarted = !isPast && !isComplete && idx <= maxVisited && step.progress > 0;
            const percent = Math.round(step.progress * 100);

            // Connector line after this step
            let linePercent = 0;
            if (isPast) {
              linePercent = 100;
            } else if (isActive) {
              linePercent = Math.min(percent, 100);
            } else {
              linePercent = 0;
            }

            // Inline styles for the three colour-critical properties so they
            // can't be dropped by the Tailwind JIT or `twMerge` if an
            // arbitrary-value pattern isn't picked up. The layout / ring
            // sizes stay as utility classes.
            const circleStyle: React.CSSProperties =
              isActive || isComplete
                ? {
                    backgroundColor: 'var(--color-brand-600)',
                    color: '#ffffff',
                  }
                : isStarted
                  ? {
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-brand-700)',
                    }
                  : {
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-ink-3)',
                    };

            if (isActive) {
              circleStyle.boxShadow =
                '0 0 0 4px var(--color-brand-tint), 0 1px 2px rgb(34 34 34 / 0.06)';
              circleStyle.transform = 'scale(1.05)';
            } else {
              circleStyle.boxShadow = '0 1px 2px rgb(34 34 34 / 0.06)';
            }

            const labelStyle: React.CSSProperties = isActive
              ? { color: 'var(--color-brand-700)' }
              : isComplete
                ? { color: 'var(--color-ink)' }
                : isStarted
                  ? { color: 'var(--color-ink-2)' }
                  : { color: 'var(--color-ink-3)' };

            const ringClass = isActive
              ? ''
              : isComplete
                ? ''
                : isStarted
                  ? 'ring-2 ring-inset ring-[var(--color-brand-600)]'
                  : 'ring-1 ring-inset ring-[var(--color-line-3)]';

            const circleClass = cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
              motion,
              ringClass,
            );

            const labelClass = cn(
              'text-sm font-semibold',
              motion,
            );

            // Labels are hidden under the sm breakpoint unless the step is the
            // current one — the disc + numeric already carries the meaning, the
            // label is the bonus.
            const labelVisibility = isActive
              ? 'inline-block'
              : 'hidden sm:inline-block';

            return (
              <React.Fragment key={step.id}>
                <li className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => onSelect?.(step.id)}
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={`${step.label}, ${percent}% complete`}
                    className="group flex items-center gap-3 focus-visible:outline-none"
                  >
                    <span
                      className={circleClass}
                      style={circleStyle}
                      aria-hidden="true"
                    >
                      {isComplete && !isActive ? (
                        <LuCheck className="text-sm font-semibold" />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <span
                      className={cn(labelVisibility, labelClass)}
                      style={labelStyle}
                    >
                      {step.label}
                    </span>
                  </button>
                </li>

                {idx < steps.length - 1 && (
                  <div
                    className="mx-2 h-0.5 min-w-5 flex-1 overflow-hidden rounded-full bg-[var(--color-line-2)] sm:mx-3 sm:min-w-8"
                    aria-hidden="true"
                  >
                    <div
                      className={cn(
                        'h-full bg-[var(--color-brand-600)]',
                        motion,
                      )}
                      style={{ width: `${linePercent}%` }}
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
