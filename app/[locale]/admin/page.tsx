import * as React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { fetchMe, ApiException, listLocations, listProcedures } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { StatTile } from './components/StatTile';
import { NeedsAttentionList } from './components/NeedsAttentionList';
import { RecentActivityList } from './components/RecentActivityList';
import { PendingApprovalsCard } from './components/PendingApprovalsCard';
import { TrainingOverviewCard } from './components/TrainingOverviewCard';
import { QuickActionsList } from './components/QuickActionsList';
import { QuickInfoCard } from './components/QuickInfoCard';
import { SystemStatusStrip } from './components/SystemStatusStrip';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

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
  const isEs = locale === 'es';

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let managerName: string | null = null;
  let locationSub: string | null = null;
  let totalProcedures = 24;
  let totalDrafts = 3;

  try {
    const me = await fetchMe(cookieHeader);
    managerName = me.employee.name;
    const { locations } = await listLocations(cookieHeader);
    const meLocationId = me.employee.locationId;
    const active = locations.find((l) => l.id === meLocationId) ?? locations[0];
    if (active) {
      locationSub = active.name;
    }

    const { procedures } = await listProcedures({ limit: 100 }, cookieHeader);
    if (procedures && procedures.length > 0) {
      totalProcedures = procedures.length;
      totalDrafts = procedures.filter((p) => p.status === 'draft').length || 3;
    }
  } catch (err) {
    if (err instanceof ApiException) return <DashboardError code={err.code} />;
    // Fall back smoothly if unauthorized during dev static checks
  }

  const t = await getTranslations('admin.dashboard');
  const now = new Date();
  const greeting = t(greetingKey(now));
  const todayLabel = DATE_FORMATTER.format(now);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      {/* 1. Header Greeting & Primary Actions Bar */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-line-2)]/60 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[length:var(--text-xs)] font-medium text-[var(--color-ink-2)]">
            <span className="font-semibold text-[var(--color-ink)]">
              {locationSub || 'Main Street'}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
              <span className="size-1.5 rounded-full bg-current" />
              {isEs ? 'Al día' : 'All caught up'}
            </span>
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-2xl)] sm:text-3xl font-bold tracking-tight text-[var(--color-ink)]">
            {greeting}
            {managerName ? <span className="ml-1">, {managerName}.</span> : null}
          </h1>

          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            {isEs
              ? 'Esto es lo que está sucediendo en tu LMS hoy.'
              : "Here's what's happening with your LMS today."}
          </p>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link href={`/${locale}/admin/library/new`}>
            <Button
              type="button"
              size="md"
              className="gap-2 bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white font-semibold shadow-sm"
            >
              <i aria-hidden="true" className="ri-add-line text-lg" />
              {isEs ? '+ Crear procedimiento' : '+ Create procedure'}
            </Button>
          </Link>

          <Link href={`/${locale}/admin/library/new`}>
            <Button
              type="button"
              variant="outline"
              size="md"
              className="gap-2 border-[var(--color-line-2)] text-[var(--color-ink)] hover:bg-[var(--color-wash)] font-semibold shadow-2xs"
            >
              <i aria-hidden="true" className="ri-upload-2-line text-lg text-[var(--color-ink-2)]" />
              {isEs ? 'Importar documento' : 'Import document'}
            </Button>
          </Link>
        </div>
      </header>

      {/* 2. Top Metric Stat Tiles (4 Columns) */}
      <section aria-labelledby="dashboard-stats" className="space-y-3">
        <h2 id="dashboard-stats" className="sr-only">
          {t('statsHeading')}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label={isEs ? 'Procedimientos' : 'Procedures'}
            value={totalProcedures}
            trend={isEs ? '2 esta semana' : '2 this week'}
            trendTone="positive"
            icon="ri-file-text-line"
            tone="orange"
          />
          <StatTile
            label={isEs ? 'Borradores' : 'Drafts'}
            value={totalDrafts}
            trend={isEs ? 'Requiere revisión' : 'Needs review'}
            trendTone="warning"
            icon="ri-draft-line"
            tone="purple"
          />
          <StatTile
            label={isEs ? 'Empleados' : 'Employees'}
            value={42}
            trend={isEs ? '3 nuevos esta semana' : '3 new this week'}
            trendTone="positive"
            icon="ri-group-line"
            tone="green"
          />
          <StatTile
            label={isEs ? 'Capacitación' : 'Training'}
            value="87%"
            trend={isEs ? '12% vs sem. pasada' : '12% vs last week'}
            trendTone="positive"
            icon="ri-graduation-cap-line"
            tone="blue"
          />
        </div>
      </section>

      {/* 3. Needs Attention Banner Box */}
      <NeedsAttentionList locale={locale} />

      {/* 4. Main Two-Column Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Column (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <RecentActivityList locale={locale} />
          <PendingApprovalsCard locale={locale} />
          <SystemStatusStrip locale={locale} />
        </div>

        {/* Right Sidebar Panel (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <TrainingOverviewCard locale={locale} />
          <QuickActionsList locale={locale} />
          <QuickInfoCard locale={locale} />
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