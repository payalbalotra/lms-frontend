import * as React from 'react';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  ApiException,
  fetchMe,
  listCategories,
  listEmployees,
  listLocations,
  listProcedures,
  listRoles,
  listStations,
} from '@/lib/api';
import type { AdminEmployee, Category, Procedure, Role, Station } from '@/lib/types';
import {
  buildAttention,
  recentProcedures,
  relativeDays,
  resumeDraft,
  type AttentionGroup,
} from './components/home/home-data';
import {
  AttentionList,
  HomeHeader,
  RecentProcedures,
  ResumeLine,
  StatStrip,
  type GroupCopy,
  type Stat,
} from './components/home/HomeSections';
import { LuFilePen, LuFileText, LuGraduationCap, LuPlus, LuUpload, LuUsers } from 'react-icons/lu';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

/**
 * The manager's home answers one question first: does anything need me? Then
 * where did I leave off, and what changed. Every count on it comes from the
 * API; a section with nothing real to say is left out rather than filled.
 */
export default async function AdminHomePage({ params }: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin.home');

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let meId: string | null = null;
  let employees: AdminEmployee[] = [];
  let procedures: Procedure[] = [];
  let categories: Category[] = [];
  let roles: Role[] = [];
  let stations: Station[] = [];

  try {
    const me = await fetchMe(cookieHeader);
    meId = me.employee.id;
    const { locations } = await listLocations(cookieHeader);
    const location = locations.find((l) => l.id === me.employee.locationId) ?? locations[0];
    const locationId = location?.id ?? me.employee.locationId;
    [{ employees }, { procedures }, { categories }, { roles }, { stations }] = await Promise.all([
      listEmployees({ status: 'all' }, cookieHeader),
      listProcedures({}, cookieHeader),
      listCategories(locationId, {}, cookieHeader),
      listRoles(cookieHeader),
      listStations(locationId, cookieHeader),
    ]);
  } catch (err) {
    if (err instanceof ApiException) return <HomeError message={err.message} />;
    throw err;
  }

  const now = Date.now();
  const nameById = new Map(employees.map((e) => [e.id, e.name]));

  const groups = buildAttention({
    locale,
    now,
    meId,
    employees,
    procedures,
    categories,
    roles,
    stations,
    t: {
      inviteTitle: (name) => t('inviteTitle', { name }),
      invitedAgo: (when) => t('invitedAgo', { when }),
      readsSpanish: t('readsSpanish'),
      spanishTitle: (title) => t('spanishTitle', { title }),
      spanishReaders: (count) => t('spanishReaders', { count }),
      editedAgo: (when, name) => (name ? t('editedAgoBy', { when, name }) : t('editedAgo', { when })),
      noSpanishYet: t('noSpanishYet'),
      emptyCategoryTitle: (name) => t('emptyCategoryTitle', { name }),
      emptyCategoryMeta: t('emptyCategoryMeta'),
      uncategorised: t('uncategorised'),
    },
  });

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  const dateLabel = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const resume = resumeDraft(procedures, meId);

  const groupCopy: Record<AttentionGroup['kind'], GroupCopy> = {
    invite: { title: t('group.invite.title'), action: t('group.invite.action'), tone: 'warn' },
    spanish: { title: t('group.spanish.title'), action: t('group.spanish.action'), tone: 'bad' },
    draft: { title: t('group.draft.title'), action: t('group.draft.action'), tone: 'ink' },
    emptyCategory: { title: t('group.emptyCategory.title'), action: t('group.emptyCategory.action'), tone: 'ink' },
  };

  const active = employees.filter((e) => e.status === 'active');
  const invited = employees.filter((e) => e.status === 'pending').length;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const newThisWeek = (iso: string): boolean => new Date(iso).getTime() >= weekAgo;
  const drafts = procedures.filter((p) => p.status === 'draft').length;
  const addedProcedures = procedures.filter((p) => newThisWeek(p.createdAt)).length;
  const joinedPeople = active.filter((e) => newThisWeek(e.createdAt)).length;

  // Training has no data behind it until the training module exists. The figure
  // and the ring below are placeholders for the demo — swap TRAINING_DEMO for the
  // real completion rate, and drop `stat.trainingSample` from the messages, the
  // moment the module lands.
  const TRAINING_DEMO = { done: 34, total: 48 };
  const stats: Stat[] = [
    {
      label: t('stat.procedures'),
      icon: LuFileText,
      value: String(procedures.length),
      note: addedProcedures ? t('stat.proceduresNew', { count: addedProcedures }) : t('stat.proceduresNoneNew'),
      tone: addedProcedures ? 'up' : undefined,
    },
    {
      label: t('stat.drafts'),
      icon: LuFilePen,
      value: String(drafts),
      note: drafts ? t('stat.draftsWaiting') : t('stat.draftsNone'),
      tone: drafts ? 'caution' : undefined,
    },
    {
      label: t('stat.people'),
      icon: LuUsers,
      value: String(active.length),
      note: invited ? t('stat.peopleInvited', { count: invited }) : joinedPeople ? t('stat.peopleNew', { count: joinedPeople }) : t('stat.peopleSteady'),
      tone: invited ? 'caution' : joinedPeople ? 'up' : undefined,
    },
    {
      label: t('stat.training'),
      icon: LuGraduationCap,
      value: `${Math.round((TRAINING_DEMO.done / TRAINING_DEMO.total) * 100)}%`,
      note: t('stat.trainingSample', { done: TRAINING_DEMO.done, total: TRAINING_DEMO.total }),
      meter: { value: TRAINING_DEMO.done, total: TRAINING_DEMO.total },
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-12">
      <div className="space-y-8">
        <HomeHeader
          place={dateLabel}
          headline={total === 0 ? t('headlineClear') : t('headline', { count: total })}
          actions={[
            { href: `/${locale}/admin/library/new`, label: t('actionCreate'), icon: LuPlus, primary: true },
            { href: `/${locale}/admin/library/new`, label: t('actionImport'), icon: LuUpload },
          ]}
        />
        <StatStrip stats={stats} />
        {resume ? (
          <ResumeLine
            procedure={resume}
            locale={locale}
            label={t('resumeEyebrow')}
            meta={t('resumeMeta', { when: relativeDays(resume.updatedAt, locale, now) })}
            cta={t('resumeCta')}
          />
        ) : null}
      </div>

      <AttentionList
        heading={t('attentionHeading')}
        groups={groups}
        copy={groupCopy}
        empty={{ title: t('clearTitle'), body: t('clearBody') }}
      />

      <div>
        <RecentProcedures
          locale={locale}
          heading={t('recentHeading')}
          seeAll={t('recentSeeAll')}
          procedures={recentProcedures(procedures)}
          statusLabel={(p) => (p.status === 'draft' ? t('statusDraft') : t('statusPublished'))}
          metaFor={(p) => {
            const when = relativeDays(p.updatedAt, locale, now);
            const name = nameById.get(p.createdBy);
            return name ? t('updatedAgoBy', { when, name }) : t('updatedAgo', { when });
          }}
        />
      </div>
    </div>
  );
}

function HomeError({ message }: { message: string }): React.ReactElement {
  return (
    <div role="alert" className="mx-auto max-w-2xl rounded-[var(--radius-lg)] bg-[var(--color-bad-tint)] p-6">
      <p className="font-semibold text-[var(--color-bad)]">{message}</p>
    </div>
  );
}
