import * as React from 'react';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

/**
 * LibrarySearchHero — DESIGN.md §3.2 search-hero pattern, employee density.
 *
 * Real submit behaviour via a GET form → /[locale]/procedures?q=...
 * (the procedures list reads ?q= once the library ships). No client JS.
 *
 * - 64px min-height, 2px ink border.
 * - focus-within halo: brand-600 border + brand-tint-2 ring.
 * - Submit button is part of the search affordance (DESIGN.md §3.1: one
 *   primary on the screen — this is *not* the primary CTA; it's the
 *   search input's own submit, which is a tone-shifted ghost).
 */
interface LibrarySearchHeroProps {
  locale: string;
  className?: string;
}

export async function LibrarySearchHero({
  locale,
  className,
}: LibrarySearchHeroProps): Promise<React.ReactElement> {
  const t = await getTranslations('employee.dashboard');

  return (
    <form
      role="search"
      action={`/${locale}/procedures`}
      method="get"
      className={cn('space-y-2', className)}
    >
      <label
        htmlFor="library-search"
        className="sr-only"
      >
        {t('searchAriaLabel')}
      </label>
      <div
        className={cn(
          'group flex min-h-16 items-center gap-3 rounded-[var(--radius-md)]',
          'border-2 border-[var(--color-ink)] bg-[var(--color-surface)] px-4',
          'transition-colors duration-[180ms] ease-[var(--ease)]',
          'focus-within:border-[var(--color-brand-600)] focus-within:shadow-[0_0_0_4px_var(--color-brand-tint-2)]',
        )}
      >
        <i
          aria-hidden="true"
          className="ri-search-line text-[length:var(--text-lg)] text-[var(--color-ink-2)]"
        />
        <input
          id="library-search"
          name="q"
          type="search"
          autoComplete="off"
          placeholder={t('searchPlaceholder')}
          className={cn(
            'h-12 min-w-0 flex-1 border-0 bg-transparent text-[length:var(--text-md)] font-medium',
            'text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)]',
            'focus:outline-none',
          )}
        />
        <button
          type="submit"
          aria-label={t('searchAriaLabel')}
          className={cn(
            'inline-flex h-12 min-w-12 items-center justify-center rounded-[var(--radius-pill)]',
            'bg-[var(--color-brand-600)] px-4 text-[length:var(--text-sm)] font-semibold text-white',
            'transition-colors duration-[180ms] ease-[var(--ease)]',
            'hover:bg-[var(--color-brand-700)] active:translate-y-px',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint-2)] focus-visible:ring-offset-2',
          )}
        >
          <i aria-hidden="true" className="ri-arrow-right-line text-[length:var(--text-lg)]" />
        </button>
      </div>
      <p className="px-1 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
        {t('searchHint')}
      </p>
    </form>
  );
}