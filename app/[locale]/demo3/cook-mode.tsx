'use client';

import * as React from 'react';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCheckboxCircleLine,
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningFill,
  RiFocus3Line,
  RiListCheck2,
  RiPriceTag3Line,
  RiTimerLine,
} from 'react-icons/ri';
import { FACTORS, IMG, INGREDIENTS, PHASES, STEPS, phaseOf, scale, type Qty } from './recipe-data';
import { BigMedia, CritLimit, Warn } from './parts';
import { TimerChip, fmtLeft, fmtLength, useNow, type Timer } from './timers';

/**
 * Cook mode: the method one step at a time, full screen, for the cook with a
 * knife in one hand. The overview is for reading the recipe; this is for making
 * it. Its photo is full width, its text is large, and the two buttons that
 * matter sit under the thumb.
 *
 *   - "Done, next" ticks the step (the same tick as the overview) and moves on,
 *     with a short buzz. A swipe or an arrow key only moves: looking ahead is
 *     not doing.
 *   - Under each step, the one after it, so the cook is ready for it: lime
 *     juice goes in straight after the mash, not after a hunt for it.
 *   - A step with a clock starts a timer that keeps running while the cook moves
 *     on. The soonest one is always in the header, and buzzes when it runs out.
 *   - "All steps" lists the method in its parts, ticks and all, to jump to any
 *     step without swiping through the ones between.
 *   - The screen stays on while this is open (Screen Wake Lock), so the phone
 *     does not lock with gloves on.
 *   - The critical step's button says what was checked, not just "Done".
 *   - The label step works out the discard time, so nobody adds 48 hours in
 *     their head.
 *   - Closing it returns to the overview at the step you were on.
 *
 * A native <dialog>, shown modal: it keeps focus inside and closes on Escape.
 * The app's Modal is a card in the middle of the screen, and this needs all of
 * it. Screen 0 is the batch and the weigh-out; 1 to 23 are the steps; the last
 * is the summary. On a wide screen held sideways -- a tablet on its stand --
 * the photo and the words sit side by side.
 */

const N = STEPS.length;
const LAST = N + 1;

const buzz = (pattern: number | number[]): void => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* no vibration on this device */
  }
};

