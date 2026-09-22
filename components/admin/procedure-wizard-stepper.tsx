'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { WizardStepper } from '@/components/ui/wizard-stepper';

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

/**
 * The procedure wizard's steps: this names them, and `WizardStepper` draws them.
 * A recipe carries two extra steps, so which list applies is a property of the
 * procedure, not of the drawing.
 */
export function ProcedureWizardStepper({
  currentStep,
  isRecipe = false,
  onSelectStep,
}: {
  currentStep: WizardStepId;
  isRecipe?: boolean;
  onSelectStep?: (step: WizardStepId) => void;
}): React.ReactElement {
  const t = useTranslations('admin.library.new.stepper');
  const steps = isRecipe ? RECIPE_WIZARD_STEPS : GENERAL_WIZARD_STEPS;

  return (
    <WizardStepper
      ariaLabel={t('ariaLabel')}
      currentStep={currentStep}
      steps={steps.map((s) => ({ id: s.id, num: s.num, label: t(s.labelKey as never) }))}
      onSelectStep={onSelectStep ? (id) => onSelectStep(id as WizardStepId) : undefined}
    />
  );
}
