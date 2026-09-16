'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import type { RecipeIngredientItem } from './recipe-ingredients-editor';
import type { ProcedureBlock, ProcedureMethodStep } from '@/lib/types';

interface RecipeLivePreviewProps {
  title: string;
  purpose: string;
  categoryLabel: string;
  ingredients: RecipeIngredientItem[];
  selectedFactor: number;
  blocks: ProcedureBlock[];
}

export function RecipeLivePreview({
  title,
  purpose,
  categoryLabel,
  ingredients,
  selectedFactor,
  blocks,
}: RecipeLivePreviewProps): React.ReactElement {
  const t = useTranslations('admin.library.new.recipe');

  // Extract method steps from method blocks if any exist
  const methodSteps = blocks
    .filter((b): b is Extract<ProcedureBlock, { kind: 'method' }> => b.kind === 'method')
    .flatMap((b) => b.steps);

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[var(--color-ink)] font-bold text-[length:var(--text-sm)]">
          <i aria-hidden="true" className="ri-eye-line text-[var(--color-brand-700)]" />
          <span>{t('previewTitle')}</span>
        </div>
        <button
          type="button"
          onClick={() => alert('Full Preview: Shows exact employee view full screen.')}
          className="text-[length:var(--text-xs)] font-medium text-[var(--color-brand-700)] hover:underline"
        >
          {t('viewFullPreview')}
        </button>
      </div>

      {/* Live Preview Card Content */}
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-white space-y-3 p-4 shadow-xs">
        {/* Mock Food / Recipe Image Banner */}
        <div className="relative h-28 w-full overflow-hidden rounded-md bg-gradient-to-r from-amber-500 to-red-500 flex items-center justify-center text-white">
          <div className="absolute inset-0 bg-black/20" />
          <i aria-hidden="true" className="ri-restaurant-2-line text-4xl opacity-80" />
        </div>

        {/* Title & Category Badge */}
        <div>
          <h4 className="font-[family-name:var(--font-ui)] text-[length:var(--text-md)] font-bold text-[var(--color-ink)]">
            {title.trim() || t('previewTitlePlaceholder')}
          </h4>
          <span className="mt-1 inline-block rounded-full bg-[var(--color-brand-tint)] px-2.5 py-0.5 text-[length:var(--text-xs)] font-semibold text-[var(--color-brand-700)]">
            {categoryLabel}
          </span>
        </div>

        {/* Purpose */}
        {purpose.trim() && (
          <div className="space-y-1">
            <h5 className="text-[length:var(--text-xs)] font-bold uppercase tracking-wide text-[var(--color-ink-3)]">
              Purpose
            </h5>
            <p className="text-[length:var(--text-xs)] text-[var(--color-ink-2)] line-clamp-3">
              {purpose}
            </p>
          </div>
        )}

        {/* Ingredients List */}
        {ingredients.length > 0 && (
          <div className="space-y-1.5 border-t border-[var(--color-line)]/50 pt-2">
            <h5 className="text-[length:var(--text-xs)] font-bold uppercase tracking-wide text-[var(--color-ink-3)]">
              {t('previewIngredientsHeader', { factor: `${selectedFactor}×` })}
            </h5>
            <ul className="space-y-1 text-[length:var(--text-xs)]">
              {ingredients.map((ing) => {
                if (!ing.name.trim()) return null;
                const qtyNum = parseFloat(ing.quantity);
                const scaledQty = isNaN(qtyNum) ? ing.quantity : `${(qtyNum * selectedFactor).toFixed(0)}`;
                return (
                  <li key={ing.id} className="flex items-center justify-between text-[var(--color-ink)]">
                    <span className="font-medium">{ing.name}</span>
                    <span className="font-mono text-[var(--color-ink-2)]">
                      {scaledQty} {ing.unit}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Method Steps List */}
        {methodSteps.length > 0 && (
          <div className="space-y-2 border-t border-[var(--color-line)]/50 pt-2">
            <h5 className="text-[length:var(--text-xs)] font-bold uppercase tracking-wide text-[var(--color-ink-3)]">
              Method
            </h5>
            <div className="space-y-2 text-[length:var(--text-xs)]">
              {methodSteps.map((step, idx) => {
                const bodyText = step.body.en || step.body.es || '';
                return (
                  <div key={step.id || idx} className="flex items-start gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-tint)] font-mono text-[10px] font-bold text-[var(--color-brand-700)]">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-[var(--color-ink)] line-clamp-2">
                        {bodyText || `Step ${idx + 1}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
