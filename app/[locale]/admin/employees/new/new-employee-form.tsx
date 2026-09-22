'use client';

import * as React from 'react';
import { useState, useTransition, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomSelect } from '@/components/ui/custom-select';
import { MultiSelectChips } from '@/components/ui/multi-select-chips';
import { PageHeader } from '@/components/admin/page-header';
import { LuUserPlus } from 'react-icons/lu';
import { createEmployee, listStations, ApiException } from '@/lib/api';
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
  locations,
  roles,
}: NewEmployeeFormProps): React.ReactElement {
  const t = useTranslations('admin');
  const defaultLocationId = locations[0]?.id ?? '';

  const [form, setForm] = useState<FormState>(initialState(defaultLocationId));
  const [stations, setStations] = useState<Station[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ employee: Employee; invite: InviteResult } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Initial station load for the default location.
  React.useEffect(() => {
    if (defaultLocationId) {
      void loadStations(defaultLocationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStations(locationId: string): Promise<void> {
    try {
      const data = await listStations(locationId);
      setStations(data.stations);
    } catch {
      setStations([]);
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onLocationChange(newLocationId: string): void {
    setForm((f) => ({ ...f, locationId: newLocationId, stationIds: [] }));
    void loadStations(newLocationId);
  }

  // The dependency flow per the new hierarchy:
  //   job role(s) ──► station(s)
  // Job roles are sourced from `Role` (settings → roles). Stations are
  // scoped to the selected location. Today there's no job-role→station
  // mapping table, so all stations at the location are valid candidates
  // once at least one job role is picked — the filter is just "are there
  // any job roles selected?". When the junction data lands the picker
  // can swap in a derived filter without touching the form.
  const availableStations = useMemo<Station[]>(() => {
    if (form.roleIds.length === 0) return [];
    return stations;
  }, [form.roleIds.length, stations]);

  const stationsBlockedReason = useMemo<string | undefined>(() => {
    if (form.roleIds.length === 0) return t('stationsEmpty');
    if (stations.length === 0) return t('stationsEmptyForLocation');
    return undefined;
  }, [form.roleIds.length, stations.length, t]);

  // Preserve already-selected stations only if they remain valid for the
  // current location + role-set. Drop everything else so the submit
  // payload never contains an orphan id.
  function setRoleIds(next: string[]): void {
    const stillValidStations = form.stationIds.filter((id) =>
      stations.some((s) => s.id === id),
    );
    setForm((f) => ({
      ...f,
      roleIds: next,
      stationIds: stillValidStations,
    }));
  }

  function setStationIds(next: string[]): void {
    update('stationIds', next);
  }

  function reset(): void {
    setForm(initialState(defaultLocationId));
    setError(null);
    void loadStations(defaultLocationId);
  }

  function validate(): string | null {
    if (!form.name.trim()) return t('errorNeedName');
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
                disabled={isPending || locations.length === 1}
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
                        onChange={() => update('accessLevel', level)}
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

            <div className="grid gap-5 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <MultiSelectChips
                  id="jobRoles"
                  label={t('jobRolesLabel')}
                  hint={t('jobRolesHint')}
                  value={form.roleIds}
                  onChange={setRoleIds}
                  options={roles.map((r) => ({ value: r.id, label: r.name }))}
                  disabled={isPending}
                  addLabel={t('jobRolesAdd')}
                  emptyText={t('jobRolesPrompt')}
                />
              </div>

              <div className="lg:col-span-7">
                <MultiSelectChips
                  id="stations"
                  label={t('stationsLabel')}
                  hint={t('stationsHint')}
                  value={form.stationIds}
                  onChange={setStationIds}
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

/**
 * A bordered surface for one form section. One section per concern —
 * Employee details / Access & job assignment / Additional details — so the
 * scanning order matches the conceptual hierarchy the manager is following.
 *
 * Card shape follows DESIGN.md §3.4 (12 px radius, 1.6 px hairline, white
 * on the near-neutral admin ground). Padding matches the rest of the admin
 * form surface so no section reads as more "indented" than another, and the
 * heading is 16 px / weight 600 to sit between the page subtitle and the
 * field labels.
 */
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
