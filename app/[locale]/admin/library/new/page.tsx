import * as React from 'react';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cn } from '@/lib/utils';

/**
 * Admin Library → New procedure.
 *
 * Stage 2 status: the create-procedure endpoint doesn't exist yet. The form
 * shape is real (it would post to the endpoint), but the submit handler is
 * not wired — that lands with the SOP Library. We render the layout with
 * the breadcrumb + back link so the page never 404s while the feature
 * is mid-build.
 */

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

export default async function AdminLibraryNewPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.library.new');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CrumbBar locale={locale} label={t('crumbBack')} />

      <header className="space-y-1">
        <p className="text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-brand-700)]">
          {t('pageEyebrow')}
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-2xl)] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
          {t('pageTitle')}
        </h1>
        <p className="max-w-2xl text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          {t('pageSubtitle')}
        </p>
      </header>

      <ComingSoonNote heading={t('comingSoonHeading')} body={t('comingSoonBody')} />
    </div>
  );
}

function CrumbBar({ locale, label }: { locale: string; label: string }): React.ReactElement {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2 text-[length:var(--text-sm)] text-[var(--color-ink-2)]"
    >
      <Link
        href={`/${locale}/admin/library`}
        className="inline-flex items-center gap-1 font-medium hover:text-[var(--color-brand-700)]"
      >
        <i aria-hidden="true" className="ri-arrow-left-line" />
        {label}
      </Link>
    </nav>
  );
}

function ComingSoonNote({
  heading,
  body,
}: {
  heading: string;
  body: string;
}): React.ReactElement {
  return (
    <article
      className={cn(
        'flex items-start gap-4 rounded-[var(--radius-lg)]',
        'border border-[var(--color-brand-tint-2)] bg-[var(--color-brand-tint)] px-6 py-5',
      )}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-surface)] text-[var(--color-brand-700)]"
      >
        <i className="ri-tools-line text-[length:var(--text-md)]" />
      </span>
      <div className="space-y-1">
        <h2 className="font-[family-name:var(--font-display)] text-[length:var(--text-md)] font-bold tracking-[-0.02em] text-[var(--color-brand-700)]">
          {heading}
        </h2>
        <p className="text-[length:var(--text-sm)] text-[var(--color-ink)]">
          {body}
        </p>
      </div>
    </article>
  );
}