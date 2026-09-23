import * as React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  ApiException,
  fetchMe,
  listProcedures,
  listRoles,
  listStations,
} from '@/lib/api';
import type { Procedure } from '@/lib/types';
import { readViewAs } from '@/lib/view-as-server';
import {
  EmployeeHome,
  greetingForDate,
  type GreetingKey,
  type TrainingCard,
  type TrainingStats,
  type ProcedureRowData,
} from './components/EmployeeHome';
import { withAs } from '@/lib/view-as';
import { TabBar } from '@/components/employee/tab-bar';
import {
  getTrainingRowsForEmployee,
  mockSops,
  mockTrainingEmployees,
} from '@/lib/mock-training';
import type { TrainingAssignmentRow, TrainingAssignmentStatus } from '@/lib/types';

/**
 * The cook's home. Action-first.
 *
 * Visual hierarchy (per product spec):
 *   1. Greeting + identity.
 *   2. Search.
 *   3. Training that needs your attention (large hero card).
 *   4. Assigned training (compact rows / single wide card).
 *   5. Procedures relevant to role / station (compact list rows).
 *
 * The Training card carries the most weight on the page — it's the most
 * important action the cook has today. Procedures fill the page below with
 * useful content without competing with the training card.
 */

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function EmployeeHomePage({ params }: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('employee.home');

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let employee;
  try {
    const me = await fetchMe(cookieHeader);
    employee = me.employee;
  } catch (err) {
    if (err instanceof ApiException) redirect(`/${locale}/login`);
    throw err;
  }

  const viewAs = await readViewAs();
  const primaryRoleId = employee.roleIds[0];
  const primaryStationId = employee.stationIds[0];

  let procedures: Procedure[] = [];
  let roleName: string | null = null;
  let stationName: string | null = null;
  let training: TrainingAssignmentRow[] = [];
  let loadError = false;

  // Each of these is optional context: a failure narrows the page, it does not
  // break it. A cook mid-shift needs the search box more than the trimmings.
  await Promise.all([
    listProcedures({}, cookieHeader)
      .then((r) => {
        procedures = r.procedures;
      })
      .catch(() => {
        loadError = true;
      }),
    primaryRoleId
      ? listRoles(cookieHeader)
          .then((r) => {
            roleName = r.roles.find((x) => x.id === primaryRoleId)?.name ?? null;
          })
          .catch(() => {})
      : Promise.resolve(),
    primaryStationId
      ? listStations(employee.locationId, cookieHeader)
          .then((r) => {
            stationName = r.stations.find((s) => s.id === primaryStationId)?.name ?? null;
          })
          .catch(() => {})
      : Promise.resolve(),
    Promise.resolve().then(() => {
      // The mock-training seed identities don't match the auth seed. Bridge by
      // name so Home renders the same pending training as the Training tab —
      // matches the fallback the Training page already does.
      const matched = mockTrainingEmployees.find(
        (e) => e.name.toLowerCase() === employee.name.toLowerCase(),
      );
      const trainingEmployeeId =
        matched?.id ?? mockTrainingEmployees[0]?.id ?? employee.id;
      training = getTrainingRowsForEmployee(trainingEmployeeId, new Date());
    }),
  ]);

  const now = Date.now();
  const isEs = locale === 'es';

  // ---- Bucket training ----
  // One card per unfinished assignment, ordered by urgency. The stats row
  // sits at the top of the section; the cards below show every unfinished
  // assignment in a single queue (overdue → due-soon → in-progress → due
  // further out). The Training tab still surfaces every status; Home only
  // shows the queue + counts.
  const unfinished = training
    .filter((r) => r.effectiveStatus !== 'complete')
    .sort((a, b) => {
      const rank = (s: TrainingAssignmentStatus): number =>
        s === 'overdue' ? 0 : s === 'due' ? 1 : 2;
      const ra = rank(a.effectiveStatus);
      const rb = rank(b.effectiveStatus);
      if (ra !== rb) return ra - rb;
      return new Date(a.assignment.dueAt).getTime() - new Date(b.assignment.dueAt).getTime();
    });
  const completedCount = training.filter((r) => r.effectiveStatus === 'complete').length;
  const trainingCards: TrainingCard[] = unfinished.slice(0, 6).map((r) =>
    buildTrainingCard(r, now, t, isEs, locale),
  );
  const trainingStats: TrainingStats = {
    completed: completedCount,
    total: training.length,
    progressLabel: t('trainingProgress', {
      done: completedCount,
      total: training.length,
    }),
    remainingLabel: t('trainingRemaining', { count: unfinished.length }),
  };

  // ---- Relevant procedures ----
  // Live procedures + mockSops are merged so the section is populated while
  // the library is still being seeded. The live list keeps priority; the
  // mock fixtures fill in the rest. Both are filtered by stationScope (live
  // also exposes an `access` field — when the live schema doesn't carry a
  // stationScope we fall back to the live access roleId/stationId matching
  // the cook's primary role/station).
  const readsSpanish = employee.languagePref === 'es';
  const hasRoleOrStation = Boolean(primaryRoleId) || Boolean(primaryStationId);
  const publishedLive = procedures.filter((p) => p.status === 'published' && !p.isArchived);
  const liveRelevant = publishedLive.filter((p) => {
    const scope = p.stationScope;
    if (scope) {
      if (scope.mode === 'all') return true;
      return primaryStationId ? scope.stationIds.includes(primaryStationId) : false;
    }
    // No stationScope on the live row — try the legacy `access` shape. A
    // procedure with no role/station access restriction matches everyone.
    const access = (p as unknown as { access?: { roleId?: string | null; stationId?: string | null } }).access;
    if (!access) return true;
    if (access.roleId && access.roleId !== primaryRoleId) return false;
    if (access.stationId && access.stationId !== primaryStationId) return false;
    return true;
  });
  const liveSlugs = new Set(liveRelevant.map((p) => p.slug));
  const mockRelevant = mockSops
    .filter((p) => !liveSlugs.has(p.slug))
    .filter((p) => {
      const scope = p.stationScope;
      if (!scope) return false;
      if (scope.mode === 'all') return true;
      return primaryStationId ? scope.stationIds.includes(primaryStationId) : false;
    });
  const combined = [...liveRelevant, ...mockRelevant];
  const relevantProcedures: ProcedureRowData[] = hasRoleOrStation
    ? combined
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 4)
        .map((p) => ({
          href: withAs(`/${locale}/procedures/${p.slug}`, viewAs),
          title: readsSpanish ? p.titleEs || p.titleEn : p.titleEn || p.titleEs,
          meta: procedureMeta(p, roleName, stationName, t, readsSpanish),
        }))
    : [];

  const firstName = firstNameOf(employee.name);
  const greetingKey: GreetingKey = greetingForDate(new Date(now));

  return (
    <>
      <main className="mx-auto w-full max-w-doc px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <EmployeeHome
          locale={locale}
          fullName={employee.name}
          firstName={firstName}
          whoLine={[roleName, stationName].filter(Boolean).join(' · ') || t('noStation')}
          greetingKey={greetingKey}
          searchHeading={t('askHeading')}
          searchLabel={t('searchLabel')}
          searchPlaceholder={t('searchPlaceholder')}
          searchHint={t('searchHint')}
          greetingMorning={t('greetingMorning', { name: firstName })}
          greetingAfternoon={t('greetingAfternoon', { name: firstName })}
          greetingEvening={t('greetingEvening', { name: firstName })}
          training={{
            title: t('trainingAttentionHeading'),
            cards: trainingCards,
            stats: trainingStats,
            seeAll: { href: `/${locale}/employee/training`, label: t('trainingSeeAll') },
          }}
          caughtUpTitle={t('trainingCatchUpTitle')}
          caughtUpBody={t('trainingCatchUpBody')}
          procedures={{
            rows: relevantProcedures,
            title: t('newForRoleHeading'),
            seeAll: { href: `/${locale}/procedures`, label: t('trainingSeeAll') },
            emptyBody: hasRoleOrStation ? t('newForRoleEmpty') : t('newForRoleEmptyNoRole'),
            browseLabel: t('noProceduresHeading'),
            browseHref: `/${locale}/procedures`,
          }}
          errorBody={t('errorBody')}
          errored={
            loadError &&
            trainingCards.length === 0 &&
            completedCount === 0 &&
            relevantProcedures.length === 0
          }
        />
      </main>

      <TabBar
        locale={locale}
        active="home"
        labels={{ home: t('tabHome'), procedures: t('tabProcedures'), training: t('tabTraining'), soon: t('tabSoon'), nav: t('tabsNav') }}
      />
    </>
  );
}

