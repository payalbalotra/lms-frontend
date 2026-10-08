'use client';

/**
 * Inline editor for an `ingredients` block, embedded inside a single
 * NotionBlockList row.
 *
 * Provides dedicated editing for recipe ingredients, batch factors, yield,
 * and allergen disclosures without bundling steps into the same block. Steps
 * are authored independently using numbered Steps (method) blocks.
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { LuX } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomSelect } from '@/components/ui/custom-select';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { ALLERGEN_KEYS, type AllergenKey } from '@/lib/allergens';
import { RecipeYieldSection } from './recipe-block-body';
import type {
  ProcedureAllergen,
  ProcedureBlock,
  ProcedureIngredient,
  ProcedureYieldItem,
} from '@/lib/types';

type IngredientsBlock = Extract<ProcedureBlock, { kind: 'ingredients' }>;

interface IngredientsBlockBodyProps {
  block: IngredientsBlock;
  onPatch: (next: IngredientsBlock) => void;
  lang?: 'en' | 'es';
}

const COMMON_UNITS = [
  'pcs',
  'each',
  'g',
  'kg',
  'ml',
  'l',
  'oz',
  'lb',
  'cup',
  'tbsp',
  'tsp',
  'pinch',
  'handful',
  'spoonfuls',
  'tortillas',
  'wedge',
  'coat',
  'drizzle',
] as const;

function emptyIngredient(factorsCount = 1): ProcedureIngredient {
  return {
    name: '',
    form: '',
    allergen: false,
    unit: '',
    amounts: Array.from({ length: Math.max(1, factorsCount) }, () => ''),
  };
}

export function IngredientsBlockBody({
  block,
  onPatch,
}: IngredientsBlockBodyProps): React.ReactElement {
  const tForm = useTranslations('admin.library.new.form');
  const ingredients = block.ingredients ?? [];
  const factors = block.factors && block.factors.length > 0 ? block.factors : [1];
  const yieldItems = block.yieldItems ?? [];

  function setFactors(nextFactors: number[]): void {
    const updatedIngredients = ingredients.map((ing) => {
      const nextAmounts = nextFactors.map((_, idx) => ing.amounts[idx] ?? ing.amounts[0] ?? '');
      return { ...ing, amounts: nextAmounts };
    });
    onPatch({ ...block, factors: nextFactors, ingredients: updatedIngredients });
  }

  function updateIngredient(idx: number, patch: Partial<ProcedureIngredient>): void {
    onPatch({
      ...block,
      ingredients: ingredients.map((x, j) => (j === idx ? { ...x, ...patch } : x)),
    });
  }

  function setAmount(ingIdx: number, factorIdx: number, value: string): void {
    onPatch({
      ...block,
      ingredients: ingredients.map((x, j) => {
        if (j !== ingIdx) return x;
        const nextAmounts = [...x.amounts];
        while (nextAmounts.length <= factorIdx) nextAmounts.push('');
        nextAmounts[factorIdx] = value;
        return { ...x, amounts: nextAmounts };
      }),
    });
  }

  function addIngredient(): void {
    onPatch({
      ...block,
      ingredients: [...ingredients, emptyIngredient(factors.length)],
    });
  }

  function removeIngredient(idx: number): void {
    onPatch({
      ...block,
      ingredients: ingredients.filter((_, j) => j !== idx),
    });
  }

  function addYieldItem(): void {
    const newItem: ProcedureYieldItem = {
      label: 'Batch yield',
      value: '',
      unit: '',
      scales: true,
    };
    onPatch({ ...block, yieldItems: [...yieldItems, newItem] });
  }

  function updateYieldItem(idx: number, patch: Partial<ProcedureYieldItem>): void {
    onPatch({
      ...block,
      yieldItems: yieldItems.map((item, j) => (j === idx ? { ...item, ...patch } : item)),
    });
  }

  function removeYieldItem(idx: number): void {
    onPatch({
      ...block,
      yieldItems: yieldItems.filter((_, j) => j !== idx),
    });
  }

  return (
    <div className="space-y-4 pt-1">
      {/* Yield & Batch Metrics */}
      <RecipeYieldSection
        yieldItems={yieldItems}
        onChange={(nextYield) => onPatch({ ...block, yieldItems: nextYield })}
      />

      {/* Streamlined Ingredients table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm font-semibold text-[var(--color-ink)]">
            Ingredients ({ingredients.length})
          </Label>
          <Button type="button" variant="ghost" size="sm" onClick={addIngredient}>
            <Icon icon="ri-add-line" className="mr-1" /> Add ingredient
          </Button>
        </div>

        {ingredients.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-2)] p-4 text-center text-sm text-[var(--color-ink-3)]">
            No ingredients added yet.{' '}
            <button
              type="button"
              onClick={addIngredient}
              className="font-medium text-[var(--color-brand)] underline hover:no-underline"
            >
              Add the first ingredient
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--color-line-2)] bg-[var(--color-wash)]/60 text-[var(--color-ink-2)]">
                  <th className="p-2 font-semibold">Ingredient name</th>
                  <th className="w-56 p-2 font-semibold">Amount / Qty</th>
                  <th className="w-20 p-2 font-semibold text-center" title="Mark as allergen">
                    Allergen
                  </th>
                  <th className="w-8 p-2 text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line-2)]">
                {ingredients.map((row, i) => {
                  const displayAmount =
                    row.amounts[0] ??
                    (row.unit ? `${row.unit}` : '');
                  return (
                    <tr key={i} className="hover:bg-[var(--color-wash)]/30 transition-colors">
                      <td className="p-1.5">
                        <Input
                          value={row.name}
                          onChange={(e) => updateIngredient(i, { name: e.target.value })}
                          placeholder="e.g. Halibut, Beer batter, Taco tortillas..."
                          className="h-8 text-xs font-medium"
                        />
                      </td>
                      <td className="p-1.5">
                        <Input
                          value={displayAmount}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateIngredient(i, { amounts: [val] });
                          }}
                          placeholder="e.g. 2 pieces, 1 pinch, to taste..."
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="p-1.5 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={Boolean(row.allergen)}
                          onChange={(e) => updateIngredient(i, { allergen: e.target.checked })}
                          className="size-4 cursor-pointer accent-[var(--color-warn)]"
                          title="Contains allergen"
                        />
                      </td>
                      <td className="p-1.5 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => removeIngredient(i)}
                          className="flex size-7 items-center justify-center rounded text-[var(--color-ink-3)] hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)] transition-colors"
                          title="Remove ingredient"
                        >
                          <Icon icon="ri-delete-bin-line" className="text-sm" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Allergens disclosure */}
      <IngredientsAllergens
        allergen={block.allergen}
        onChange={(allergen) => onPatch({ ...block, allergen })}
        labels={{
          title: tForm('allergenTitle'),
          picker: tForm('allergenPickerLabel'),
        }}
      />
    </div>
  );
}

