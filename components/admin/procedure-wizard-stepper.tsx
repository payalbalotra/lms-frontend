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
  const progressPercent = steps.length > 1 ? (currentIdx / (steps.length - 1)) * 100 : 0;

  return (
    <nav aria-label={t('ariaLabel')} className="max-w-4xl mx-auto my-6">
      <div className="relative rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 sm:px-6 sm:py-4 shadow-xs">
        {/* Continuous Progress Bar Track Background */}
        <div className="absolute top-8 left-8 right-8 h-0.5 bg-[var(--color-line-2)] pointer-events-none hidden sm:block" />
        {/* Active Animated Progress Bar Fill */}
        <div
          className="absolute top-8 left-8 h-0.5 bg-[var(--color-brand-600)] transition-all duration-300 pointer-events-none hidden sm:block"
          style={{ width: `calc(${progressPercent}% - 0px)` }}
        />

        <ol className="relative z-10 flex items-center justify-between w-full">
          {steps.map((step, idx) => {
            const isActive = step.id === currentStep;
            const isCompleted = idx < currentIdx;

            return (
              <li key={step.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => onSelectStep?.(step.id)}
                  className="group flex items-center gap-2.5 bg-[var(--color-surface)] px-1.5 focus-visible:outline-none"
                >
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full text-[length:var(--text-xs)] font-bold transition-all shadow-2xs',
                      isActive
                        ? 'bg-[var(--color-brand-600)] text-white ring-4 ring-[var(--color-brand-tint)] scale-105'
                        : isCompleted
                          ? 'bg-[var(--color-brand-600)] text-white'
                          : 'border border-[var(--color-line-3)] bg-[var(--color-surface)] text-[var(--color-ink-3)] group-hover:border-[var(--color-brand-600)]/50',
                    )}
                  >
                    {isCompleted ? (
                      <i aria-hidden="true" className="ri-check-line text-sm font-bold" />
                    ) : (
                      step.num
                    )}
                  </span>
                  <span
                    className={cn(
                      'text-[length:var(--text-sm)] font-semibold transition-colors hidden sm:inline-block',
                      isActive
                        ? 'text-[var(--color-brand-700)] font-bold'
                        : isCompleted
                          ? 'text-[var(--color-ink)]'
                          : 'text-[var(--color-ink-3)] group-hover:text-[var(--color-ink-2)]',
                    )}
                  >
                    {t(step.labelKey as never)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
