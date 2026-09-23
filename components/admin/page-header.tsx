import * as React from 'react';
import Link from 'next/link';

/**
 * The top of an admin page: where you are, what this page is, and what you can
 * do from it.
 *
 * It exists because the five admin pages had three different headers — one with
 * an eyebrow and no subtitle, two with both, two with neither — so moving
 * between them read as moving between products. The title is the same size on
 * every page because every page is the same rank; the eyebrow says which part of
 * the app you are in, and the subtitle is the one line that says what the page is
 * for. Both are optional, but a page that skips them should skip them because it
 * has nothing to say, not because nobody wrote it.
 *
 * Actions sit on the title's row and wrap under it when the row runs out.
 *
 * The header keeps 8px of its own under it, on top of the 24px the page grid
 * gives, so the first card starts a step further down than two cards sit apart.
 */
export function PageHeader({
  eyebrow,
  eyebrowHref,
  title,
  subtitle,
  actions,
}: {
  /** Where this page sits — "Library", "People". */
  eyebrow?: string;
  /** On a detail page the eyebrow is the list it came from, so it is the way
      back: one link where a breadcrumb, a back arrow and a title used to say
      the same place three times. */
  eyebrowHref?: string;
  title: string;
  /** One line: what the page is for. */
  subtitle?: string;
  actions?: React.ReactNode;
}): React.ReactElement {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 pb-2">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-sm font-semibold text-[var(--color-ink-2)]">
            {eyebrowHref ? (
              <Link href={eyebrowHref} className="underline-offset-4 hover:text-[var(--color-ink)] hover:underline">
                {eyebrow}
              </Link>
            ) : (
              eyebrow
            )}
          </p>
        ) : null}
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-display tracking-tight text-[var(--color-ink)]">
          {title}
        </h1>
        {/* 12px under a 40px display line, and the sentence at 16px: at 4px and
            14px it read as a caption stuck to the title instead of the line that
            says what the page is for. */}
        {subtitle ? <p className="mt-3 max-w-prose text-base leading-body text-[var(--color-ink-2)]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
