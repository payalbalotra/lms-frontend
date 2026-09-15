import * as React from 'react';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

/**
 * WelcomeHeader — DESIGN.md §2.2 + §5 employee density.
 *
 * Name in DM Sans at --text-xl (28px) — the page-title tier on phone.
 * Subtitle in --text-md ink-2 — never in a status colour.
 * No "completion %" anywhere on home (DESIGN.md §8 forbidden list).
 */
interface WelcomeHeaderProps {
  name: string;
  stationName: string | null;
  roleName: string;
  className?: string;
}

export async function WelcomeHeader({
  name,
  stationName,
  roleName,
  className,
}: WelcomeHeaderProps): Promise<React.ReactElement> {
  const t = await getTranslations('employee.dashboard');
  const subtitle = stationName
    ? t('subtitleWithStation', { station: stationName, role: roleName })
    : t('subtitleNoStation', { role: roleName });

  return (
    <header className={cn('space-y-1', className)}>
      <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-xl)] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
        {t('welcome', { name })}
      </h1>
      <p className="text-[length:var(--text-md)] text-[var(--color-ink-2)]">{subtitle}</p>
    </header>
  );
}