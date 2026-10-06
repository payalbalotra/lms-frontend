'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LuArrowLeft, LuCalendar, LuCheck, LuCircleAlert, LuClock, LuMail, LuMapPin, LuPencil } from 'react-icons/lu';
// LuPencil is used by the PageHeader Edit action and the kebab in the
// header band. (The Roles & stations card was removed; its inline Edit
// button moved up to the page header.)

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { StatusPill, type StatusTone } from '@/components/ui/status-pill';
import { Meter } from '@/components/ui/meter';
import { ChipStack } from '@/components/admin/chip-stack';
import { FormSection } from '@/components/admin/form-section';
import { TrainingSummary, summariseTraining, trainingStatusTone } from '@/components/admin/training-summary';
import { EmployeeRowActions } from '../employee-row-actions';
import { EditRolesModal } from './edit-roles-modal';

import {
  getEmployeeById,
  loadRoles,
  loadStationsForLocation,
  loadLocations,
  EMPLOYEES_UPDATED_EVENT,
  type UpdateEmployeeInput,
} from '@/lib/mock-employees';
import { getTrainingRowsForEmployee } from '@/lib/mock-training';
import { useRouter } from 'next/navigation';
import type {
  AdminEmployee,
  Role,
  Station,
  TrainingAssignmentRow,
  TrainingAssignmentStatus,
} from '@/lib/types';

interface EmployeeDetailClientProps {
  locale: string;
}

