'use client';

import * as React from 'react';
import { RiCloseLine, RiTimerLine } from 'react-icons/ri';

/**
 * Timers that keep running while the cook moves on: the hand wash counts its 20
 * seconds, the walk-in its 30 minutes, whatever step is on the screen. They
 * are kept as the moment they end, so a reload or a closed cook mode loses
 * nothing, and the phone buzzes when one runs out.
 */

export type Timer = { step: number; label: string; endsAt: number };

/** The time now, once a second while there is anything to count. */
export function useNow(active: boolean): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

export function fmtLeft(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function fmtLength(seconds: number): string {
  return seconds < 60 ? `${seconds} s` : `${Math.round(seconds / 60)} min`;
}

/**
 * The soonest timer, wherever the cook is. Running, it counts down and takes
 * the cook to its step; run out, it turns red and says so, and a tap clears it.
 */
export function TimerChip({
  timers,
  now,
  onOpen,
  onClear,
}: {
  timers: Timer[];
  now: number;
  onOpen?: (step: number) => void;
  onClear: (step: number) => void;
}): React.ReactElement | null {
  if (!timers.length) return null;
  const t = [...timers].sort((a, b) => a.endsAt - b.endsAt)[0]!;
  const over = t.endsAt <= now;
  const more = timers.length > 1 ? ` +${timers.length - 1}` : '';
  return (
    <button
      type="button"
      className="timer-chip"
      data-over={over || undefined}
      aria-label={over ? `${t.label}: time is up. Tap to clear.` : `${t.label}: ${fmtLeft(t.endsAt - now)} left. Tap to go to step ${t.step}.`}
      onClick={() => (over ? onClear(t.step) : onOpen?.(t.step))}
    >
      {over ? <RiCloseLine className="i i-sm" aria-hidden="true" /> : <RiTimerLine className="i i-sm" aria-hidden="true" />}
      <b>{over ? 'Time is up' : fmtLeft(t.endsAt - now)}</b>
      <span>
        {t.label}
        {more}
      </span>
    </button>
  );
}
