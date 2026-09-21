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
import { PageHeader } from '@/components/admin/page-header';
import { FilterChips } from '@/components/ui/filter-chips';
import { LuPlus } from 'react-icons/lu';

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
        <Card className="mx-auto max-w-narrow">
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
    <div className="mx-auto max-w-page space-y-6">
      <PageHeader
        title={t('listHeading')}
        subtitle={t('peopleSubtitle')}
        actions={
          <Link href={`/${locale}/admin/employees/new`}>
            <Button icon={LuPlus}>{t('inviteEmployee')}</Button>
          </Link>
        }
      />

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

      <FilterChips
        label={locale === 'es' ? 'Estado' : 'Status'}
        value={status}
        chips={STATUS_VALUES.map((s) => ({
          value: s,
          label: s === 'all' ? t('filterAll') : statusBadge(s),
          href: `/${locale}/admin/employees?status=${s}`,
        }))}
      />

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