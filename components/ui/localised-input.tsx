'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import { useBilingualTranslation } from '@/lib/use-bilingual-translation';
import type { Localised } from '@/lib/types';

export interface LocalisedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value'> {
  /** Which side of `value` this input is showing. */
  lang: 'en' | 'es';
  /** Both sides — the other one is the translation target. */
  value: Localised;
  /** Write one side. The parent owns state; this component never stores text. */
  onText: (lang: 'en' | 'es', text: string) => void;
  /**
   * Render the small "Translating…" / "Translation failed" line after the
   * input. Off by default because several call sites sit in flex rows where an
   * extra sibling would change the layout.
   */
  showStatus?: boolean;
}

// Same self-contained strings as BilingualInput — the label follows the target
// language, so no new i18n keys are needed.
const STATUS_TEXT: Record<'en' | 'es', { translating: string; error: string }> = {
  en: { translating: 'Translating…', error: 'Translation failed' },
  es: { translating: 'Traduciendo…', error: 'Error al traducir' },
};

/**
 * Drop-in replacement for a raw `<input>` on a bilingual field that only shows
 * one language at a time (quiz prompts, checklist titles, table cells…).
 *
 * The direction is known — whichever side the user types in drives the other —
 * so there is no language detection call.
 */
export function LocalisedInput({
  lang,
  value,
  onText,
  showStatus = false,
  className,
  onChange,
  ...inputProps
}: LocalisedInputProps): React.ReactElement {
  const { markUserEdit, status, activeTarget } = useBilingualTranslation({
    englishValue: value?.en ?? '',
    spanishValue: value?.es ?? '',
    onEnglishChange: (text) => onText('en', text),
    onSpanishChange: (text) => onText('es', text),
  });

  const show =
    showStatus && activeTarget !== null && (status === 'translating' || status === 'error');

  return (
    <>
      <input
        {...inputProps}
        lang={lang}
        className={className}
        value={value?.[lang] ?? ''}
        onChange={(e) => {
          onChange?.(e);
          onText(lang, e.target.value);
          // Real DOM edits only — programmatic writes never reach this.
          markUserEdit(lang, e.target.value);
        }}
      />
      {activeTarget !== null && show && (
        <span
          className={cn('bli__status', status === 'error' && 'is-error')}
          role="status"
          aria-live="polite"
        >
          {STATUS_TEXT[activeTarget][status === 'error' ? 'error' : 'translating']}
        </span>
      )}
    </>
  );
}
