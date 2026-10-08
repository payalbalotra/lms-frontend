'use client';

import * as React from 'react';

import {
  hasGeminiConfig,
  TranslationError,
  translateText,
  type TranslationLang,
} from '@/lib/gemini-translate';

export type { TranslationLang };

/** Keystrokes stop → one Gemini call. Originally specified at 1500-2000ms;
 *  relaxed to 800ms so the opposite field fills in before the user moves on. */
export const TRANSLATE_DEBOUNCE_MS = 800;

/** How long a failed-translation hint stays on screen before it fades out. */
const ERROR_HINT_MS = 6000;

/** Save gives pending translations this long before it proceeds anyway. */
const DEFAULT_WAIT_TIMEOUT_MS = 8000;

export type TranslationStatus = 'idle' | 'waiting' | 'translating' | 'error';

/**
 * Who owns the text in a field right now.
 *
 * - `initial`   — loaded from storage. Replacable by a newer translation, but
 *                 never cleared when the other side is emptied (it may be
 *                 somebody's hand-written copy).
 * - `generated` — written by a translation in this session. Replacable, and
 *                 cleared if its source is emptied.
 * - `user`      — hand-edited in this session. Never written to again until
 *                 the user empties it themselves.
 * - `empty`     — nothing there.
 */
type FieldOwner = 'user' | 'generated' | 'initial' | 'empty';

function otherSide(side: TranslationLang): TranslationLang {
  return side === 'en' ? 'es' : 'en';
}

/* ------------------------------------------------------------- tracker -- */

/**
 * Counts outstanding translation work across every field on the page so a
 * save can wait for all of them at once (spec edge cases #8 and #13).
 *
 * A "slot" is acquired the moment a translation is scheduled — including the
 * debounce wait, not just the network call — and released when it settles or
 * is cancelled. So a save right after a keystroke still waits.
 */
let slotSeq = 0;
const activeSlots = new Set<number>();
const slotListeners = new Set<() => void>();

function emitSlots(): void {
  slotListeners.forEach((listener) => listener());
}

function acquireSlot(): number {
  const id = ++slotSeq;
  activeSlots.add(id);
  emitSlots();
  return id;
}

/** Idempotent: releasing an already-released slot is a no-op. */
function releaseSlot(id: number): void {
  if (activeSlots.delete(id)) emitSlots();
}

function subscribeSlots(listener: () => void): () => void {
  slotListeners.add(listener);
  return () => {
    slotListeners.delete(listener);
  };
}

/** Subscribe to pending-translation changes — for `useSyncExternalStore`. */
export function subscribeTranslations(listener: () => void): () => void {
  return subscribeSlots(listener);
}

export function isTranslating(): boolean {
  return activeSlots.size > 0;
}

/**
 * Resolves once every pending translation on the page has settled, or after
 * `timeoutMs` so a hung request can never wedge the form.
 */
export async function waitForTranslations(timeoutMs = DEFAULT_WAIT_TIMEOUT_MS): Promise<void> {
  if (activeSlots.size === 0) return;

  await new Promise<void>((resolve) => {
    let unsubscribe: () => void = () => {};
    let timer: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    const finish = (): void => {
      if (settled) return;
      settled = true;
      unsubscribe();
      if (timer !== null) clearTimeout(timer);
      resolve();
    };

    unsubscribe = subscribeSlots(() => {
      if (activeSlots.size === 0) finish();
    });
    timer = setTimeout(finish, timeoutMs);

    if (activeSlots.size === 0) finish();
  });
}

/* ---------------------------------------------------------------- hook -- */

export interface UseBilingualTranslationParams {
  englishValue: string;
  spanishValue: string;
  onEnglishChange: (value: string) => void;
  onSpanishChange: (value: string) => void;
  /** Default 800ms. */
  debounceMs?: number;
  /** Applied to translated OUTPUT only — the source text is never clipped. */
  maxLength?: number;
  /** Override the translator. Defaults to Gemini. */
  translate?: (
    text: string,
    from: TranslationLang,
    to: TranslationLang,
  ) => string | Promise<string>;
  /** Default: a key is configured, or an override translator was supplied. */
  enabled?: boolean;
}

export interface BilingualTranslationApi {
  /**
   * Must only ever be called from a real input `onChange`. Programmatic
   * writes go through `onEnglishChange`/`onSpanishChange` and never reach it,
   * which is what breaks the EN → ES → EN loop (spec edge case #1) without
   * relying on value comparison.
   */
  markUserEdit: (side: TranslationLang, text: string) => void;
  status: TranslationStatus;
  /** The side currently being translated into, if any. */
  activeTarget: TranslationLang | null;
  /** Cancel pending work and forget ownership — for form reset (edge #12). */
  reset: () => void;
}

