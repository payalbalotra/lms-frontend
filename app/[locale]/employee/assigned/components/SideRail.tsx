import * as React from 'react';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

interface SideRailProps {
  className?: string;
}

export async function SideRail({
  className,
}: SideRailProps): Promise<React.ReactElement> {
  const t = await getTranslations('employee.dashboard');

  return (
    <div className={cn('space-y-4 lg:sticky lg:top-6', className)}>
      <div className="space-y-3">
        <h2 className="text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-ink-3)]">
          {t('sideRailHeading')}
        </h2>

        <article
          className={cn(
            'rounded-[var(--radius-lg)] border border-[var(--color-brand-tint-2)]',
            'bg-[var(--color-surface)] p-5',
          )}
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]"
            >
              <i className="ri-book-mark-line text-[length:var(--text-md)]" />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-brand-700)]">
                {t('cardOfTheDay')}
              </p>
              <p className="text-[length:var(--text-md)] font-semibold text-[var(--color-ink)]">
                {t('cardOfTheDayEmpty')}
              </p>
              <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
                {t('cardOfTheDayHint')}
              </p>
            </div>
          </div>
        </article>
      </div>

      <article
        className={cn(
          'rounded-[var(--radius-lg)] border border-[var(--color-ok-tint-2)]',
          'bg-[var(--color-ok-tint)] p-5',
        )}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface)] text-[var(--color-ok)]"
          >
            <i className="ri-shield-check-line text-[length:var(--text-md)]" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[length:var(--text-sm)] font-semibold uppercase tracking-wide text-[var(--color-ok)]">
              {t('safetyHeading')}
            </p>
            <p className="text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink)]">
              {t('safetyBody')}
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}