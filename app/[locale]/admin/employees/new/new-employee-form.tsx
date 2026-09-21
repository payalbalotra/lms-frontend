'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomSelect } from '@/components/ui/custom-select';
import { PageHeader } from '@/components/admin/page-header';
import { LuUserPlus } from 'react-icons/lu';
import { createEmployee, listStations, ApiException } from '@/lib/api';
import type {
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
  roleId: string;
  stationId: string;
  employeeCode: string;
  languagePref: LanguagePref;
}

const initialState = (defaultLocationId: string): FormState => ({
  name: '',
  email: '',
  locationId: defaultLocationId,
  roleId: '',
  stationId: '',
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
    update('locationId', newLocationId);
    update('stationId', '');
    void loadStations(newLocationId);
  }

  function reset(): void {
    setForm(initialState(defaultLocationId));
    void loadStations(defaultLocationId);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const res = await createEmployee({
          name: form.name.trim(),
          email: form.email.trim() || null,
          locationId: form.locationId,
          roleId: form.roleId,
          stationId: form.stationId || null,
          clearanceLevel: 'general',
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

  return (
    <div className="mx-auto max-w-page space-y-6">
      <PageHeader
        title={t('newHeading')}
        subtitle={t('newDescription')}
        actions={
          <Link href={`/${locale}/admin/employees`}>
            <Button type="button" variant="ghost">
              {t('cancel')}
            </Button>
          </Link>
        }
      />

      <form onSubmit={onSubmit} noValidate>
        <div className="space-y-6 rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-6">
          {/* Three to a row at the page width: the six fields are short, and a
              two-column grid in a 560px card truncated the location name. */}
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

            <div className={field}>
              <Label id="roleId-label" htmlFor="roleId">
                {t('roleLabel')}
              </Label>
              <CustomSelect
                id="roleId"
                ariaLabelledBy="roleId-label"
                value={form.roleId}
                onChange={(val) => update('roleId', val)}
                disabled={isPending}
                placeholder={t('selectRolePrompt')}
                options={roles.map((r) => ({ value: r.id, label: `${r.name} (${r.clearanceLevel})` }))}
              />
            </div>

            <div className={field}>
              <Label id="stationId-label" htmlFor="stationId">
                {t('stationLabel')}
              </Label>
              <CustomSelect
                id="stationId"
                ariaLabelledBy="stationId-label"
                value={form.stationId}
                onChange={(val) => update('stationId', val)}
                disabled={isPending}
                placeholder={t('selectNone')}
                options={[
                  { value: '', label: t('selectNone') },
                  ...stations.map((st) => ({ value: st.id, label: st.name || t('selectPlaceholder') })),
                ]}
              />
            </div>

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

          {error ? (
            <p role="alert" className="text-sm text-[var(--color-bad)]">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end border-t border-[var(--color-line)] pt-4">
            <Button type="submit" disabled={isPending || !form.name || !form.roleId} icon={LuUserPlus}>
              {isPending ? t('submitting') : t('submit')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
