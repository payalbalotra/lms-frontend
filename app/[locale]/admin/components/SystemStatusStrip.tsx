import * as React from 'react';
import { cn } from '@/lib/utils';

interface SystemStatusStripProps {
  locale: string;
  statusText?: string;
  className?: string;
}

export function SystemStatusStrip({
  locale,
  statusText,
  className,
}: SystemStatusStripProps): React.ReactElement {
  const isEs = locale === 'es';
  const text =
    statusText ||
    (isEs
      ? 'El sistema está funcionando correctamente. Sin problemas.'
      : 'System is running smoothly. No issues found.');

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[length:var(--text-xs)] font-semibold text-emerald-700 dark:text-emerald-300 shadow-2xs',
        className,
      )}
    >
      <span className="flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] shrink-0">
        <i aria-hidden="true" className="ri-check-line" />
      </span>
      <span>{text}</span>
    </div>
  );
}