export function CookMode({
  open,
  start,
  factor,
  onFactor,
  done,
  onDone,
  timers,
  onTimer,
  onClearTimer,
  onClose,
}: {
  open: boolean;
  start: number;
  factor: number;
  onFactor: (f: number) => void;
  done: boolean[];
  onDone: (n: number, value: boolean) => void;
  timers: Timer[];
  onTimer: (n: number) => void;
  onClearTimer: (n: number) => void;
  onClose: (at: number) => void;
}): React.ReactElement {
  const ref = React.useRef<HTMLDialogElement>(null);
  const mainRef = React.useRef<HTMLDivElement>(null);
  const [i, setI] = React.useState(start);
  const [dir, setDir] = React.useState<'next' | 'back' | null>(null);
  const [list, setList] = React.useState(false);
  const [canWake, setCanWake] = React.useState(false);
  const swipe = React.useRef<{ x: number; y: number } | null>(null);
  const radios = React.useRef<(HTMLButtonElement | null)[]>([]);
  const now = useNow(open && timers.length > 0);

  const q: Qty = (k) => <b className="qty">{scale(INGREDIENTS.find((x) => x.key === k)!.base, factor)}</b>;

  /* --- open and close ----------------------------------------------------- */
  // Each opening is a fresh mount (the page keys it), so `start` is simply
  // where the state begins.
  React.useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // The page underneath does not scroll while cooking.
  React.useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev;
    };
  }, [open]);

  // The screen stays on. Asked for again when the cook comes back to the tab:
  // the browser lets it go whenever the page is hidden.
  React.useEffect(() => {
    if (!open || !('wakeLock' in navigator)) return;
    setCanWake(true);
    let lock: WakeLockSentinel | null = null;
    let alive = true;
    const hold = async (): Promise<void> => {
      if (document.visibilityState !== 'visible') return;
      try {
        const got = await navigator.wakeLock.request('screen');
        if (alive) lock = got;
        else void got.release();
      } catch {
        /* low battery, or not allowed: the phone just behaves as usual */
      }
    };
    void hold();
    const onVisible = (): void => void hold();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [open]);

  /* --- moving ------------------------------------------------------------- */
  function go(to: number): void {
    const next = Math.max(0, Math.min(LAST, to));
    setDir(next > i ? 'next' : next < i ? 'back' : null);
    setI(next);
    setList(false);
  }

  function tick(n: number, value: boolean): void {
    onDone(n, value);
    if (value) buzz(12);
  }

  // Each screen starts at its top, and the next photo is fetched before it is needed.
  React.useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
    const m = STEPS[i]?.media; // STEPS[i] is step i + 1: the one after this
    if (!m) return;
    const srcs = m.kind === 'compare' ? [m.ok.src, m.no.src] : [m.src];
    srcs.forEach((s) => {
      const img = new Image();
      img.src = `${IMG}/${s}`;
    });
  }, [i]);

  // The list opens at the step you are on.
  React.useEffect(() => {
    if (!list) return;
    mainRef.current?.querySelector('[aria-current="step"]')?.scrollIntoView({ block: 'center' });
  }, [list]);

  function close(): void {
    onClose(i >= 1 && i <= N ? i : i === LAST ? N : 0);
  }

  function onKey(e: React.KeyboardEvent): void {
    if (e.defaultPrevented || list) return;
    if (e.key === 'ArrowRight') go(i + 1);
    else if (e.key === 'ArrowLeft') go(i - 1);
    else return;
    e.preventDefault();
  }

  // A sideways swipe moves; anything more up than across is the cook scrolling.
  function onPointerDown(e: React.PointerEvent): void {
    if (e.pointerType === 'mouse' || list) return;
    swipe.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e: React.PointerEvent): void {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    go(dx < 0 ? i + 1 : i - 1);
  }

  function onScalerKey(e: React.KeyboardEvent): void {
    const d = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key];
    if (!d) return;
    e.preventDefault();
    const at = FACTORS.indexOf(factor as (typeof FACTORS)[number]);
    const next = (at + d + FACTORS.length) % FACTORS.length;
    onFactor(FACTORS[next]);
    radios.current[next]?.focus();
  }

  const doneCount = done.filter(Boolean).length;
  const step = i >= 1 && i <= N ? STEPS[i - 1]! : null;
  const firstOpen = done.findIndex((d) => !d) + 1;

  /* --- what is on the screen ---------------------------------------------- */
  let screen: React.ReactNode = null;
  let foot: React.ReactNode = null;

  if (list) {
    screen = (
      <nav className="cook-list" aria-label="All steps">
        {PHASES.map((ph) => (
          <section key={ph.id}>
            <h3 className="cook-phase">{ph.name}</h3>
            <ol start={ph.from}>
              {STEPS.filter((s) => s.n >= ph.from && s.n <= ph.to).map((s) => (
                <li key={s.n}>
                  <button type="button" aria-current={s.n === i ? 'step' : undefined} onClick={() => go(s.n)}>
                    <span className={['step-num', done[s.n - 1] ? 'is-on' : '', s.crit ? 'is-crit' : ''].filter(Boolean).join(' ')}>
                      {done[s.n - 1] ? null : s.n}
                    </span>
                    <span className="cook-list-text">{s.text(q)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </nav>
    );
    foot = (
      <button type="button" className="btn btn-secondary btn-lg cook-go" onClick={() => setList(false)}>
        Back to {step ? `step ${step.n}` : i === 0 ? 'the start' : 'the summary'}
      </button>
    );
  } else if (i === 0) {
    screen = (
      <div className="cook-pad cook-intro">
        <h2 className="cook-title" lang="es">
          Guacamole Fresco
        </h2>
        <p className="cook-sub">
          {N} steps, about 35 minutes. One step at a time: tap <b>Done, next</b> as you finish each one, or swipe to look
          ahead.
        </p>

        <div className="scaler">
          <span className="lbl" id="cook-batch-lbl">
            Batch
          </span>
          <div className="choices" role="radiogroup" aria-labelledby="cook-batch-lbl" onKeyDown={onScalerKey}>
            {FACTORS.map((f, k) => (
              <button
                key={f}
                ref={(el) => {
                  radios.current[k] = el;
                }}
                type="button"
                role="radio"
                aria-checked={factor === f}
                tabIndex={factor === f ? 0 : -1}
                onClick={() => onFactor(f)}
              >
                {f}&times;
              </button>
            ))}
          </div>
        </div>

        <h3 className="cook-h3">Weigh out</h3>
        <ul className="cook-weigh">
          {INGREDIENTS.map((ing) => (
            <li key={ing.key}>
              <span>
                {ing.name}
                {ing.allergen ? (
                  <span className="flag">
                    <RiErrorWarningFill className="i i-sm" aria-hidden="true" />
                    Allergen
                  </span>
                ) : null}
              </span>
              <b className="qty">{scale(ing.base, factor)}</b>
            </li>
          ))}
        </ul>
        {canWake ? <p className="cook-hint">Your screen stays on while this is open.</p> : null}
      </div>
    );
    foot = (
      <button type="button" className="btn btn-primary btn-lg cook-go" onClick={() => go(doneCount > 0 && firstOpen > 0 ? firstOpen : 1)}>
        {doneCount > 0 && firstOpen > 0 ? `Continue at step ${firstOpen}` : 'Start at step 1'}
        <RiArrowRightSLine className="i" aria-hidden="true" />
      </button>
    );
  } else if (step) {
    const isDone = done[step.n - 1];
    const upNext = STEPS[step.n]; // the step after this one
    const discard = step.discardAt
      ? new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(
          new Date(Date.now() + 48 * 3600 * 1000),
        )
      : null;
    const running = step.timer ? timers.find((t) => t.step === step.n) : undefined;
    screen = (
      <div className={step.media ? 'cook-step has-media' : 'cook-step'}>
        {step.media ? <BigMedia media={step.media} /> : null}
        <div className="cook-pad">
          <div className="cook-stepline">
            <button
              type="button"
              className={['step-num', 'step-check', isDone ? 'is-on' : ''].filter(Boolean).join(' ')}
              aria-pressed={isDone}
              aria-label={`Step ${step.n}: ${isDone ? 'done, tap to undo' : 'mark done'}`}
              onClick={() => tick(step.n, !isDone)}
            >
              {isDone ? null : step.n}
            </button>
            {step.crit ? (
              <span className="step-flag">
                <RiFocus3Line className="i i-sm" aria-hidden="true" />
                Critical step
              </span>
            ) : (
              <span className="cook-phase">{phaseOf(step.n).name}</span>
            )}
          </div>
          <p className="cook-line">{step.text(q)}</p>
          {step.note ? <p className="cook-note">{step.note}</p> : null}

          {step.timer ? (
            running ? (
              <div className="cook-timer" data-over={running.endsAt <= now || undefined}>
                <RiTimerLine className="i" aria-hidden="true" />
                <b>{running.endsAt <= now ? 'Time is up' : fmtLeft(running.endsAt - now)}</b>
                <button type="button" className="btn btn-ghost" onClick={() => onClearTimer(step.n)}>
                  {running.endsAt <= now ? 'Clear' : 'Stop'}
                </button>
              </div>
            ) : (
              <button type="button" className="btn btn-secondary btn-lg cook-timer-start" onClick={() => onTimer(step.n)}>
                <RiTimerLine className="i" aria-hidden="true" />
                Start the {fmtLength(step.timer.seconds)} timer
              </button>
            )
          ) : null}

          {discard ? (
            <p className="cook-discard">
              <RiPriceTag3Line className="i" aria-hidden="true" />
              <span>
                Labelled now, discard at <b>{discard}</b>
              </span>
            </p>
          ) : null}
          {step.warn ? <Warn kind={step.warn.kind}>{step.warn.body}</Warn> : null}
          {step.crit ? <CritLimit /> : null}

          {/* What comes after this, so the cook is ready for it. */}
          {upNext ? (
            <div className="cook-next">
              <span className="cook-next-lbl">Coming up · step {upNext.n}</span>
              <p>{upNext.text(q)}</p>
            </div>
          ) : null}
        </div>
      </div>
    );
    const label = isDone ? 'Next' : step.crit ? 'Done: 4 °C or below' : step.n === N ? 'Done, finish' : 'Done, next';
    foot = (
      <>
        <button type="button" className="btn btn-secondary btn-lg btn-icon cook-back" aria-label="Previous step" onClick={() => go(i - 1)}>
          <RiArrowLeftSLine className="i" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={step.crit && !isDone ? 'btn btn-primary btn-lg cook-go is-crit' : 'btn btn-primary btn-lg cook-go'}
          onClick={() => {
            if (!isDone) tick(step.n, true);
            go(i + 1);
          }}
        >
          {isDone ? null : <RiCheckLine className="i" aria-hidden="true" />}
          {label}
          {isDone ? <RiArrowRightSLine className="i" aria-hidden="true" /> : null}
        </button>
      </>
    );
  } else if (i === LAST) {
    const left = STEPS.filter((s) => !done[s.n - 1]);
    screen = (
      <div className="cook-pad cook-end">
        <RiCheckboxCircleLine className="cook-end-mark" aria-hidden="true" />
        <h2 className="cook-title">{left.length ? `${N - left.length} of ${N} steps done` : 'All done'}</h2>
        {left.length ? (
          <>
            <p className="cook-sub">Not ticked yet. Tap one to go back to it:</p>
            <div className="cook-left">
              {left.map((s) => (
                <button key={s.n} type="button" className="btn btn-secondary" onClick={() => go(s.n)}>
                  Step {s.n}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="cook-sub">The pan is labelled and in the walk-in. Probe it before service.</p>
        )}
      </div>
    );
    foot = (
      <button type="button" className="btn btn-primary btn-lg cook-go" onClick={close}>
        Back to the recipe
      </button>
    );
  }

  const where = list ? 'All steps' : step ? `Step ${step.n} of ${N}` : i === 0 ? 'Before you start' : 'Finished';

  return (
    <dialog
      ref={ref}
      className="cook"
      aria-label="Cook mode: Guacamole Fresco"
      onCancel={(e) => {
        e.preventDefault();
        if (list) setList(false);
        else close();
      }}
      onKeyDown={onKey}
    >
      {open ? (
        <>
          <header className="cook-top">
            <button type="button" className="btn btn-ghost btn-icon btn-lg" aria-label="Close cook mode" onClick={close}>
              <RiCloseLine className="i" aria-hidden="true" />
            </button>
            <div className="cook-where">
              <p aria-live="polite">
                <b>{where}</b>
                {/* A running timer takes the second line: the bar already says how far. */}
                {timers.length ? null : (
                  <span>
                    {doneCount} of {N} done
                  </span>
                )}
              </p>
              <TimerChip timers={timers} now={now} onOpen={(n) => go(n)} onClear={onClearTimer} />
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-lg"
              aria-label={list ? 'Close the list of steps' : 'All steps'}
              aria-pressed={list}
              onClick={() => setList((v) => !v)}
            >
              <RiListCheck2 className="i" aria-hidden="true" />
            </button>
            <span className="cook-bar" aria-hidden="true">
              <i style={{ width: `${(Math.min(i, N) / N) * 100}%` }} />
            </span>
          </header>
          <div ref={mainRef} className="cook-main" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (swipe.current = null)}>
            <div key={list ? 'list' : i} className="cook-screen" data-dir={list ? undefined : (dir ?? undefined)}>
              {screen}
            </div>
          </div>
          <footer className="cook-foot">{foot}</footer>
        </>
      ) : null}
    </dialog>
  );
}
