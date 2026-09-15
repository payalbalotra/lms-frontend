import * as React from 'react';
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
import { StatusPill, type StatusTone } from '@/components/ui/status-pill';
import { EmployeeRowActions } from './employee-row-actions';
import type { AdminEmployee, EmployeeStatus } from '@/lib/types';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
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

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let employees: AdminEmployee[];
  try {
    const result = await listEmployees({ status }, cookieHeader);
    employees = result.employees;
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

  const statusBadge = (s: EmployeeStatus): string => {
    if (s === 'pending') return t('statusPending');
    if (s === 'active') return t('statusActive');
    return t('statusDeactivated');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.02em] text-[var(--color-ink)]">
          {t('listHeading')}
        </h1>
        <Link href={`/${locale}/admin/employees/new`}>
          <Button>{t('inviteEmployee')}</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {STATUS_VALUES.map((s) => {
          const active = s === status;
          return (
            <Link
              key={s}
              href={`/${locale}/admin/employees?status=${s}`}
              className={
                active
                  ? 'inline-flex items-center rounded-full bg-[var(--color-brand-600)] px-3 py-1 text-xs font-medium text-white'
                  : 'inline-flex items-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-panel)]'
              }
            >
              {s === 'all' ? t('filterAll') : statusBadge(s)}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          {employees.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
              {t('empty')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--color-line)] bg-[var(--color-panel)] text-left">
                  <tr>
                    <th className="px-4 py-2 font-semibold text-[var(--color-ink-2)]">{t('thName')}</th>
                    <th className="px-4 py-2 font-semibold text-[var(--color-ink-2)]">{t('thCode')}</th>
                    <th className="px-4 py-2 font-semibold text-[var(--color-ink-2)]">{t('thLocation')}</th>
                    <th className="px-4 py-2 font-semibold text-[var(--color-ink-2)]">{t('thClearance')}</th>
                    <th className="px-4 py-2 font-semibold text-[var(--color-ink-2)]">{t('thStatus')}</th>
                    <th className="px-4 py-2 font-semibold text-[var(--color-ink-2)]">{t('thActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => {
                    const tone: StatusTone =
                      e.status === 'active'
                        ? 'ok'
                        : e.status === 'pending'
                          ? 'warn'
                          : 'bad';
                    return (
                      <tr key={e.id} className="border-b border-[var(--color-line)] last:border-b-0">
                        <td className="px-4 py-2">
                          <div className="font-medium text-[var(--color-ink)]">{e.name}</div>
                          <div className="text-xs text-[var(--color-ink-3)]">
                            {e.languagePref.toUpperCase()}
                          </div>
                        </td>
                        <td className="px-4 py-2 font-mono text-[var(--color-ink-2)]">
                          {e.employeeCode ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-[var(--color-ink-2)]">
                          {e.locationName ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-[var(--color-ink-2)]">{e.clearanceLevel}</td>
                        <td className="px-4 py-2">
                          <StatusPill tone={tone}>{statusBadge(e.status)}</StatusPill>
                        </td>
                        <td className="px-4 py-2">
                          <EmployeeRowActions locale={locale} employee={e} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}