export function useBilingualTranslation({
  englishValue,
  spanishValue,
  onEnglishChange,
  onSpanishChange,
  debounceMs = TRANSLATE_DEBOUNCE_MS,
  maxLength,
  translate,
  enabled = translate ? true : hasGeminiConfig(),
}: UseBilingualTranslationParams): BilingualTranslationApi {
  const translateFn = translate ?? translateText;
  const [status, setStatus] = React.useState<TranslationStatus>('idle');
  const [activeTarget, setActiveTarget] = React.useState<TranslationLang | null>(null);

  const mountedRef = React.useRef(true);
  /** Bumped on every edit / reset / unmount. An in-flight response whose
   *  sequence no longer matches is stale and is discarded (edge #2). */
  const seqRef = React.useRef(0);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const slotRef = React.useRef<number | null>(null);

  const ownerRef = React.useRef<Record<TranslationLang, FieldOwner>>({
    en: englishValue.trim() ? 'initial' : 'empty',
    es: spanishValue.trim() ? 'initial' : 'empty',
  });
  const valuesRef = React.useRef({ en: englishValue, es: spanishValue });
  const settersRef = React.useRef({ onEnglishChange, onSpanishChange });

  const invalidate = React.useCallback((): void => {
    seqRef.current += 1;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (errorTimerRef.current !== null) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    if (slotRef.current !== null) {
      releaseSlot(slotRef.current);
      slotRef.current = null;
    }
  }, []);

  const write = React.useCallback((side: TranslationLang, text: string): void => {
    if (side === 'en') settersRef.current.onEnglishChange(text);
    else settersRef.current.onSpanishChange(text);
  }, []);

  /** Read-through, so narrowing from an earlier check can't carry across an `await`. */
  const ownerOf = React.useCallback(
    (side: TranslationLang): FieldOwner => ownerRef.current[side],
    [],
  );

  /** Drop the indicator without disturbing a newer request's state. */
  const settle = React.useCallback((): void => {
    setStatus('idle');
    setActiveTarget(null);
  }, []);

  const flashError = React.useCallback(
    (target: TranslationLang): void => {
      setStatus('error');
      setActiveTarget(target);
      if (errorTimerRef.current !== null) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => {
        errorTimerRef.current = null;
        if (!mountedRef.current) return;
        setStatus('idle');
        setActiveTarget(null);
      }, ERROR_HINT_MS);
    },
    [],
  );

  const run = React.useCallback(
    async (
      mySeq: number,
      source: TranslationLang,
      target: TranslationLang,
      text: string,
      slot: number,
    ): Promise<void> => {
      try {
        // Re-check right before firing: a newer edit may have arrived.
        if (mySeq !== seqRef.current) return;
        if (ownerOf(target) === 'user') {
          settle();
          return;
        }

        setStatus('translating');
        setActiveTarget(target);

        const translated = await Promise.resolve(translateFn(text, source, target));
        if (!translated || !translated.trim()) {
          throw new TranslationError('empty-response', 'Translator returned no text');
        }

        if (!mountedRef.current) return;
        if (mySeq !== seqRef.current) return; // stale response (edge #2)
        // Bailed out with this still the newest request, so nobody else is
        // going to reset the indicator for us.
        if (ownerOf(target) === 'user') return settle(); // hand-edited (edge #3)
        if (valuesRef.current[source] !== text) return settle(); // source moved on

        write(target, maxLength ? translated.slice(0, maxLength) : translated);
        ownerRef.current[target] = 'generated';
        settle();
      } catch (err) {
        if (!mountedRef.current) return;
        if (mySeq !== seqRef.current) return;
        // Keep both sides exactly as they are — no clearing, no retry (edge #9).
        flashError(target);
      } finally {
        releaseSlot(slot);
        if (slotRef.current === slot) slotRef.current = null;
      }
    },
    [flashError, maxLength, ownerOf, settle, translateFn, write],
  );

  const markUserEdit = React.useCallback(
    (side: TranslationLang, text: string): void => {
      const target = otherSide(side);
      const trimmed = text.trim();

      ownerRef.current[side] = trimmed === '' ? 'empty' : 'user';

      // Cancels the debounce timer, bumps the sequence (so any in-flight
      // response is discarded) and releases the outstanding slot.
      invalidate();

      if (!enabled) {
        settle();
        return;
      }

      // Never overwrite a side the user typed into by hand (edge #3).
      if (ownerRef.current[target] === 'user') {
        settle();
        return;
      }

      // Empty / whitespace-only source: no request (edge #4, #5). Clearing a
      // generated target is handled after commit, in an effect below, so we
      // never write twice inside one event handler.
      if (trimmed === '') {
        settle();
        return;
      }

      // One character is never worth a call (edge #6). "Soup"/"Oil"/"Rice" are.
      if (trimmed.length < 2) {
        settle();
        return;
      }

      const slot = acquireSlot();
      slotRef.current = slot;
      const mySeq = ++seqRef.current;

      setStatus('waiting');
      setActiveTarget(target);

      // Every new keystroke replaced the previous timer (edge #7).
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void run(mySeq, side, target, text, slot);
      }, debounceMs);
    },
    [debounceMs, enabled, invalidate, run, settle],
  );

  const reset = React.useCallback((): void => {
    invalidate();
    ownerRef.current = {
      en: valuesRef.current.en.trim() ? 'initial' : 'empty',
      es: valuesRef.current.es.trim() ? 'initial' : 'empty',
    };
    settle();
  }, [invalidate, settle]);

  /* --- keep refs in step with props; declared in the order they must run -- */

  React.useEffect(() => {
    valuesRef.current = { en: englishValue, es: spanishValue };
  });

  React.useEffect(() => {
    settersRef.current = { onEnglishChange, onSpanishChange };
  });

  /**
   * Clearing an emptied source (edge #4).
   *
   * Deliberately an effect rather than part of `markUserEdit`: the parent has
   * committed the source edit by now, so the write is built from fresh props
   * instead of a closure captured mid-event. It also self-limits — once the
   * owner flips to `empty` the condition can no longer hold, so there is no
   * cascade and no loop.
   */
  React.useEffect(() => {
    if (valuesRef.current.en.trim() === '' && ownerRef.current.es === 'generated') {
      write('es', '');
      ownerRef.current.es = 'empty';
    }
    if (valuesRef.current.es.trim() === '' && ownerRef.current.en === 'generated') {
      write('en', '');
      ownerRef.current.en = 'empty';
    }
  });

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      invalidate();
    };
  }, [invalidate]);

  return { markUserEdit, status, activeTarget, reset };
}
