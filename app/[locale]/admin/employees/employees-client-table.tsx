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
            <table className="atable">
              {/* A rule and a quieter ink: the head names the columns, it does
                  not compete with the names under it. The last column's label is
                  read aloud but not drawn — a heading over a menu button is a
                  word doing no work. */}
              <thead>
                <tr>
                  <th>{labels.thName}</th>
                  <th>{labels.thCode}</th>
                  <th>{labels.thLocation}</th>
                  <th>{labels.thClearance}</th>
                  <th>{labels.thStatus}</th>
                  <th>
                    <span className="sr-only">{labels.thActions}</span>
                  </th>
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
                    <tr key={e.id}>
                      <td>
                        <div className="font-medium text-[var(--color-ink)]">{e.name}</div>
                        <div className="text-sm text-[var(--color-ink-3)]">
                          {e.languagePref.toUpperCase()}
                        </div>
                      </td>
                      <td className="font-mono text-[var(--color-ink-2)]">
                        {e.employeeCode ?? '—'}
                      </td>
                      <td className="text-[var(--color-ink-2)]">
                        {e.locationName ?? '—'}
                      </td>
                      <td className="text-[var(--color-ink-2)]">{e.clearanceLevel}</td>
                      <td>
                        <StatusPill tone={tone}>{statusBadge(e.status)}</StatusPill>
                      </td>
                      <td>
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
