import * as React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ApiException, fetchMe, listProcedures, listRoles, listStations } from '@/lib/api';
import type { Procedure, ProcedureBlock, TrainingAssignmentRow } from '@/lib/types';
import { readViewAs } from '@/lib/view-as-server';
import { withAs } from '@/lib/view-as';
import { TabBar } from '@/components/employee/tab-bar';
import { getTrainingRowsForEmployee, mockTrainingEmployees } from '@/lib/mock-training';
import { EmployeeHome, type HomeRow, type TrainingSummary } from './components/EmployeeHome';
import { allergenWords, factsOf } from './components/procedure-facts';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

const DAY = 24 * 60 * 60 * 1000;
/** Someone who joined this recently is still in their first weeks. */
const FIRST_WEEKS = 30 * DAY;
/** A procedure edited this recently counts as changed. */
const CHANGED_WINDOW = 14 * DAY;

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
    employee = (await fetchMe(cookieHeader)).employee;
  } catch (err) {
    if (err instanceof ApiException) redirect(`/${locale}/login`);
    throw err;
  }

  // Landed here in the other language (a bookmark, a shared link): the home is
  // this person's, so it opens in theirs. An admin looking in is left alone.
  if (employee.role !== 'admin' && employee.languagePref && employee.languagePref !== locale) {
    redirect(`/${employee.languagePref}/employee/home`);
  }

  const viewAs = await readViewAs();
  const stationId = employee.stationIds[0] ?? null;
  const roleId = employee.roleIds[0] ?? null;

  // Only what this person may read: the API applies audience and clearance.
  const [procedures, roleName, stationName] = await Promise.all([
    listProcedures({}, cookieHeader)
      .then((r) => r.procedures.filter((p) => p.status === 'published' && !p.isArchived))
      .catch(() => [] as Procedure[]),
    roleId
      ? listRoles(cookieHeader).then((r) => r.roles.find((x) => x.id === roleId)?.name ?? null).catch(() => null)
      : Promise.resolve(null),
    stationId
      ? listStations(employee.locationId, cookieHeader)
          .then((r) => r.stations.find((s) => s.id === stationId)?.name ?? null)
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  const now = Date.now();
  const isEs = locale === 'es';
  const readsSpanish = employee.languagePref === 'es';
  const titleOf = (p: { titleEn: string; titleEs: string }): string =>
    readsSpanish ? p.titleEs || p.titleEn : p.titleEn || p.titleEs;

  /* ---------------------------------------------------------- training -- */

  // The training mock and the employee list share ids; the name match is the
  // fallback for anyone the mock does not know.
  const trainingId =
    mockTrainingEmployees.find((e) => e.id === employee.id)?.id ??
    mockTrainingEmployees.find((e) => e.name.toLowerCase() === employee.name.toLowerCase())?.id ??
    employee.id;
  const rows = getTrainingRowsForEmployee(trainingId, new Date(now));
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

  const training: TrainingSummary | null = rows.length
    ? {
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

  // First weeks with work open, or anything late: the training is the day's work.
  const trainingFirst = Boolean(training && ((inFirstWeeks && open.length > 0) || overdue.length > 0));

  /* -------------------------------------------------------- procedures -- */

  const forMyStation = (p: Procedure): boolean =>
    Boolean(
      stationId &&
        ((p.stationScope?.mode === 'specific' && p.stationScope.stationIds.includes(stationId)) ||
          (p.audience?.mode === 'some' && p.audience.stationIds.includes(stationId))),
    );
  const toRow = (p: Procedure, meta: string): HomeRow => {
    const facts = factsOf(p, readsSpanish);
    return {
      key: p.id,
      slug: p.slug,
      updatedAt: p.updatedAt,
      href: withAs(`/${locale}/procedures/${p.slug}`, viewAs),
      cover: coverOf(p.bodyEn.blocks.length ? p.bodyEn.blocks : p.bodyEs.blocks),
      category: p.category,
      title: titleOf(p),
      meta,
      flags: { ...facts, allergens: allergenWords(facts.allergens, isEs ? 'es' : 'en') },
    };
  };
  const categoryOf = (p: Procedure): string =>
    p.category ? (readsSpanish ? p.category.nameEs || p.category.nameEn : p.category.nameEn) : t('uncategorised');
  const rel = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  // What changed lately in what this person works with: their station's, and
  // the kitchen-wide procedures everyone follows.
  const changed = procedures
    .filter((p) => now - new Date(p.updatedAt).getTime() < CHANGED_WINDOW)
    .filter((p) => forMyStation(p) || !p.stationScope || p.stationScope.mode === 'all')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);
  const changedIds = new Set(changed.map((p) => p.id));

  // Their station's own procedures first, then the rest of what they can read.
  const stationRows = procedures
    .filter((p) => !changedIds.has(p.id))
    .sort(
      (a, b) =>
        Number(forMyStation(b)) - Number(forMyStation(a)) ||
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 5);

  const initials = employee.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

  return (
    <>
      <main className="mx-auto w-full max-w-doc px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
        <EmployeeHome
          locale={locale}
          readsSpanish={readsSpanish}
          who={{
            name: employee.name,
            initials,
            // A dishwasher at the Dishwasher station read "Dishwasher · Dishwasher".
            line: [...new Set([roleName, stationName].filter(Boolean))].join(' · ') || t('noStation'),
          }}
          ask={{
            locale,
            heading: t('askHeading'),
            label: t('searchLabel'),
            placeholder: t('askPlaceholder'),
            hint: t('askHint'),
            micLabel: t('micLabel'),
            listeningLabel: t('micListening'),
          }}
          training={training}
          trainingFirst={trainingFirst}
          backTo={{ heading: t('backToHeading'), opened: t.raw('openedAgo') as string }}
          changed={{
            heading: t('changedForYouHeading'),
            rows: changed.map((p) =>
              toRow(p, `${categoryOf(p)} · ${t('changedAgo', { when: relDays(p.updatedAt, now, rel) })}`),
            ),
          }}
          station={{
            // Named for the station only when something here is the station's own.
            heading:
              stationName && stationRows.some(forMyStation)
                ? t('stationHeading', { station: stationName })
                : t('forYouHeading'),
            rows: stationRows.map((p) => toRow(p, categoryOf(p))),
            all: { href: `/${locale}/procedures`, label: t('browseAll') },
            empty: t('noProceduresBody'),
          }}
          flagLabels={{
            allergen: (list) => t('flagAllergen', { list }),
            critical: t('flagCritical'),
            english: t('flagEnglishOnly'),
          }}
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

function relDays(iso: string, now: number, rel: Intl.RelativeTimeFormat): string {
  return rel.format(Math.round((new Date(iso).getTime() - now) / DAY), 'day');
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
