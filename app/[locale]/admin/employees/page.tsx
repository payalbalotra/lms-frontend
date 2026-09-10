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
            <p role="alert" className="text-sm text-red-600">
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('listHeading')}</h1>
        <Link href={`/${locale}/admin/employees/new`}>
          <Button>{t('inviteEmployee')}</Button>
        </Link>
      </div>

      <div className="flex gap-2 text-sm">
        {STATUS_VALUES.map((s) => (
          <Link
            key={s}
            href={`/${locale}/admin/employees?status=${s}`}
            className={
              s === status
                ? 'rounded-full bg-[var(--color-primary)] px-3 py-1 text-[var(--color-primary-foreground)]'
                : 'rounded-full border border-[var(--color-border)] px-3 py-1 hover:bg-[var(--color-muted)]'
            }
          >
            {s === 'all' ? t('filterAll') : statusBadge(s)}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {employees.length === 0 ? (
            <p className="p-6 text-center text-sm text-[var(--color-muted-foreground)]">
              {t('empty')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--color-border)] bg-[var(--color-muted)] text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t('thName')}</th>
                    <th className="px-3 py-2 font-medium">{t('thCode')}</th>
                    <th className="px-3 py-2 font-medium">{t('thLocation')}</th>
                    <th className="px-3 py-2 font-medium">{t('thClearance')}</th>
                    <th className="px-3 py-2 font-medium">{t('thStatus')}</th>
                    <th className="px-3 py-2 font-medium">{t('thActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => (
                    <tr key={e.id} className="border-b border-[var(--color-border)] last:border-b-0">
                      <td className="px-3 py-2">
                        <div className="font-medium">{e.name}</div>
                        <div className="text-xs text-[var(--color-muted-foreground)]">
                          {e.languagePref.toUpperCase()}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono">{e.employeeCode ?? '—'}</td>
                      <td className="px-3 py-2">{e.locationName ?? e.locationId}</td>
                      <td className="px-3 py-2">{e.clearanceLevel}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            e.status === 'active'
                              ? 'inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800'
                              : e.status === 'pending'
                                ? 'inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800'
                                : 'inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800'
                          }
                        >
                          {statusBadge(e.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <EmployeeRowActions locale={locale} employee={e} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}