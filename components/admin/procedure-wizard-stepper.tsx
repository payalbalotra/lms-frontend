'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type WizardStepId = 'details' | 'ingredients' | 'method' | 'content' | 'access' | 'review';

export interface WizardStep {
  id: WizardStepId;
  labelKey: string;
  num: number;
}

export const GENERAL_WIZARD_STEPS: WizardStep[] = [
  { id: 'details', labelKey: 'stepDetails', num: 1 },
  { id: 'content', labelKey: 'stepContent', num: 2 },
  { id: 'access', labelKey: 'stepAccess', num: 3 },
  { id: 'review', labelKey: 'stepReview', num: 4 },
];

export const RECIPE_WIZARD_STEPS: WizardStep[] = [
  { id: 'details', labelKey: 'stepDetails', num: 1 },
  { id: 'ingredients', labelKey: 'stepIngredients', num: 2 },
  { id: 'method', labelKey: 'stepMethod', num: 3 },
  { id: 'access', labelKey: 'stepAccess', num: 4 },
  { id: 'review', labelKey: 'stepReview', num: 5 },
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
  const currentIdx = steps.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label={t('ariaLabel')} className="my-6">
      <ol className="flex items-center justify-between gap-2 max-w-4xl mx-auto">
        {steps.map((step, idx) => {
          const isActive = step.id === currentStep;
          const isCompleted = idx < currentIdx;

          return (
            <li key={step.id} className="flex-1 flex items-center">
              <button
                type="button"
                onClick={() => onSelectStep?.(step.id)}
                className="group flex items-center gap-2.5 focus-visible:outline-none"
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-[length:var(--text-xs)] font-bold transition-all',
                    isActive
                      ? 'bg-[var(--color-brand-600)] text-white ring-4 ring-[var(--color-brand-tint)]'
                      : isCompleted
                        ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]'
                        : 'border border-[var(--color-line-3)] bg-[var(--color-surface)] text-[var(--color-ink-3)]',
                  )}
                >
                  {isCompleted ? (
                    <i aria-hidden="true" className="ri-check-line text-sm" />
                  ) : (
                    step.num
                  )}
                </span>
                <span
                  className={cn(
                    'text-[length:var(--text-sm)] font-semibold transition-colors',
                    isActive
                      ? 'text-[var(--color-ink)] font-bold'
                      : isCompleted
                        ? 'text-[var(--color-ink)]'
                        : 'text-[var(--color-ink-3)] group-hover:text-[var(--color-ink-2)]',
                  )}
                >
                  {t(step.labelKey as never)}
                </span>
              </button>

              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    'mx-4 h-0.5 flex-1 rounded-full transition-colors',
                    idx < currentIdx ? 'bg-[var(--color-brand-600)]' : 'bg-[var(--color-line-2)]',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
