import * as React from 'react';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { fetchMe, ApiException, listLocations } from '@/lib/api';
import { StatTile } from './components/StatTile';
import { NeedsAttentionList, type AttentionEntry } from './components/NeedsAttentionList';
import { RecentActivityList, type ActivityRow } from './components/RecentActivityList';
import { QuickActionsList } from './components/QuickActionsList';

interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Manager home (DESIGN.md §8: "Home answers 'what needs me'").
 *
 * Four blocks reading top to bottom:
 *   1. Greeting + summary line — the manager's name, the current
 *      location's city/country, today's date, and how many items
 *      need them.
 *   2. Library at a glance — four stat tiles, no charts.
 *   3. Attention required — six kinds, each labelled with a count.
 *   4. Recent activity + Quick actions — split two-column on wide.
 *
 * Stage 2 status: library endpoints and activity feed don't exist
 * yet, so all counts are 0 and lists are empty. The page renders
 * the full layout — when endpoints ship, the panels fill in
 * without any page-level change.
 */
export const dynamic = 'force-dynamic';

const NOW_FORMATTER = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' });

function greetingKey(now: Date): 'greetingMorning' | 'greetingAfternoon' | 'greetingEvening' {
  const h = now.getHours();
  if (h < 12) return 'greetingMorning';
  if (h < 18) return 'greetingAfternoon';
  return 'greetingEvening';
}

export default async function AdminDashboardPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  // Identity is checked by the admin layout (master clearance). The page
  // itself just needs the manager's name + current location for the header.
  let managerName: string | null = null;
  let locationSub: string | null = null;
  try {
    const me = await fetchMe(cookieHeader);
    managerName = me.employee.name;
    const { locations } = await listLocations(cookieHeader);
    const meLocationId = me.employee.locationId;
    const active = locations.find((l) => l.id === meLocationId) ?? locations[0];
    if (active) {
      // `locationSub` expects {city}, {country}. The current Location
      // shape doesn't carry these fields, so we render a single segment
      // using the location's name. When the schema adds city/country,
      // split them here.
      locationSub = active.name;
    }
  } catch (err) {
    if (err instanceof ApiException) return <DashboardError code={err.code} />;
    throw err;
  }

  const t = await getTranslations('admin.dashboard');

  const now = new Date();
  const greeting = t(greetingKey(now));
  const todayLabel = NOW_FORMATTER.format(now);

  // Stage 2: every count is 0 and every list is empty until endpoints ship.
  const stats = {
    procedures: 0,
    drafts: 0,
    categories: 0,
    restricted: 0,
  };

  const attention: AttentionEntry[] = [
    { kind: 'pendingApprovals', count: 0, href: `/${locale}/admin/library` },
    { kind: 'overdueEmployees', count: 0, href: `/${locale}/admin/employees` },
    { kind: 'expiringClearances', count: 0, href: `/${locale}/admin/employees` },
    { kind: 'drafts', count: 0, href: `/${locale}/admin/library` },
    { kind: 'reviews', count: 0, href: `/${locale}/admin/library` },
    { kind: 'emptyCategories', count: 0, href: `/${locale}/admin/library/categories` },
  ];

  const totalAttention = attention.reduce((sum, e) => sum + e.count, 0);

  const recent: ActivityRow[] = [];

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      {/* 1. Greeting block. */}
      <header className="space-y-3">
        <p className="text-[length:var(--text-sm)] font-semibold uppercase tracking-wide text-[var(--color-brand-700)]">
          {t('pageEyebrow')}
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-2xl)] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
            {greeting}
            {managerName ? <span className="ml-2">, {managerName}.</span> : null}
          </h1>
          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">{todayLabel}</p>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          {locationSub ? <p>{locationSub}</p> : null}
          <p>{t('greetingAttentionCount', { count: totalAttention })}</p>
        </div>
        <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          {t('greetingSubtitle')}
        </p>
      </header>

      {/* 2. Library at a glance. */}
      <section aria-labelledby="dashboard-stats" className="space-y-3">
        <h2
          id="dashboard-stats"
          className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] font-bold tracking-[-0.02em] text-[var(--color-ink)]"
        >
          {t('statsHeading')}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label={t('statsSops')}
            hint={t('statsSopsHint')}
            value={stats.procedures}
            icon="ri-file-list-3-line"
            tone="neutral"
          />
          <StatTile
            label={t('statsDrafts')}
            hint={t('statsDraftsHint')}
            value={stats.drafts}
            icon="ri-draft-line"
            tone={stats.drafts > 0 ? 'warn' : 'neutral'}
          />
          <StatTile
            label={t('statsCategories')}
            hint={t('statsCategoriesHint')}
            value={stats.categories}
            icon="ri-folders-line"
            tone="neutral"
          />
          <StatTile
            label={t('statsRestricted')}
            hint={t('statsRestrictedHint')}
            value={stats.restricted}
            icon="ri-lock-2-line"
            tone={stats.restricted > 0 ? 'restricted' : 'neutral'}
          />
        </div>
      </section>

      {/* 3. Attention required. */}
      <NeedsAttentionList locale={locale} entries={attention} />

      {/* 4. Recent activity + Quick actions, split two-column on wide. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentActivityList locale={locale} rows={recent} />
        </div>
        <div className="lg:col-span-2">
          <QuickActionsList locale={locale} />
        </div>
      </div>
    </div>
  );
}

function DashboardError({ code }: { code: string }): React.ReactElement {
  return (
    <div className="mx-auto max-w-2xl rounded-[var(--radius-lg)] border border-[var(--color-bad-tint)] bg-[var(--color-bad-tint)] p-6">
      <p className="text-[length:var(--text-sm)] font-semibold text-[var(--color-bad)]">
        {code}
      </p>
    </div>
  );
}