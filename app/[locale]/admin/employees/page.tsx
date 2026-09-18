import * as React from 'react';
import { fold } from '@/lib/utils';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { listEmployees, ApiException } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { EmployeesClientTable } from './employees-client-table';
import type { AdminEmployee, EmployeeStatus } from '@/lib/types';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; q?: string }>;
}

const STATUS_VALUES: readonly (EmployeeStatus | 'all')[] = [
  'all',
  'pending',
  'active',
  'deactivated',
];

function parseStatus(raw: string | undefined): EmployeeStatus | 'all' {
  if (raw && (STATUS_VALUES as readonly string[]).includes(raw)) {
    return raw as EmployeeStatus | 'all';
  }
  return 'all';
}

export default async function AdminEmployeesPage({
  params,
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const q = (sp.q ?? '').trim();

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let employees: AdminEmployee[];
  try {
    const result = await listEmployees({ status }, cookieHeader);
    employees = q
      ? result.employees.filter((e) => fold(`${e.name} ${e.employeeCode ?? ''}`).includes(fold(q)))
      : result.employees;
  } catch (err) {
    if (err instanceof ApiException) {
      return (
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>—</CardTitle>
          </CardHeader>
          <CardContent>
            <p role="alert" className="text-sm text-[var(--color-bad)]">
              {err.code}
            </p>
          </CardContent>
        </Card>
      );
    }
    throw err;
  }

  const t = await getTranslations('admin');

  const labels = {
    empty: t('empty'),
    thName: t('thName'),
    thCode: t('thCode'),
    thLocation: t('thLocation'),
    thClearance: t('thClearance'),
    thStatus: t('thStatus'),
    thActions: t('thActions'),
    statusPending: t('statusPending'),
    statusActive: t('statusActive'),
    statusDeactivated: t('statusDeactivated'),
  };

  const statusBadge = (s: EmployeeStatus): string => {
    if (s === 'pending') return t('statusPending');
    if (s === 'active') return t('statusActive');
    return t('statusDeactivated');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--color-ink)]">
          {t('listHeading')}
        </h1>
        <Link href={`/${locale}/admin/employees/new`}>
          <Button>{t('inviteEmployee')}</Button>
        </Link>
      </div>

      {q ? (
        <p className="flex flex-wrap items-center gap-2 text-base text-[var(--color-ink-2)]">
          {t('filteredBy', { q })}
          <Link
            href={`/${locale}/admin/employees?status=${status}`}
            className="font-semibold text-[var(--color-brand-700)] underline-offset-2 hover:underline"
          >
            {t('clearFilter')}
          </Link>
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 text-sm">
        {STATUS_VALUES.map((s) => {
          const active = s === status;
          return (
            <Link
              key={s}
              href={`/${locale}/admin/employees?status=${s}`}
              className={
                active
                  ? 'inline-flex items-center rounded-full bg-[var(--color-ink)] px-3 py-1 text-xs font-medium text-white'
                  : 'inline-flex items-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-panel)]'
              }
            >
              {s === 'all' ? t('filterAll') : statusBadge(s)}
            </Link>
          );
        })}
      </div>

      <EmployeesClientTable
        initialEmployees={employees}
        statusFilter={status}
        searchQuery={q}
        locale={locale}
        labels={labels}
      />
    </div>
  );
}