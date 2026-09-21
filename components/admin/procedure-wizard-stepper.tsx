'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { LuCheck } from 'react-icons/lu';

export type WizardStepId = 'details' | 'ingredients' | 'method' | 'content' | 'quiz' | 'access' | 'review';

export interface WizardStep {
  id: WizardStepId;
  labelKey: string;
  num: number;
}

export const GENERAL_WIZARD_STEPS: WizardStep[] = [
  { id: 'details', labelKey: 'stepDetails', num: 1 },
  { id: 'content', labelKey: 'stepContent', num: 2 },
  { id: 'quiz', labelKey: 'stepQuiz', num: 3 },
  { id: 'access', labelKey: 'stepAccess', num: 4 },
  { id: 'review', labelKey: 'stepReview', num: 5 },
];

export const RECIPE_WIZARD_STEPS: WizardStep[] = [
  { id: 'details', labelKey: 'stepDetails', num: 1 },
  { id: 'ingredients', labelKey: 'stepIngredients', num: 2 },
  { id: 'method', labelKey: 'stepMethod', num: 3 },
  { id: 'quiz', labelKey: 'stepQuiz', num: 4 },
  { id: 'access', labelKey: 'stepAccess', num: 5 },
  { id: 'review', labelKey: 'stepReview', num: 6 },
];

interface ProcedureWizardStepperProps {
  currentStep: WizardStepId;
  isRecipe?: boolean;
  onSelectStep?: (step: WizardStepId) => void;
}

export function ProcedureWizardStepper({
  currentStep,
  isRecipe = false,
  onSelectStep,
}: ProcedureWizardStepperProps): React.ReactElement {
  const t = useTranslations('admin.library.new.stepper');
  const steps = isRecipe ? RECIPE_WIZARD_STEPS : GENERAL_WIZARD_STEPS;

  // If currentStep points at an id that's not in the current array (e.g.
  // 'ingredients' when isRecipe is false because the procedure type just
  // changed), clamp to the first step rather than rendering every step as
  // "not yet completed" with no active highlight.
  const rawIdx = steps.findIndex((s) => s.id === currentStep);
  const currentIdx = rawIdx >= 0 ? rawIdx : 0;
  const activeId = steps[currentIdx].id;

  return (
    <nav aria-label={t('ariaLabel')} className="my-6 w-full">
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 sm:px-6 sm:py-4">
        <ol className="flex items-center justify-between w-full">
          {steps.map((step, idx) => {
            const isActive = step.id === activeId;
            const isCompleted = idx < currentIdx;
            const isConnectorActive = idx < currentIdx;

            return (
              <React.Fragment key={step.id}>
                <li className="flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectStep?.(step.id)}
                    className="group flex items-center gap-3 bg-[var(--color-surface)] focus-visible:outline-none"
                  >
                    <span
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all shadow-e1',
                        isActive
                          ? 'bg-[var(--color-brand-600)] text-white ring-4 ring-[var(--color-brand-tint)] scale-105'
                          : isCompleted
                            ? 'bg-[var(--color-brand-600)] text-white'
                            : 'border border-[var(--color-line-3)] bg-[var(--color-surface)] text-[var(--color-ink-3)] group-hover:border-[var(--color-brand-tint-2)]',
                      )}
                    >
                      {isCompleted ? (
                        <LuCheck aria-hidden="true" className="text-sm font-semibold" />
                      ) : (
                        step.num
                      )}
                    </span>
                    <span
                      className={cn(
                        'text-sm font-semibold transition-colors hidden sm:inline-block',
                        isActive
                          ? 'text-[var(--color-brand-700)] font-semibold'
                          : isCompleted
                            ? 'text-[var(--color-ink)]'
                            : 'text-[var(--color-ink-3)] group-hover:text-[var(--color-ink-2)]',
                      )}
                    >
                      {t(step.labelKey as never)}
                    </span>
                  </button>
                </li>

                {/* Connecting Line Segment between adjacent steps */}
                {idx < steps.length - 1 && (
                  <div className="flex-1 min-w-5 sm:min-w-8 mx-2 sm:mx-3 h-0.5 rounded-full overflow-hidden bg-[var(--color-line-2)]">
                    <div
                      className={cn(
                        'h-full transition-all duration-[var(--dur)]',
                        isConnectorActive ? 'bg-[var(--color-brand-600)] w-full' : 'w-0',
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
