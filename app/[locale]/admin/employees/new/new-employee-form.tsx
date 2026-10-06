'use client';

import * as React from 'react';
import { useState, useTransition, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomSelect } from '@/components/ui/custom-select';
import { MultiSelectChips } from '@/components/ui/multi-select-chips';
import { PageHeader } from '@/components/admin/page-header';
import { LuUserPlus } from 'react-icons/lu';
import { createEmployee } from '@/services/employees/api';
import { fetchLocations } from '@/services/locations/api';
import { fetchRoles, fetchJobStations, fetchJobsWithStations } from '@/services/jobs/api';
import type { JobWithStations } from '@/services/jobs/types';
import { fetchStations } from '@/services/stations/api';
import { ApiException } from '@/lib/api';
import type {
  AccessLevel,
  Employee,
  InviteResult,
  LanguagePref,
  Location,
  Role,
  Station,
} from '@/lib/types';
import { InviteResultCard } from './invite-result';

interface NewEmployeeFormProps {
  locale: string;
  locations: Location[];
  roles: Role[];
}

interface FormState {
  name: string;
  email: string;
  locationId: string;
  accessLevel: AccessLevel | '';
  roleIds: string[];
  stationIds: string[];
  employeeCode: string;
  languagePref: LanguagePref;
}

const ACCESS_LEVELS: AccessLevel[] = ['employee', 'manager'];

const initialState = (defaultLocationId: string): FormState => ({
  name: '',
  email: '',
  locationId: defaultLocationId,
  accessLevel: '',
  roleIds: [],
  stationIds: [],
  employeeCode: '',
  languagePref: 'en',
});