export function EmployeeDetailClient({ locale }: EmployeeDetailClientProps): React.ReactElement {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const t = useTranslations('admin');

  // The mock store is client-only; on first render we read synchronously
  // (which falls back to the seed on the server). After mount we
  // re-hydrate from localStorage and subscribe to changes so the page
  // reflects a cross-tab edit on the kebab / modal flows.
  const [employee, setEmployee] = useState<AdminEmployee | undefined>(() => getEmployeeById(id));

  React.useEffect(() => {
    setEmployee(getEmployeeById(id));
    const refresh = (): void => setEmployee(getEmployeeById(id));
    window.addEventListener('storage', refresh);
    window.addEventListener(EMPLOYEES_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(EMPLOYEES_UPDATED_EVENT, refresh);
    };
  }, [id]);

  // Picker catalogs for the edit modal. Loaded on first open — there's no
  // reason to fetch them on a page where the user never clicks Edit.
  const [roles, setRoles] = useState<Role[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [editOpen, setEditOpen] = useState(false);

  async function openEdit(): Promise<void> {
    if (!employee) return;
    if (roles.length === 0) {
      setRoles(await loadRoles());
    }
    if (locations.length === 0) {
      setLocations(await loadLocations());
    }
    if (stations.length === 0) {
      setStations(await loadStationsForLocation(employee.locationId));
    }
    setEditOpen(true);
  }

  /** When the user picks a different location inside the modal, the
   *  station list has to refetch — stations are scoped per location.
   *  The modal owns the working state of the new locationId; the page
   *  just keeps the stations catalog in sync. */
  async function onLocationChange(locationId: string): Promise<void> {
    setStations(await loadStationsForLocation(locationId));
  }

  function onSaved(next: AdminEmployee, _prior: UpdateEmployeeInput): void {
    // The mock store dispatches the same-tab event; we re-read on the
    // off-chance the storage listener was already torn down. The toast
    // is a separate UI task (DESIGN.md §3.6 — 6s with Undo) and will
    // call `updateEmployee` again with the captured `prior` to restore.
    setEmployee(next);
    router.refresh();
  }

  if (!employee) {
    return (
      <div className="mx-auto max-w-page space-y-6 pb-12">
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <h2 className="text-md font-semibold text-[var(--color-ink)]">
              {t('errorNotFound')}
            </h2>
            <p className="text-sm text-[var(--color-ink-2)]">
              {t('detailNotFoundBody')}
            </p>
            <div className="flex justify-center pt-2">
              <Link href={`/${locale}/admin/employees`}>
                <Button variant="neutral">{t('backToList')}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Lookup maps for the role / station chips. Same idea as the list page.
  const roleLabel = useMemo(
    () => new Map(roles.map((r) => [r.id, r.name] as const)),
    [roles],
  );
  const stationLabel = useMemo(
    () => new Map(stations.map((s) => [s.id, s.name] as const)),
    [stations],
  );
  // Roles and stations can be looked up on the live page even before the
  // modal is opened, because both catalogs are tiny. The new-employee
  // form does the same — `listRoles` is called up front in
  // `app/[locale]/admin/employees/new/page.tsx`. We follow suit here so
  // the info card renders labels without a re-fetch.
  const [roleLabels, stationLabels] = useMemo(() => {
    const rIds = employee.roleIds ?? (employee as any).jobIds ?? [];
    const sIds = employee.stationIds ?? [];
    return [
      rIds
        .map((rid: string) => roleLabel.get(rid))
        .filter((s: string | undefined): s is string => Boolean(s)),
      sIds
        .map((sid: string) => stationLabel.get(sid))
        .filter((s: string | undefined): s is string => Boolean(s)),
    ];
  }, [employee.roleIds, employee.stationIds, (employee as any).jobIds, roleLabel, stationLabel]);

  // Load the catalogs on mount so the chips render with names from the
  // first paint, not after the user opens the edit modal. Stations are
  // reloaded when the employee's locationId changes (e.g. after a save
  // moved them to a different branch).
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [r, s, l] = await Promise.all([
        loadRoles(),
        loadStationsForLocation(employee.locationId),
        loadLocations(),
      ]);
      if (cancelled) return;
      setRoles(r);
      setStations(s);
      setLocations(l);
    })();
    return () => {
      cancelled = true;
    };
  }, [employee.locationId]);

  const trainingRows: TrainingAssignmentRow[] = getTrainingRowsForEmployee(employee.id);
  const trainingSummary = summariseTraining(trainingRows);

  const statusTone: StatusTone =
    employee.status === 'active'
      ? 'ok'
      : employee.status === 'pending'
        ? 'warn'
        : 'bad';

  const joinedLabel = new Date(employee.createdAt).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="mx-auto max-w-page space-y-6 pb-12">
      {/* Top navigation chrome: back link on the left, Edit on the right */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/${locale}/admin/employees`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
        >
          <LuArrowLeft className="size-4" aria-hidden="true" />
          <span>{t('backToList')}</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => void openEdit()}
            icon={LuPencil}
          >
            {t('actionsEdit')}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-start gap-4 p-6 sm:flex-nowrap">
          <Avatar initials={initials(employee.name)} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-display tracking-tight text-[var(--color-ink)]">
                {employee.name}
              </h1>
              <StatusPill tone={statusTone}>{t(statusKey(employee.status))}</StatusPill>
            </div>
            <p className="mt-2 text-sm text-[var(--color-ink-2)]">
              {oneLiner({
                roleLabels: roleLabels.length > 0 ? roleLabels : ((employee.roleIds?.length || (employee as any).jobIds?.length) ? [t('detailRolesEmpty')] : []),
                stationLabels: stationLabels.length > 0 ? stationLabels : (employee.stationIds?.length ? [t('stationsEmpty')] : []),
                location: employee.locationName,
              })}
            </p>
          </div>
          <div className="shrink-0">
            <EmployeeRowActions locale={locale} employee={employee} onEdit={openEdit} />
          </div>
        </CardContent>
      </Card>

      {/* Employee information. Six facts in the .facts grid. The order
          matters — it's what the eye scans in: who they are, where they
          work, how to reach them, when they joined, what state the
          account is in. */}
      <FormSection
        icon={LuCircleAlert}
        title={t('detailInfoHeading')}
        subtitle={t('detailInfoHint')}
      >
        <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4 pt-1">
          <div>
            <dt className="text-sm font-medium text-[var(--color-ink-3)]">
              {t('detailFactAccessLevel')}
            </dt>
            <dd className="mt-1">
              <StatusPill tone={accessLevelTone(lmsRole(employee))}>
                {t(accessLevelKey(lmsRole(employee)))}
              </StatusPill>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--color-ink-3)]">
              {t('detailFactJobRole')}
            </dt>
            <dd className="mt-1 min-w-0">
              <ChipStack
                items={roleLabels}
                emptyText={t('jobRolesEmpty')}
              />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--color-ink-3)]">
              {t('detailFactStation')}
            </dt>
            <dd className="mt-1 min-w-0">
              <ChipStack
                items={stationLabels}
                tone="station"
                emptyText={t('stationsEmpty')}
              />
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-3)]">
              <LuMapPin className="size-4 shrink-0 text-[var(--color-ink-3)]" aria-hidden="true" />
              <span>{t('detailFactLocation')}</span>
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
              {employee.locationName ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-3)]">
              <LuMail className="size-4 shrink-0 text-[var(--color-ink-3)]" aria-hidden="true" />
              <span>{t('detailFactEmail')}</span>
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              {employee.email ? (
                <a
                  href={`mailto:${employee.email}`}
                  className="text-[var(--color-brand-600)] underline-offset-2 hover:underline"
                >
                  {employee.email}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-3)]">
              <LuCalendar className="size-4 shrink-0 text-[var(--color-ink-3)]" aria-hidden="true" />
              <span>{t('detailFactJoined')}</span>
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--color-ink)]">{joinedLabel}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--color-ink-3)]">
              {t('detailFactAccountStatus')}
            </dt>
            <dd className="mt-1">
              <StatusPill tone={statusTone}>{t(statusKey(employee.status))}</StatusPill>
            </dd>
          </div>
        </dl>
      </FormSection>

      {/* Training overview. A meter of the overall share plus four
          counts in their semantic tones. When the employee has no
          assignments, the meter returns null (DESIGN.md: never invent
          a number) and the empty state takes over. */}
      <FormSection
        icon={LuCheck}
        title={t('detailTrainingHeading')}
        subtitle={
          trainingSummary.total > 0
            ? t('detailTrainingCount', {
                done: trainingSummary.complete,
                total: trainingSummary.total,
              })
            : t('detailTrainingHint')
        }
      >
        {trainingSummary.total === 0 ? (
          <p className="text-sm text-[var(--color-ink-2)]">
            {t('detailTrainingEmpty')}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-6">
            <Meter
              value={trainingSummary.complete}
              total={trainingSummary.total}
              size={64}
              stroke={7}
              tone={trainingSummary.overdue > 0 ? 'warn' : 'ok'}
              label={`${trainingSummary.share}%`}
            />
            <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              <TrainingCount
                label={t('detailTrainingCompleted')}
                value={trainingSummary.complete}
                tone="ok"
              />
              <TrainingCount
                label={t('detailTrainingInProgress')}
                value={trainingSummary.inProgress}
                tone="neutral"
              />
              <TrainingCount
                label={t('detailTrainingNotStarted')}
                value={trainingSummary.notStarted}
                tone="neutral"
              />
              <TrainingCount
                label={t('detailTrainingOverdue')}
                value={trainingSummary.overdue}
                tone="bad"
              />
            </dl>
          </div>
        )}
      </FormSection>

      {/* Assigned training list. One row per course. The status pill
          tone is sourced from the same `trainingStatusTone` helper the
          list page uses, so a course that reads "in progress" here
          reads "in progress" on the employee side and on the admin
          Training tab — one source of truth. */}
      <FormSection
        icon={LuClock}
        title={t('detailAssignedHeading')}
        subtitle={t('detailAssignedHint')}
      >
        {trainingRows.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-2)]">{t('detailAssignedEmpty')}</p>
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {trainingRows.map((row) => (
              <li
                key={row.assignment.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-[family-name:var(--font-ui)] text-base font-semibold text-[var(--color-ink)]">
                    {row.course.titleEn}
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--color-ink-3)]">
                    {row.assignment.status === 'complete'
                      ? t('detailAssignedCompleted', {
                          when: formatDate(
                            row.assignment.acknowledgedAt ?? row.assignment.quizPassedAt ?? row.assignment.dueAt,
                            locale,
                          ),
                        })
                      : t('detailAssignedDueAt', {
                          when: formatDate(row.assignment.dueAt, locale),
                        })}
                  </p>
                </div>
                <StatusPill tone={trainingStatusTone(row.effectiveStatus)}>
                  {t(trainingStatusKey(row.effectiveStatus))}
                </StatusPill>
              </li>
            ))}
          </ul>
        )}
      </FormSection>

      {/* The Edit modal — opened from the PageHeader action above or the
          kebab in the header band. Both paths go through `openEdit` so
          the catalog state (roles / locations / stations) is loaded
          exactly once. */}
      <EditRolesModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        employee={employee}
        roles={roles}
        locations={locations}
        stations={stations}
        onLocationChange={onLocationChange}
        onSaved={onSaved}
      />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Small helpers local to the detail page.
// ----------------------------------------------------------------------------

function statusKey(status: AdminEmployee['status']): string {
  if (status === 'active') return 'statusActive';
  if (status === 'pending') return 'statusPending';
  return 'statusDeactivated';
}

/** Combine the two role-shaped fields on `AdminEmployee` into a single
 *  3-tier LMS role for display: `role === 'admin'` wins over
 *  `accessLevel` (an admin is still an admin even if their access
 *  level is 'employee'), then `accessLevel === 'manager'`, otherwise
 *  `employee`. The sketch says there are exactly three roles — Admin,
 *  Manager / Head chef, Employee — and this helper is the one place
 *  that read lives. */
type LmsRole = 'admin' | 'manager' | 'employee';

function lmsRole(e: AdminEmployee): LmsRole {
  if (e.role === 'admin') return 'admin';
  if (e.accessLevel === 'manager') return 'manager';
  return 'employee';
}

/** Map the 3-tier LMS role to its translation key. Matches the keys the
 *  invite form uses for the `manager` / `employee` slots; admin is a
 *  valid seed value but isn't assignable from the invite flow. */
function accessLevelKey(role: LmsRole): string {
  if (role === 'admin') return 'accessLevelAdmin';
  if (role === 'manager') return 'accessLevelManager';
  return 'accessLevelEmployee';
}

/** Tonal mapping for the access-level pill. The pill is the same shape as
 *  the account-status pill two facts below — using two different tones
 *  lets a scan see they're different concepts at a glance. Admin reads
 *  as `info` (distinctive, mid-prominence); manager as `warn` (elevated,
 *  deserves attention); employee as `neutral` (the default, no signal). */
function accessLevelTone(role: LmsRole): StatusTone {
  if (role === 'admin') return 'info';
  if (role === 'manager') return 'warn';
  return 'neutral';
}

function trainingStatusKey(status: TrainingAssignmentStatus): string {
  switch (status) {
    case 'complete':
      return 'detailAssignedStatusComplete';
    case 'in_progress':
      return 'detailAssignedStatusInProgress';
    case 'due':
      return 'detailAssignedStatusDue';
    case 'overdue':
      return 'detailAssignedStatusOverdue';
  }
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((w) => w.charAt(0).toUpperCase()).join('') || '?';
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function oneLiner({
  roleLabels,
  stationLabels,
  location,
}: {
  roleLabels: string[];
  stationLabels: string[];
  location: string | null;
}): string {
  // The header band shows the primary role · primary station · location.
  // Multi-role / multi-station employees see the first item only here
  // (the chips on the info card carry the rest). Empty segments are
  // skipped so a brand-new hire with no assignments doesn't read as
  // "Cook · — · Main Kitchen".
  const parts = [roleLabels[0], stationLabels[0], location].filter(Boolean);
  return parts.join(' · ');
}

function TrainingCount({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'ok' | 'bad' | 'neutral';
}): React.ReactElement {
  const valueClass =
    tone === 'ok'
      ? 'text-[var(--color-ok)]'
      : tone === 'bad'
        ? 'text-[var(--color-bad)]'
        : 'text-[var(--color-ink-2)]';
  return (
    <div>
      <dt className="text-sm text-[var(--color-ink-3)]">{label}</dt>
      <dd className={`mt-0.5 text-md font-semibold tabular-nums ${valueClass}`}>{value}</dd>
    </div>
  );
}