function buildTrainingCard(
  r: TrainingAssignmentRow,
  now: number,
  t: (k: string, v?: Record<string, string | number>) => string,
  isEs: boolean,
  locale: string,
): TrainingCard {
  const status = r.effectiveStatus;
  const title = isEs ? r.course.titleEs || r.course.titleEn : r.course.titleEn || r.course.titleEs;
  const href = `/${locale}/employee/training/${r.course.id}`;

  let statusPill: TrainingCard['statusPill'];
  let dueLabel: string;
  let action: TrainingCard['action'] = 'start';

  if (status === 'overdue') {
    const overdueDays = Math.max(
      1,
      Math.round(-(new Date(r.assignment.dueAt).getTime() - now) / DAY_MS),
    );
    statusPill = { tone: 'bad', text: t('trainingOverdueChip') };
    dueLabel = overdueDays === 1 ? t('trainingOverdueSince') : t('trainingOverdueBy', { days: overdueDays });
    action = 'start';
  } else if (status === 'in_progress') {
    statusPill = { tone: 'progress', text: t('trainingInProgressChip') };
    dueLabel = t('trainingInProgressChip');
    action = 'continue';
  } else {
    // status === 'due'.
    statusPill = { tone: 'warn', text: t('trainingDueSoonChip') };
    dueLabel = dueLabelFor(r.assignment.dueAt, now, t);
    action = 'start';
  }

  return {
    href,
    title,
    statusPill,
    dueLabel,
    action,
    actionLabel: action === 'continue' ? t('continueAction') : t('startAction'),
  };
}