function IngredientsAllergens({
  allergen,
  onChange,
  labels,
}: {
  allergen: ProcedureAllergen | undefined;
  onChange: (next: ProcedureAllergen | undefined) => void;
  labels: { title: string; picker: string };
}): React.ReactElement {
  const tForm = useTranslations('admin.library.new.form');
  const selected = allergen?.selectedAllergens ?? [];
  const [customInput, setCustomInput] = React.useState('');

  const standardSet = new Set<string>(ALLERGEN_KEYS);
  const customTags = selected.filter((k) => !standardSet.has(k));

  function toggle(key: AllergenKey, on: boolean): void {
    const set = new Set(selected);
    if (on) set.add(key);
    else set.delete(key);
    const nextSelected = Array.from(set);
    if (nextSelected.length === 0 && !allergen?.summary && !allergen?.detail) {
      onChange(undefined);
    } else {
      onChange({
        summary: allergen?.summary ?? '',
        detail: allergen?.detail ?? '',
        selectedAllergens: nextSelected,
      });
    }
  }

  function addCustom(): void {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (!selected.includes(trimmed as AllergenKey)) {
      const next = [...selected, trimmed as AllergenKey];
      onChange({
        summary: allergen?.summary ?? '',
        detail: allergen?.detail ?? '',
        selectedAllergens: next,
      });
    }
    setCustomInput('');
  }

  function removeCustom(tag: string): void {
    const next = selected.filter((k) => k !== tag);
    if (next.length === 0 && !allergen?.summary && !allergen?.detail) {
      onChange(undefined);
    } else {
      onChange({
        summary: allergen?.summary ?? '',
        detail: allergen?.detail ?? '',
        selectedAllergens: next,
      });
    }
  }

  function setSummary(summary: string): void {
    onChange({
      summary,
      detail: allergen?.detail ?? '',
      selectedAllergens: allergen?.selectedAllergens ?? [],
    });
  }

  function setDetail(detail: string): void {
    onChange({
      summary: allergen?.summary ?? '',
      detail,
      selectedAllergens: allergen?.selectedAllergens ?? [],
    });
  }

  return (
    <details open className="rounded-[var(--radius-md)] border border-amber-300/80 bg-amber-50/20 dark:bg-amber-950/10 dark:border-amber-900/60 p-3 space-y-3">
      <summary className="cursor-pointer text-sm font-semibold text-[var(--color-ink)] flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Icon icon="ri-alarm-warning-line" className="text-base text-amber-600" />
          {labels.title}
          {selected.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-[var(--color-warn-tint)] px-2 py-0.5 text-xs font-semibold text-[var(--color-warn-ink)]">
              {selected.length} allergen{selected.length > 1 ? 's' : ''}
            </span>
          )}
        </span>
      </summary>
      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs text-[var(--color-ink-2)]">Allergen summary header</Label>
            <Input
              value={allergen?.summary ?? ''}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Fish, Gluten, Egg"
              className="mt-1 h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-[var(--color-ink-2)]">Detail / Instructions</Label>
            <Input
              value={allergen?.detail ?? ''}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="e.g. Contains Halibut (fish), beer batter (gluten), mayo (egg)."
              className="mt-1 h-8 text-xs"
            />
          </div>
        </div>

        <p className="text-xs text-[var(--color-ink-3)]">{labels.picker}</p>
        <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ALLERGEN_KEYS.map((key) => {
            const checked = selected.includes(key);
            return (
              <label
                key={key}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-xs transition-colors',
                  checked
                    ? 'border-[var(--color-warn)] bg-[var(--color-warn-tint)] text-[var(--color-ink)]'
                    : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:bg-[var(--color-wash)]',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggle(key, e.target.checked)}
                />
                {tForm(`allergens.${key}` as `allergens.${AllergenKey}`)}
              </label>
            );
          })}
        </fieldset>

        {/* Custom allergen chips & small inline add input */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {customTags.length > 0 && (
            <span className="text-xs font-semibold text-[var(--color-ink-3)]">Custom:</span>
          )}
          {customTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-warn)] bg-[var(--color-warn-tint)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-warn-ink)]"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeCustom(tag)}
                className="text-[var(--color-warn-ink)] hover:text-black"
                aria-label={`Remove ${tag}`}
              >
                <LuX className="size-3" />
              </button>
            </span>
          ))}
          <div className="flex items-center gap-1.5">
            <Input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="Add other allergen…"
              className="h-7 w-36 text-xs"
            />
            <Button type="button" variant="ghost" size="sm" onClick={addCustom} className="h-7 px-2 text-xs">
              Add
            </Button>
          </div>
        </div>
      </div>
    </details>
  );
}