export function NewEmployeeForm({
  locale,
  locations: initialLocations,
  roles: initialRoles,
}: NewEmployeeFormProps): React.ReactElement {
  const t = useTranslations('admin');

  // Filter out any mock 'loc-main' id from initial locations
  const validInitialLocations = initialLocations.filter((l) => l.id !== 'loc-main');
  const [locations, setLocations] = useState<Location[]>(validInitialLocations);
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [jobsWithStations, setJobsWithStations] = useState<JobWithStations[]>([]);

  const defaultLocationId = validInitialLocations[0]?.id ?? '';
  const [form, setForm] = useState<FormState>(initialState(defaultLocationId));

  const [allStations, setAllStations] = useState<Station[]>([]);
  const [availableStations, setAvailableStations] = useState<Station[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ employee: Employee; invite: InviteResult } | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasLoadedRef = React.useRef(false);

  // Load real locations from the API on mount (do NOT load jobs or stations yet)
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    async function loadInitial() {
      try {
        const locsRes = await fetchLocations();
        if (locsRes.locations.length > 0) {
          setLocations(locsRes.locations);
          setForm((f) => ({
            ...f,
            locationId: !f.locationId || f.locationId === 'loc-main' ? locsRes.locations[0].id : f.locationId,
          }));
        }
      } catch {
        // keep fallback
      }
    }

    void loadInitial();
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onLocationChange(newLocationId: string): void {
    setForm((f) => ({ ...f, locationId: newLocationId }));
  }

  // Handle access level toggle:
  // When Employee is selected: fetch jobs and their stations; keep selections empty until user selects role
  // When Manager is selected: fetch jobs and their stations; preselect all jobs and all stations
  async function setAccessLevel(next: AccessLevel | ''): Promise<void> {
    if (next === 'manager') {
      try {
        const { jobs } = await fetchJobsWithStations();
        setJobsWithStations(jobs);

        const currentRoles: Role[] = jobs.map((j) => ({
          id: j.id,
          name: j.name,
          clearanceLevel: 'general',
          stationIds: j.stations.map((s) => s.id),
          createdAt: j.createdAt || new Date().toISOString(),
        }));

        const stationMap = new Map<string, Station>();
        jobs.forEach((j) => {
          (j.stations || []).forEach((s, idx) => {
            if (!stationMap.has(s.id)) {
              stationMap.set(s.id, {
                id: s.id,
                name: s.name,
                locationId: form.locationId,
                sortOrder: idx + 1,
                isArchived: false,
              });
            }
          });
        });
        const uniqueStations = Array.from(stationMap.values());

        setRoles(currentRoles);
        setAllStations(uniqueStations);
        setAvailableStations(uniqueStations);

        // Preselect ALL job roles and ALL stations for Manager
        setForm((f) => ({
          ...f,
          accessLevel: 'manager',
          roleIds: currentRoles.map((r) => r.id),
          stationIds: uniqueStations.map((s) => s.id),
        }));
      } catch {
        setAvailableStations(allStations);
        setForm((f) => ({
          ...f,
          accessLevel: 'manager',
          roleIds: roles.map((r) => r.id),
          stationIds: allStations.map((s) => s.id),
        }));
      }
      return;
    }

    if (next === 'employee') {
      try {
        const { jobs } = await fetchJobsWithStations();
        setJobsWithStations(jobs);

        const currentRoles: Role[] = jobs.map((j) => ({
          id: j.id,
          name: j.name,
          clearanceLevel: 'general',
          stationIds: j.stations.map((s) => s.id),
          createdAt: j.createdAt || new Date().toISOString(),
        }));
        setRoles(currentRoles);
      } catch {
        // keep fallback
      }

      setAvailableStations([]);
      setForm((f) => ({
        ...f,
        accessLevel: 'employee',
        roleIds: [],
        stationIds: [],
      }));
      return;
    }

    // Switched to none
    setAvailableStations([]);
    setForm((f) => ({
      ...f,
      accessLevel: '',
      roleIds: [],
      stationIds: [],
    }));
  }

  // Handle role selection change:
  // When a role is selected/removed, update available stations to only those of remaining roles.
  // Automatically remove any stations that belonged to the removed job role.
  async function handleRoleIdsChange(nextRoleIds: string[]): Promise<void> {
    if (nextRoleIds.length === 0) {
      setAvailableStations([]);
      setForm((f) => ({
        ...f,
        roleIds: [],
        stationIds: [],
      }));
      return;
    }

    // Recompute stations belonging to nextRoleIds
    const activeStationMap = new Map<string, Station>();
    jobsWithStations.forEach((j) => {
      if (nextRoleIds.includes(j.id)) {
        (j.stations || []).forEach((s, idx) => {
          if (!activeStationMap.has(s.id)) {
            activeStationMap.set(s.id, {
              id: s.id,
              name: s.name,
              locationId: form.locationId,
              sortOrder: idx + 1,
              isArchived: false,
            });
          }
        });
      }
    });

    const newAvailableStations = Array.from(activeStationMap.values());
    setAvailableStations(newAvailableStations);
    setForm((f) => ({
      ...f,
      roleIds: nextRoleIds,
      // Automatically remove any stations that belonged to the removed job role
      stationIds: f.stationIds.filter((id) => activeStationMap.has(id)),
    }));
  }

  // Handle station selection change:
  // If the admin removes all stations belonging to a job role, that job role is automatically removed.
  function handleStationIdsChange(nextStationIds: string[]): void {
    // If a job role has stations and all of them are deselected, remove that job role
    const remainingRoleIds = form.roleIds.filter((roleId) => {
      const job = jobsWithStations.find((j) => j.id === roleId);
      if (job && job.stations && job.stations.length > 0) {
        return job.stations.some((st) => nextStationIds.includes(st.id));
      }
      return true;
    });

    // Recompute available stations based on remaining job roles
    const activeStationMap = new Map<string, Station>();
    jobsWithStations.forEach((j) => {
      if (remainingRoleIds.includes(j.id)) {
        (j.stations || []).forEach((s, idx) => {
          if (!activeStationMap.has(s.id)) {
            activeStationMap.set(s.id, {
              id: s.id,
              name: s.name,
              locationId: form.locationId,
              sortOrder: idx + 1,
              isArchived: false,
            });
          }
        });
      }
    });

    setAvailableStations(Array.from(activeStationMap.values()));
    setForm((f) => ({
      ...f,
      roleIds: remainingRoleIds,
      stationIds: nextStationIds.filter((id) => activeStationMap.has(id)),
    }));
  }

  const stationsBlockedReason = useMemo<string | undefined>(() => {
    if (!form.accessLevel || form.roleIds.length === 0) return t('stationsEmptyNeedRole');
    if (availableStations.length === 0) return t('stationsEmptyForRoles');
    return undefined;
  }, [form.accessLevel, form.roleIds.length, availableStations.length, t]);

  function reset(): void {
    setForm(initialState(locations[0]?.id ?? ''));
    setAvailableStations([]);
    setError(null);
  }

  function validate(): string | null {
    if (!form.name.trim()) return t('errorNeedName');
    if (!form.locationId) return t('locationLabel');
    if (!form.accessLevel) return t('errorNeedAccessLevel');
    if (form.roleIds.length === 0) return t('errorNeedJobRole');
    return null;
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      try {
        const res = await createEmployee({
          name: form.name.trim(),
          email: form.email.trim() || null,
          locationId: form.locationId,
          accessLevel: form.accessLevel as AccessLevel,
          roleIds: form.roleIds,
          stationIds: form.stationIds,
          employeeCode: form.employeeCode.trim() || null,
          languagePref: form.languagePref,
        });
        setResult(res);
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === 'EMPLOYEE_CODE_TAKEN') setError(t('errorDuplicateCode'));
          else if (err.code === 'FORBIDDEN') setError(t('forbidden'));
          else setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(t('errorGeneric'));
        }
      }
    });
  }

  if (result) {
    return (
      <InviteResultCard
        locale={locale}
        invite={result.invite}
        employeeName={result.employee.name}
        onCreateAnother={() => {
          setResult(null);
          reset();
        }}
      />
    );
  }

  const field = 'grid gap-2';
  const canSubmit =
    Boolean(form.name.trim()) &&
    Boolean(form.locationId) &&
    Boolean(form.accessLevel) &&
    form.roleIds.length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t('newHeading')}
        subtitle={t('newDescription')}
        actions={
          <Link href={`/${locale}/admin/employees`}>
            <Button type="button" variant="neutral">
              {t('cancel')}
            </Button>
          </Link>
        }
      />

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {/* ===== Employee details ===== */}
        <FormSection
          title={t('sectionEmployeeDetails')}
          hint={t('sectionEmployeeDetailsHint')}
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className={field}>
              <Label htmlFor="name">{t('nameLabel')}</Label>
              <Input
                id="name"
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className={field}>
              <Label htmlFor="email">{t('emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                maxLength={200}
                placeholder={t('emailPlaceholder')}
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className={field}>
              <Label id="locationId-label" htmlFor="locationId">
                {t('locationLabel')}
              </Label>
              <CustomSelect
                id="locationId"
                ariaLabelledBy="locationId-label"
                value={form.locationId}
                onChange={onLocationChange}
                disabled={isPending || locations.length <= 1}
                options={locations.map((l) => ({ value: l.id, label: l.name }))}
              />
            </div>
          </div>
        </FormSection>

        {/* ===== Access & job assignment ===== */}
        <FormSection
          title={t('sectionAccess')}
          hint={t('sectionAccessHint')}
        >
          <div className="space-y-5">
            <fieldset className={field}>
              <legend
                id="accessLevel-label"
                className="text-sm font-semibold text-[var(--color-ink)]"
              >
                {t('accessLevelLabel')}
              </legend>
              <p className="text-sm text-[var(--color-ink-2)]">
                {t('accessLevelHint')}
              </p>
              <div
                role="radiogroup"
                aria-labelledby="accessLevel-label"
                className="flex flex-wrap gap-2"
              >
                {ACCESS_LEVELS.map((level) => {
                  const selected = form.accessLevel === level;
                  return (
                    <label
                      key={level}
                      className={[
                        'inline-flex min-h-tap-admin cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                        selected
                          ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]'
                          : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-panel)]',
                        isPending ? 'cursor-not-allowed opacity-60' : '',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name="accessLevel"
                        value={level}
                        checked={selected}
                        disabled={isPending}
                        onChange={() => void setAccessLevel(level)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={[
                          'inline-block size-2 rounded-full',
                          selected
                            ? 'bg-[var(--color-brand-600)]'
                            : 'bg-[var(--color-line-2)]',
                        ].join(' ')}
                      />
                      {level === 'manager'
                        ? t('accessLevelManager')
                        : t('accessLevelEmployee')}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <MultiSelectChips
                id="jobRoles"
                label={t('jobRolesLabel')}
                hint={t('jobRolesHint')}
                value={form.roleIds}
                onChange={(ids) => void handleRoleIdsChange(ids)}
                options={roles.map((r) => ({ value: r.id, label: r.name }))}
                disabled={isPending || !form.accessLevel}
                addLabel={t('jobRolesAdd')}
                emptyText={t('jobRolesPrompt')}
              />

              <MultiSelectChips
                id="stations"
                label={t('stationsLabel')}
                hint={t('stationsHint')}
                value={form.stationIds}
                onChange={handleStationIdsChange}
                options={availableStations.map((s) => ({
                  value: s.id,
                  label: s.name || t('selectPlaceholder'),
                }))}
                disabled={isPending || availableStations.length === 0}
                blockedReason={stationsBlockedReason}
                addLabel={t('stationsAdd')}
                emptyText={t('stationsPrompt')}
              />
            </div>
          </div>
        </FormSection>

        {/* ===== Additional details ===== */}
        <FormSection
          title={t('sectionAdditional')}
          hint={t('sectionAdditionalHint')}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className={field}>
              <Label htmlFor="employeeCode">{t('employeeCodeLabel')}</Label>
              <Input
                id="employeeCode"
                maxLength={32}
                placeholder={t('employeeCodePlaceholder')}
                value={form.employeeCode}
                onChange={(e) => update('employeeCode', e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className={field}>
              <Label id="languagePref-label" htmlFor="languagePref">
                {t('languageLabel')}
              </Label>
              <CustomSelect
                id="languagePref"
                ariaLabelledBy="languagePref-label"
                value={form.languagePref}
                onChange={(val) => update('languagePref', val as LanguagePref)}
                disabled={isPending}
                options={[
                  { value: 'en', label: 'English (EN)' },
                  { value: 'es', label: 'Español (ES)' },
                ]}
              />
            </div>
          </div>
        </FormSection>

        {error ? (
          <p role="alert" className="text-sm text-[var(--color-bad)]">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-6 py-4 shadow-e1 sm:px-8">
          <Button
            type="submit"
            disabled={isPending || !canSubmit}
            icon={LuUserPlus}
          >
            {isPending ? t('submitting') : t('submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-6 py-6 shadow-e1 sm:px-8 sm:py-7">
      <header className="mb-5">
        <h2 className="text-base font-semibold text-[var(--color-ink)]">{title}</h2>
        {hint ? (
          <p className="mt-1 text-sm text-[var(--color-ink-2)]">{hint}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