// ---- Pure helpers ----

function dueLabelFor(
  dueAt: string,
  now: number,
  t: (k: string, v?: Record<string, string | number>) => string,
): string {
  const days = (new Date(dueAt).getTime() - now) / DAY_MS;
  const d = Math.round(days);
  if (d <= 0) return t('trainingDueToday');
  if (d === 1) return t('trainingDueTomorrow');
  return t('trainingDueInDays', { days: d });
}

function procedureMeta(
  p: Procedure,
  roleName: string | null,
  stationName: string | null,
  t: (k: string, v?: Record<string, string | number>) => string,
  readsSpanish = false,
): string {
  // The procedure's category -- the fact that tells one row from the next. The
  // reader's own role and station were printed on every row, the same words
  // four times under a heading that already says "for your role & station".
  // They stay as the fallback for a procedure with no category.
  const category = p.category ? (readsSpanish ? p.category.nameEs || p.category.nameEn : p.category.nameEn) : '';
  if (category) return category;
  const tokens = [roleName, stationName].filter(Boolean);
  if (tokens.length === 0) return t('noStation');
  return tokens.join(' · ');
}

function firstNameOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  const first = trimmed.split(/\s+/)[0]!;
  // Some names carry a "Chef " honorific; keep the second token as the spoken
  // name if it exists, otherwise fall back to the first word.
  if (/^(chef|chefra[ií]l)$/i.test(first) && trimmed.split(/\s+/).length > 1) {
    return trimmed.split(/\s+/)[1]!;
  }
  return first;
}
