'use client';

import * as React from 'react';
import { listEmployees } from '@/lib/api';
import type { AdminEmployee, EmployeeStatus } from '@/lib/types';
import { StatusPill, type StatusTone } from '@/components/ui/status-pill';
import { EmployeeRowActions } from './employee-row-actions';
import { Card, CardContent } from '@/components/ui/card';

interface EmployeesClientTableProps {
  initialEmployees: AdminEmployee[];
  statusFilter: EmployeeStatus | 'all';
  searchQuery: string;
  locale: string;
  labels: {
    empty: string;
    thName: string;
    thCode: string;
    thLocation: string;
    thClearance: string;
    thStatus: string;
    thActions: string;
    statusPending: string;
    statusActive: string;
    statusDeactivated: string;
  };
}

export function EmployeesClientTable({
  initialEmployees,
  statusFilter,
  searchQuery,
  locale,
  labels,
}: EmployeesClientTableProps): React.ReactElement {
  const [employees, setEmployees] = React.useState<AdminEmployee[]>(initialEmployees);

  React.useEffect(() => {
    let isMounted = true;
    async function syncEmployees() {
      try {
        const res = await listEmployees({ status: statusFilter });
        if (isMounted && res.employees) {
          let list = res.employees;
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((e) =>
              `${e.name} ${e.employeeCode ?? ''}`.toLowerCase().includes(q),
            );
          }
          setEmployees(list);
        }
      } catch {
        // Fallback
      }
    }
    syncEmployees();

    window.addEventListener('storage', syncEmployees);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', syncEmployees);
    };
  }, [statusFilter, searchQuery]);

  const statusBadge = (s: EmployeeStatus): string => {
    if (s === 'pending') return labels.statusPending;
    if (s === 'active') return labels.statusActive;
    return labels.statusDeactivated;
  };

  return (
    <Card>
      <CardContent className="p-0">
        {employees.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
            {labels.empty}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--color-line)] bg-[var(--color-panel)] text-left">
                <tr>
                  <th className="px-4 py-2 font-semibold text-[var(--color-ink-2)]">{labels.thName}</th>
                  <th className="px-4 py-2 font-semibold text-[var(--color-ink-2)]">{labels.thCode}</th>
                  <th className="px-4 py-2 font-semibold text-[var(--color-ink-2)]">{labels.thLocation}</th>
                  <th className="px-4 py-2 font-semibold text-[var(--color-ink-2)]">{labels.thClearance}</th>
                  <th className="px-4 py-2 font-semibold text-[var(--color-ink-2)]">{labels.thStatus}</th>
                  <th className="px-4 py-2 font-semibold text-[var(--color-ink-2)]">{labels.thActions}</th>
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
  );
}
