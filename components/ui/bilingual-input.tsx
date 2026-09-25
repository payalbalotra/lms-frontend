'use client';

import * as React from 'react';
import { useId, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface BilingualValue {
  en: string;
  es: string;
}

export interface BilingualInputProps {
  label?: string;
  value: BilingualValue;
  onChange: (value: BilingualValue) => void;
  required?: boolean;
  multiline?: boolean;
  maxLength?: number;
  placeholder?: { en?: string; es?: string };
  translate?: (text: string, from: 'en' | 'es', to: 'en' | 'es') => string | Promise<string>;
  defaultLang?: 'en' | 'es';
  name?: string;
  className?: string;
  inputClassName?: string;
  size?: 'default' | 'compact';
  onInputKeyDown?: (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    lang: 'en' | 'es',
  ) => void;
}

const LANGS: Array<'en' | 'es'> = ['en', 'es'];
const LANG_NAME: Record<'en' | 'es', string> = { en: 'English', es: 'Spanish' };
const DEFAULT_PLACEHOLDER: Record<'en' | 'es', string> = {
  en: 'Write in English...',
  es: 'Escribe en español...',
};

// Default fallback translator without language prefix (swap for a real API call later).
export const dummyTranslate = (text: string, _from: 'en' | 'es', _to: 'en' | 'es'): string =>
  text;

export function BilingualInput({
  label,
  value,
  onChange,
  required,
  multiline,
  maxLength,
  placeholder,
  translate = dummyTranslate,
  defaultLang = 'en',
  name,
  className,
  inputClassName,
  size = 'default',
  onInputKeyDown,
}: BilingualInputProps): React.ReactElement {
  const baseId = useId();
  const [active, setActive] = useState<'en' | 'es'>(defaultLang);
  const controls = useRef<{
    en: HTMLInputElement | HTMLTextAreaElement | null;
    es: HTMLInputElement | HTMLTextAreaElement | null;
  }>({
    en: null,
    es: null,
  });

  const valueRef = useRef(value);
  valueRef.current = value;

  const typed = useRef({ en: Boolean(value?.en), es: Boolean(value?.es) });
  const requestId = useRef(0);

  useEffect(() => {
    LANGS.forEach((l) => {
      if (value?.[l] === '') typed.current[l] = false;
    });
  }, [value?.en, value?.es]);

  const clip = (s: string): string => (maxLength ? s.slice(0, maxLength) : s);
  const commit = (next: BilingualValue): void => {
    valueRef.current = next;
    onChange(next);
  };

  const handleChange = (lang: 'en' | 'es', text: string): void => {
    const other: 'en' | 'es' = lang === 'en' ? 'es' : 'en';
    typed.current[lang] = text !== '';
    const next: BilingualValue = {
      en: valueRef.current?.en ?? '',
      es: valueRef.current?.es ?? '',
      [lang]: text,
    };
    const myRequest = ++requestId.current;

    if (typed.current[other]) {
      commit(next);
      return;
    }

    const result = translate(text, lang, other);
    if (typeof result === 'string') {
      commit({ ...next, [other]: clip(result) });
      return;
    }

    commit(next);
    result
      .then((translated) => {
        if (myRequest !== requestId.current || typed.current[other]) return;
        commit({ ...valueRef.current, [other]: clip(translated) });
      })
      .catch(() => {});
  };

  const groupId = label ? `${baseId}-label` : undefined;

  return (
    <div
      className={cn('bli', size === 'compact' && 'bli--compact', className)}
      role="group"
      aria-labelledby={groupId}
    >
      {label && (
        <div id={groupId} className="bli__label">
          {label}
          {required && (
            <span className="bli__required" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </div>
      )}

      <div className="bli__fields">
        {LANGS.map((lang) => {
          const isActive = active === lang;
          const shared = {
            id: `${baseId}-${lang}`,
            name: name ? `${name}.${lang}` : undefined,
            value: value?.[lang] ?? '',
            maxLength,
            lang,
            placeholder: placeholder?.[lang] ?? DEFAULT_PLACEHOLDER[lang],
            'aria-label': label ? `${label} (${LANG_NAME[lang]})` : (placeholder?.[lang] ?? LANG_NAME[lang]),
            'aria-required': required || undefined,
            className: cn('bli__control', inputClassName),
            onFocus: () => setActive(lang),
            onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              onInputKeyDown?.(e, lang);
            },
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              handleChange(lang, e.target.value),
          };
          const setRef = (el: HTMLInputElement | HTMLTextAreaElement | null): void => {
            controls.current[lang] = el;
          };

          return (
            <div
              key={lang}
              className={[
                'bli__field',
                isActive ? 'is-active' : 'is-inactive',
                multiline ? 'is-multiline' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => controls.current[lang]?.focus()}
            >
              {multiline ? (
                <textarea {...shared} ref={setRef} />
              ) : (
                <input {...shared} type="text" ref={setRef} />
              )}
              {maxLength !== undefined && (
                <span className="bli__count" aria-hidden="true">
                  {(value?.[lang] ?? '').length} / {maxLength}
                </span>
              )}
              <span className="bli__tag" aria-hidden="true">
                {lang.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
