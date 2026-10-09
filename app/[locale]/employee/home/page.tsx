import * as React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ApiException, fetchMe, listProcedures, listRoles, listStations } from '@/lib/api';
import type { Procedure, ProcedureBlock, TrainingAssignmentRow } from '@/lib/types';
import { readViewAs } from '@/lib/view-as-server';
import { withAs } from '@/lib/view-as';
import { TabBar } from '@/components/employee/tab-bar';
import {
  getOnboardingChapters,
  getTrainingRowsForEmployee,
  mockTrainingEmployees,
} from '@/lib/mock-training';
import { EmployeeHome, type HomeRow, type TrainingSummary } from './components/EmployeeHome';
import { HomeViewToggle } from './components/HomeViewToggle';
import { allergenWords, factsOf } from './components/procedure-facts';
import { pickPromoProcedures } from '@/lib/promos';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ view?: string }>;
}

export const dynamic = 'force-dynamic';

const DAY = 24 * 60 * 60 * 1000;
/** Someone who joined this recently is still in their first weeks. */
const FIRST_WEEKS = 30 * DAY;

export default async function EmployeeHomePage({ params, searchParams }: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  const { view = '' } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('employee.home');
  const tTraining = await getTranslations('employee.training');

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let employee;
  try {
    employee = (await fetchMe(cookieHeader)).employee;
  } catch (err) {
    if (err instanceof ApiException) redirect(`/${locale}/login`);
    throw err;
  }

  // Locale is decided by the URL (`/[locale]/employee/home`) and the Admin →
  // Employee link in admin-shell.tsx already passes through the admin's current
  // locale, so we never silently bounce employees into the language they
  // used to log in with — that used to be `employee.languagePref` and it kept
  // handing Spanish-speaking users to `/es/employee/home` even when they
  // clicked the link from an English admin page. `languagePref` still drives
  // which side of bilingual procedure content we render (`titleEs` vs
  // `titleEn`), which is its only correct job.

  const viewAs = await readViewAs();
  const stationIds = employee.stationIds ?? [];
  const roleId = (employee.jobIds && employee.jobIds[0]) ?? (employee.roleIds && employee.roleIds[0]) ?? null;

  // Only what this person may read: the API applies audience and clearance.
  const [procedures, roleName, stationNames] = await Promise.all([
    listProcedures({}, cookieHeader)
      .then((r) => r.procedures.filter((p) => p.status === 'published' && !p.isArchived))
      .catch(() => [] as Procedure[]),
    roleId
      ? listRoles(cookieHeader).then((r) => r.roles.find((x) => x.id === roleId)?.name ?? null).catch(() => null)
      : Promise.resolve(null),
    stationIds.length
      ? listStations(employee.locationId, cookieHeader)
          .then((r) =>
            stationIds
              .map((id) => r.stations.find((s) => s.id === id)?.name)
              .filter((n): n is string => Boolean(n)),
          )
          .catch(() => [] as string[])
      : Promise.resolve([] as string[]),
  ]);

  // Job-role name first; fall back to the access-level role so the subtitle
  // never silently drops the role half ("Employee · Grill" beats "Grill").
  const displayRole = roleName ?? (employee.role ? employee.role.charAt(0).toUpperCase() + employee.role.slice(1) : null);
  const stationName = stationNames.length ? stationNames.join(', ') : null;

  const now = Date.now();
  // Bilingual content follows the URL locale, not the seeded `languagePref`.
  // The URL already drives every string the employee sees — a separate
  // "renders the Spanish translation because the row says so" toggle would
  // just produce an English page with Spanish titles and Spanish eyebrows,
  // which is what the screenshot was showing.
  const isEs = locale === 'es';
  const titleOf = (p: { titleEn: string; titleEs: string }): string =>
    isEs ? p.titleEs || p.titleEn : p.titleEn || p.titleEs;

  /* ---------------------------------------------------------- greeting -- */

  // Time-of-day line. A cook landing at 6 a.m. and one landing at 9 p.m.
  // should not see the same line. Three buckets — morning before noon,
  // afternoon until six, evening after — match what most kitchens call a
  // shift, and the strings already exist in the i18n catalog.
  const hour = new Date(now).getHours();
  const greetingKey = hour < 12 ? 'greetingMorning' : hour < 18 ? 'greetingAfternoon' : 'greetingEvening';
  const greeting = t(greetingKey, { name: employee.name });

  /* ---------------------------------------------------------- training -- */

  // The training mock and the employee list share ids; the name match is the
  // fallback for anyone the mock does not know.
  const trainingId =
    mockTrainingEmployees.find((e) => e.id === employee.id)?.id ??
    mockTrainingEmployees.find((e) => e.name.toLowerCase() === employee.name.toLowerCase())?.id ??
    employee.id;
  const rows = getTrainingRowsForEmployee(trainingId, new Date(now));
  // Onboarding summary — the gate that decides whether procedures and the
  // training card are dimmed/locked or fully interactive.
  const onboarding = getOnboardingChapters(trainingId, new Date(now));
  const onboardingNotDone = !onboarding.onboardingDone;
  // Effective view: `?view=onboarding` / `?view=regular` overrides the default.
  // Default = onboarding-required view for a fresh hire, regular home for
  // everyone else. The toggle button is always visible so anyone can flip
  // between the two layouts.
  const cookieView = cookieStore.get('lms_demo_view')?.value;
  const effectiveView: 'onboarding' | 'regular' =
    view === 'onboarding' || view === 'regular'
      ? view
      : cookieView === 'onboarding' || cookieView === 'regular'
        ? cookieView
        : onboardingNotDone
          ? 'onboarding'
          : 'regular';
  const showOnboardingView = effectiveView === 'onboarding';
  const lockedHref = `/${locale}/employee/training`;
  const lockedReason = t('lockedRowReason');

  const open = rows.filter((r) => r.effectiveStatus !== 'complete');
  const overdue = open.filter((r) => r.effectiveStatus === 'overdue');
  const done = rows.length - open.length;
  const inFirstWeeks = now - new Date(employee.createdAt ?? 0).getTime() < FIRST_WEEKS;

  // The one course to do next: anything late, then what is already started,
  // then whatever falls due first.
  const rank = (r: TrainingAssignmentRow): number =>
    r.effectiveStatus === 'overdue' ? 0 : r.effectiveStatus === 'in_progress' ? 1 : 2;
  const next = [...open].sort(
    (a, b) => rank(a) - rank(b) || new Date(a.assignment.dueAt).getTime() - new Date(b.assignment.dueAt).getTime(),
  )[0];

  // When onboarding is not done, the TrainingCard slot becomes an
  // "orientation" card — same shape, points the cook at /employee/training
  // (the orientation destination), not at the next individual course.
  const training: TrainingSummary | null = rows.length
    ? onboardingNotDone
      ? {
          heading: t('orientationHeading'),
          overdueLine: undefined,
          done: onboarding.done,
          total: onboarding.total,
          next: {
            href: lockedHref,
            title: tTraining('orientationHeading'),
            pill: { tone: 'warn', text: t('orientationChip') },
            when: tTraining('orientationRequired'),
            action: onboarding.done > 0 ? t('orientationResumeAction') : t('orientationStartAction'),
          },
          caughtUp: t('orientationResumeAction'),
          all: { href: lockedHref, label: t('trainingSeeAll') },
        }
      : {
          heading: inFirstWeeks && open.length ? t('firstWeeksHeading') : t('trainingAttentionHeading'),
          doneLine: t('trainingDoneLine', { done, total: rows.length }),
          overdueLine: overdue.length ? t('trainingOverdueLine', { count: overdue.length }) : undefined,
          done,
          total: rows.length,
          next: next
            ? {
                href: `/${locale}/employee/training/${next.course.id}`,
                title: titleOf(next.course),
                pill:
                  next.effectiveStatus === 'overdue'
                    ? { tone: 'bad', text: t('trainingOverdueChip') }
                    : next.effectiveStatus === 'in_progress'
                      ? { tone: 'progress', text: t('trainingInProgressChip') }
                      : { tone: 'neutral', text: t('trainingNotStarted') },
                when: dueLabel(next.assignment.dueAt, now, t),
                action: next.effectiveStatus === 'in_progress' ? t('continueAction') : t('startAction'),
              }
            : undefined,
          caughtUp: t('trainingCatchUpTitle'),
          all: { href: `/${locale}/employee/training`, label: t('trainingSeeAll') },
        }
    : null;

  /* -------------------------------------------------------- procedures -- */

  const forMyStation = (p: Procedure): boolean =>
    Boolean(
      stationIds.length &&
        ((p.stationScope?.mode === 'specific' && p.stationScope.stationIds.some((id) => stationIds.includes(id))) ||
          (p.audience?.mode === 'some' && p.audience.stationIds.some((id) => stationIds.includes(id)))),
    );
  const toRow = (p: Procedure, meta: string): HomeRow => {
    const facts = factsOf(p, isEs);
    const sub = p.subcategoryId
      ? p.category?.subcategories?.find((s) => s.id === p.subcategoryId) ?? null
      : null;
    return {
      key: p.id,
      slug: p.slug,
      updatedAt: p.updatedAt,
      href: withAs(`/${locale}/procedures/${p.slug}`, viewAs),
      cover: coverOf(p.bodyEn.blocks.length ? p.bodyEn.blocks : p.bodyEs.blocks),
      iconImageUrl: p.iconImageUrl ?? null,
      category: p.category,
      subcategory: sub,
      title: titleOf(p),
      meta,
      flags: { ...facts, allergens: allergenWords(facts.allergens, isEs ? 'es' : 'en') },
      locked: showOnboardingView,
      lockedHref: showOnboardingView ? lockedHref : undefined,
      lockedReason: showOnboardingView ? lockedReason : undefined,
    };
  };
  const categoryOf = (p: Procedure): string =>
    p.category ? (isEs ? p.category.nameEs || p.category.nameEn : p.category.nameEn) : t('uncategorised');

  // Promo dishes — capped at 3, in display order from `PROMO_SLUGS`. The
  // audience/clearance filter ran before us, so a promo the cook may not read
  // never surfaces here.
  const promoRows = pickPromoProcedures(procedures).map((p) => toRow(p, categoryOf(p)));
  const promoIds = new Set(promoRows.map((p) => p.key));

  // The station's own procedures first, with Guacamole Fresco prioritized at the top,
  // then kitchen-wide procedures. Promos are surfaced in their own section above and never re-listed here.
  const isGuac = (p: Procedure) => p.id === 'proc-guacamole-fresco' || p.slug === 'guacamole-fresco';
  // Directly assigned to this person — its own section above the station's.
  // Assigned rows leave the station list so nothing appears twice.
  const assignedIds = new Set(
    procedures.filter((p) => p.assignUsers?.includes(employee.id)).map((p) => p.id),
  );
  const assignedRows = procedures
    .filter((p) => !promoIds.has(p.id) && assignedIds.has(p.id))
    .sort((a, b) => {
      const gA = isGuac(a) ? 1 : 0;
      const gB = isGuac(b) ? 1 : 0;
      if (gA !== gB) return gB - gA;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  const stationRows = procedures
    .filter((p) => !promoIds.has(p.id) && !assignedIds.has(p.id))
    .sort((a, b) => {
      const gA = isGuac(a) ? 1 : 0;
      const gB = isGuac(b) ? 1 : 0;
      if (gA !== gB) return gB - gA;
      return (
        Number(forMyStation(b)) - Number(forMyStation(a)) ||
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    })
    .slice(0, 5);

  return (
    <>
      <main
        className="mx-auto w-full max-w-doc px-3 pt-4 sm:px-6 sm:pt-8"
        style={{ paddingBottom: '100px' }}
      >
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: '14px' }}
        >
          <h1
            className="font-bold text-lg text-[var(--color-ink)]"
            style={{ letterSpacing: '-0.01em' }}
          >
            {t('tabHome')}
          </h1>
          <HomeViewToggle value={effectiveView} aria={t('orientationToggleAria')} />
        </div>
        <EmployeeHome
          locale={locale}
          greeting={greeting}
          name={employee.name}
          roleName={displayRole}
          stationName={stationName}
          training={training}
          promo={{
            heading: t('promoHeading'),
            rows: promoRows,
          }}
          assigned={
            !showOnboardingView && assignedRows.length > 0
              ? {
                  heading: t('assignedHeading'),
                  rows: assignedRows.map((p) => toRow(p, categoryOf(p))),
                }
              : null
          }
          station={{
            // Named for the station only when something here is the station's own.
            heading:
              stationName && stationRows.some(forMyStation)
                ? stationNames.length > 1
                  ? t('stationsHeading')
                  : t('stationHeading', { station: stationName })
                : t('forYouHeading'),
            rows: (showOnboardingView
              ? [...assignedRows, ...stationRows]
              : stationRows
            ).map((p) => toRow(p, categoryOf(p))),
            all: { href: `/${locale}/procedures`, label: t('browseAll') },
            empty: t('noProceduresBody'),
          }}
          flagLabels={{
            allergen: (list) => t('flagAllergen', { list }),
            critical: t('flagCritical'),
            english: t('flagEnglishOnly'),
          }}
          isOnboarding={showOnboardingView}
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

function coverOf(blocks: ProcedureBlock[]): string | undefined {
  const img = blocks.find((b) => b.kind === 'image' && b.src);
  return img && img.kind === 'image' ? img.src : undefined;
}

function dueLabel(dueAt: string, now: number, t: (k: string, v?: Record<string, string | number>) => string): string {
  // Rounded up, as the Training tab counts, so both say the same number.
  const d = Math.ceil((new Date(dueAt).getTime() - now) / DAY);
  if (d < -1) return t('trainingOverdueBy', { days: -d });
  if (d === -1) return t('trainingOverdueSince');
  if (d === 0) return t('trainingDueToday');
  if (d === 1) return t('trainingDueTomorrow');
  return t('trainingDueInDays', { days: d });
}
