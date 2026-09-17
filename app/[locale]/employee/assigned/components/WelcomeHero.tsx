import * as React from 'react';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

/**
 * WelcomeHero — DESIGN.md §2.2 + §5 employee density, with the brand
 * accent turned up so the page reads as designed rather than empty.
 *
 * Layered as: brand-tint ground → terracotta accent rail on the left →
 * display heading → secondary line with station/role → small status row.
 * The badge on the right is the "currently on duty" pulse — a kitchen
 * context cue, not a status indicator.
 */
interface WelcomeHeroProps {
  name: string;
  stationName: string | null;
  roleName: string;
  className?: string;
}

export async function WelcomeHero({
  name,
  stationName,
  roleName,
  className,
}: WelcomeHeroProps): Promise<React.ReactElement> {
  const t = await getTranslations('employee.dashboard');
  const subtitle = stationName
    ? t('subtitleWithStation', { station: stationName, role: roleName })
    : t('subtitleNoStation', { role: roleName });

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-lg)]',
        'border border-[var(--color-brand-tint-2)] bg-[var(--color-brand-tint)]',
        className,
      )}
    >
      {/* Terracotta accent rail — the only place terracotta appears at this size. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1.5 bg-[var(--color-brand-600)]"
      />

      <div className="relative flex flex-col gap-5 p-5 pl-6 sm:p-7 sm:pl-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-[length:var(--text-sm)] font-semibold uppercase tracking-wide text-[var(--color-brand-700)]">
              {t('heroEyebrow')}
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-2xl)] font-bold leading-tight tracking-[-0.02em] text-[var(--color-ink)] sm:text-[length:var(--text-3xl)]">
              {t('welcome', { name })}
            </h1>
            <p className="text-[length:var(--text-md)] text-[var(--color-ink-2)]">
              {subtitle}
            </p>
          </div>

          <div className="hidden shrink-0 sm:flex sm:flex-col sm:items-end sm:gap-1">
            <span
              aria-hidden="true"
              className="inline-flex size-14 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-surface)] text-[var(--color-brand-700)] shadow-[var(--e-1)]"
            >
              <i className="ri-restaurant-2-line text-[length:var(--text-2xl)]" />
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-pill)]',
              'bg-[var(--color-ok-tint)] px-3 text-[length:var(--text-sm)] font-semibold text-[var(--color-ok)]',
            )}
          >
            <span
              aria-hidden="true"
              className="relative inline-flex size-2"
            >
              <span className="absolute inline-flex size-full animate-[ping_var(--dur)_var(--ease)_infinite] rounded-full bg-[var(--color-ok)] opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-[var(--color-ok)]" />
            </span>
            {t('onDuty')}
          </span>
          {stationName ? (
            <span
              className={cn(
                'inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-pill)]',
                'border border-[var(--color-brand-tint-2)] bg-[var(--color-surface)] px-3',
                'text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]',
              )}
            >
              <i aria-hidden="true" className="ri-map-pin-2-line" />
              {stationName}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}