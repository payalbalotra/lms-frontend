'use client';

import * as React from 'react';
import { LuMic, LuSearch } from 'react-icons/lu';
import { cn } from '@/lib/utils';

/**
 * The reason the screen exists: one question, mid-shift, often with wet or
 * gloved hands (PROJECT_OVERVIEW §02 Ask the Handbook: "by typing or by
 * speaking"). A plain form, so typing works before JavaScript has loaded; the
 * phone keyboard's Search key sends it.
 *
 * The microphone uses the browser's own speech recognition, in the reader's
 * language, and sends what it heard. Where the browser has none it is not
 * shown. Until the answer engine exists the question goes to the library
 * search, which reads it word by word through titles, purposes and every step
 * (lib/procedure-search), and says so -- and sends the cook to their manager --
 * when nothing answers it.
 */

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function speechCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null;
}

export function AskBox({
  locale,
  heading,
  label,
  placeholder,
  hint,
  micLabel,
  listeningLabel,
}: {
  locale: string;
  heading: string;
  label: string;
  placeholder: string;
  hint: string;
  micLabel: string;
  listeningLabel: string;
}): React.ReactElement {
  const formRef = React.useRef<HTMLFormElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [canListen, setCanListen] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const recRef = React.useRef<SpeechRecognitionLike | null>(null);

  // After mount: the server cannot know whether this browser can listen.
  React.useEffect(() => setCanListen(Boolean(speechCtor())), []);

  function listen(): void {
    const Ctor = speechCtor();
    if (!Ctor) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = locale === 'es' ? 'es-MX' : 'en-US';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const said = e.results[0]?.[0]?.transcript ?? '';
      if (inputRef.current && said) {
        inputRef.current.value = said;
        formRef.current?.requestSubmit();
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <section aria-labelledby="ask-h">
      <h1
        id="ask-h"
        className="font-[family-name:var(--font-display)] text-xl font-bold leading-display tracking-tight text-[var(--color-ink)]"
      >
        {heading}
      </h1>
      <form ref={formRef} action={`/${locale}/procedures`} role="search" className="mt-4">
        <label htmlFor="q" className="sr-only">
          {label}
        </label>
        <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line-3)] bg-[var(--color-surface)] py-1 pl-4 pr-1 transition-colors duration-[var(--dur)] ease-[var(--ease)] focus-within:border-[var(--color-ring)]">
          <LuSearch aria-hidden="true" className="shrink-0 text-lg text-[var(--color-ink-2)]" />
          <input
            ref={inputRef}
            id="q"
            name="q"
            type="search"
            enterKeyHint="search"
            placeholder={listening ? listeningLabel : placeholder}
            className="h-tap min-w-0 flex-1 border-0 bg-transparent text-base text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
          />
          {canListen ? (
            <button
              type="button"
              onClick={listen}
              aria-label={micLabel}
              aria-pressed={listening}
              className={cn(
                'inline-flex size-12 shrink-0 items-center justify-center rounded-full transition-colors duration-[var(--dur)] ease-[var(--ease)]',
                listening
                  ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] ring-2 ring-[var(--color-ring)]'
                  : 'bg-[var(--color-panel)] text-[var(--color-ink)] hover:bg-[var(--color-wash)]',
              )}
            >
              <LuMic aria-hidden="true" className="text-lg" />
            </button>
          ) : null}
        </div>
      </form>
      <p className="mt-3 text-base text-[var(--color-ink-2)]">{hint}</p>
    </section>
  );
}
