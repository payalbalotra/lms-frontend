'use client';

import * as React from 'react';
import { IngredientsTable, MethodSteps, Scaler, Section, Yield, type Ingredient, type MethodStep } from './index';

/**
 * A recipe, in the two sections /sop-recipe-format.html gives it: Yield — the
 * batch control, what that batch makes, and the ingredients at that batch — and
 * Method. One "Recipe" heading over all of it would be a heading that says what
 * the title already said.
 *
 * The scaling has to be real: a control that visibly does nothing when a cook
 * presses it is worse than no control — they press it twice, then stop trusting
 * the numbers on the rest of the page.
 *
 * Ingredient amounts come from the API already computed per factor, so the table
 * only has to pick a column. The yield is arithmetic: the 1× value multiplied,
 * rounded to two decimals, with trailing zeros dropped, because "3 kg" is the
 * truth and "3.00 kg" is false precision.
 */
export function RecipeBody({
  factors,
  yieldItems,
  ingredients,
  steps,
  batchLabel,
  yieldTitle,
  methodTitle,
  stepsCount,
}: {
  factors: number[];
  yieldItems: { label: string; value: string; unit?: string; scales?: boolean }[];
  ingredients: Ingredient[];
  steps: MethodStep[];
  batchLabel: string;
  yieldTitle: string;
  methodTitle: string;
  stepsCount: string;
}): React.ReactElement {
  const [factor, setFactor] = React.useState(factors[0] ?? 1);
  const base = factors[0] ?? 1;

  const scaled = React.useMemo(
    () =>
      yieldItems.map((y) => {
        if (!y.scales) return y;
        const n = parseFloat(y.value.replace(',', '.'));
        if (!Number.isFinite(n)) return y;
        const value = String(Math.round((n * factor) / base * 100) / 100);
        return { ...y, value };
      }),
    [yieldItems, factor, base],
  );

  // The ingredient table needs the factors to pick a column, so ingredients
  // without factors are not a yield section — they would title an empty box.
  const showTable = ingredients.length > 0 && factors.length > 0;
  const hasYield = scaled.length > 0 || factors.length > 0 || showTable;

  return (
    <>
      {hasYield ? (
        <Section title={yieldTitle}>
          {factors.length > 0 ? <Scaler factors={factors} selected={factor} onSelect={setFactor} label={batchLabel} /> : null}
          {scaled.length > 0 ? (
            <Yield items={scaled.map((y) => ({ label: y.label, value: y.unit ? `${y.value} ${y.unit}` : y.value }))} />
          ) : null}
          {showTable ? (
            <IngredientsTable ingredients={ingredients} factors={factors} selectedFactor={factor} />
          ) : null}
        </Section>
      ) : null}
      {steps.length > 0 ? (
        <Section title={methodTitle} count={stepsCount}>
          <MethodSteps steps={steps} />
        </Section>
      ) : null}
    </>
  );
}
