'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createEmployee, ApiException } from '@/lib/api';
import type {
  ClearanceLevel,
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
  initialStations: Station[];
}

interface FormState {
  name: string;
  locationId: string;
  roleId: string;
  stationId: string;
  clearanceLevel: ClearanceLevel;
  employeeCode: string;
  languagePref: LanguagePref;
}

const initialState = (defaultLocationId: string): FormState => ({
  name: '',
  locationId: defaultLocationId,
  roleId: '',
  stationId: '',
  clearanceLevel: 'general',
  employeeCode: '',
  languagePref: 'en',
});

export function NewEmployeeForm({
  locale,
  locations,
  roles,
  initialStations,
}: NewEmployeeFormProps): React.ReactElement {
  const t = useTranslations('admin');
  const defaultLocationId = locations[0]?.id ?? 'loc-main';

  const [form, setForm] = useState<FormState>(initialState(defaultLocationId));
  const [stations, setStations] = useState<Station[]>(initialStations);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ employee: Employee; invite: InviteResult } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function loadStations(locationId: string): Promise<void> {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000'}/api/admin/employees/stations?locationId=${encodeURIComponent(locationId)}`,
        { credentials: 'include' },
      );
      if (res.ok) {
        const data = (await res.json()) as { stations: Station[] };
        setStations(data.stations);
      } else {
        setStations([]);
      }
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
          locationId: form.locationId,
          roleId: form.roleId,
          stationId: form.stationId || null,
          clearanceLevel: form.clearanceLevel,
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

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>{t('newHeading')}</CardTitle>
        <CardDescription>{t('newDescription')}</CardDescription>
      </CardHeader>

      <form onSubmit={onSubmit} noValidate>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
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

          <div className="grid gap-2">
            <Label htmlFor="locationId">{t('locationLabel')}</Label>
            <select
              id="locationId"
              required
              value={form.locationId}
              onChange={(e) => onLocationChange(e.target.value)}
              disabled={isPending || locations.length === 1}
              className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="roleId">{t('roleLabel')}</Label>
            <select
              id="roleId"
              required
              value={form.roleId}
              onChange={(e) => update('roleId', e.target.value)}
              disabled={isPending}
              className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.clearanceLevel})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stationId">{t('stationLabel')}</Label>
            <select
              id="stationId"
              value={form.stationId}
              onChange={(e) => update('stationId', e.target.value)}
              disabled={isPending}
              className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            >
              <option value="">— none —</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.id}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="clearanceLevel">{t('clearanceLabel')}</Label>
            <select
              id="clearanceLevel"
              required
              value={form.clearanceLevel}
              onChange={(e) => update('clearanceLevel', e.target.value as ClearanceLevel)}
              disabled={isPending}
              className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            >
              <option value="general">general</option>
              <option value="station">station</option>
              <option value="confidential">confidential</option>
              <option value="master">master</option>
            </select>
          </div>

          <div className="grid gap-2">
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

          <div className="grid gap-2">
            <Label htmlFor="languagePref">{t('languageLabel')}</Label>
            <select
              id="languagePref"
              value={form.languagePref}
              onChange={(e) => update('languagePref', e.target.value as LanguagePref)}
              disabled={isPending}
              className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            >
              <option value="en">English (en)</option>
              <option value="es">Español (es)</option>
            </select>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : null}
        </CardContent>

        <div className="flex justify-end gap-2 p-6 pt-0">
          <Button type="submit" disabled={isPending || !form.name || !form.roleId}>
            {isPending ? t('submitting') : t('submit')}
          </Button>
        </div>
      </form>
    </Card>
  );
}