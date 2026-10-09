'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  AdminEmployee,
  EmployeeStatus,
  Role,
  Station,
  TrainingAssignmentRow,
} from '@/lib/types';
import { StatusPill, type StatusTone } from '@/components/ui/status-pill';
import { Avatar } from '@/components/ui/avatar';
import { TrainingSummary } from '@/components/admin/training-summary';
import { EmployeeRowActions } from './employee-row-actions';
import { EditRolesModal } from './[id]/edit-roles-modal';
import { Card, CardContent } from '@/components/ui/card';
import { getTrainingRowsForEmployee } from '@/lib/mock-training';
import { fetchRoles } from '@/services/jobs/api';
import { fetchLocations } from '@/services/locations/api';
import { fetchStations } from '@/services/stations/api';
import type { UpdateEmployeeInput } from '@/lib/mock-employees';
import { fold } from '@/lib/utils';

interface EmployeesClientTableProps {
  initialEmployees: AdminEmployee[];
  statusFilter: EmployeeStatus | 'all';
  searchQuery: string;
  locale: string;
  /** Pre-resolved lookups for the role / station label cells. The server
   *  page passes these so the table can render the cells without an
   *  extra round-trip; the client only needs them for the visible rows. */
  roles: Role[];
  stations: Station[];
  labels: {
    empty: string;
    thEmployee: string;
    thJobRole: string;
    thStation: string;
    thTraining: string;
    thStatus: string;
    thActions: string;
    statusPending: string;
    statusActive: string;
    statusDeactivated: string;
    jobRolesEmpty: string;
    stationsEmpty: string;
    emailMissing: string;
  };
}

export function EmployeesClientTable({
  initialEmployees,
  statusFilter,
  searchQuery,
  locale,
  roles,
  stations,
  labels,
}: EmployeesClientTableProps): React.ReactElement {
  const router = useRouter();

  const [employees, setEmployees] = useState<AdminEmployee[]>(initialEmployees);

  React.useEffect(() => {
    setEmployees(initialEmployees);
  }, [initialEmployees]);

  // In-place edit modal. The kebab's Edit item calls `openEdit(employee)`
  // instead of navigating to the detail page — so the user can edit
  // without losing the list (and without paying a full route change).
  // Roles/stations seed from the server page props (already fetched for the
  // table cells), so opening the modal usually costs ONE request —
  // locations + this employee's stations resolve together.
  const [editing, setEditing] = useState<AdminEmployee | null>(null);
  const [editRoles, setEditRoles] = useState<Role[]>(roles);
  const [editLocations, setEditLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [editStations, setEditStations] = useState<Station[]>(stations);

  React.useEffect(() => {
    setEditRoles((prev) => (prev.length === 0 ? roles : prev));
  }, [roles]);
  React.useEffect(() => {
    setEditStations((prev) => (prev.length === 0 ? stations : prev));
  }, [stations]);

  async function openEdit(employee: AdminEmployee): Promise<void> {
    setEditing(employee);
    const needRoles = editRoles.length === 0;
    const needLocations = editLocations.length === 0;
    const [rolesRes, locationsRes, stationsRes] = await Promise.all([
      needRoles
        ? fetchRoles().then(
            (r) => ({ ok: true as const, roles: r.roles }),
            () => ({ ok: false as const, roles: [] as Role[] }),
          )
        : Promise.resolve({ ok: true as const, roles: editRoles }),
      needLocations
        ? fetchLocations().then(
            (l) => ({ ok: true as const, locations: l.locations }),
            () => ({ ok: false as const, locations: [] as Array<{ id: string; name: string }> }),
          )
        : Promise.resolve({ ok: true as const, locations: editLocations }),
      fetchStations({ locationId: employee.locationId }).then(
        (s) => ({ ok: true as const, stations: s.stations }),
        () => ({ ok: false as const, stations: [] as Station[] }),
      ),
    ]);
    if (needRoles) setEditRoles(rolesRes.roles);
    if (needLocations) setEditLocations(locationsRes.locations);
    setEditStations(stationsRes.stations);
  }

  async function onModalLocationChange(locationId: string): Promise<void> {
    try {
      const { stations: s } = await fetchStations({ locationId });
      setEditStations(s);
    } catch {
      setEditStations([]);
    }
  }

  function onModalSaved(next: AdminEmployee, _prior: UpdateEmployeeInput): void {
    setEmployees((prev) =>
      prev.map((e) => (e.id === next.id ? { ...e, ...next } : e)),
    );
    setEditing(null);
    router.refresh();
  }

  // Filter the live list on the client so the chip / search changes
  // reflect in the same render frame. Server already filtered by status
  // for the initial render; client reapplies on every refresh.
  //
  // After filtering, sort so anyone with training assigned rises to the
  // top — this is the People triage screen, and the people who need the
  // admin's eye are the ones already on a training clock. Ties keep their
  // existing order (Array#sort is stable) so a manager who just opened
  // the page doesn't see the list shuffle within the same group.
  const visible = React.useMemo<AdminEmployee[]>(() => {
    const byStatus =
      statusFilter === 'all'
        ? employees
        : employees.filter((e) => e.status === statusFilter);
    const bySearch = searchQuery.trim()
      ? (() => {
          const q = fold(searchQuery);
          return byStatus.filter(
            (e) =>
              fold(e.name).includes(q) ||
              fold(e.employeeCode ?? '').includes(q) ||
              fold(e.email ?? '').includes(q),
          );
        })()
      : byStatus;
    return [...bySearch].sort((a, b) => {
      const aHas = getTrainingRowsForEmployee(a.id).length > 0 ? 0 : 1;
      const bHas = getTrainingRowsForEmployee(b.id).length > 0 ? 0 : 1;
      return aHas - bHas;
    });
  }, [employees, statusFilter, searchQuery]);

  // Lookup maps for the role/station cells. The whole catalog is small and
  // stable for the lifetime of the page, so we pay the map cost once.
  const roleLabel = React.useMemo(
    () => new Map(roles.map((r) => [r.id, r.name] as const)),
    [roles],
  );
  const stationLabel = React.useMemo(
    () => new Map(stations.map((s) => [s.id, s.name] as const)),
    [stations],
  );

  const statusBadge = (s: EmployeeStatus): string => {
    if (s === 'pending') return labels.statusPending;
    if (s === 'active') return labels.statusActive;
    return labels.statusDeactivated;
  };

  /** Whole-row navigation. Click anywhere on the row to open the detail
   *  page; the kebab cell calls `stopPropagation` so its menu still opens
   *  independently. Enter / Space activate the row when focused. */
  function openRow(id: string): void {
    router.push(`/${locale}/admin/employees/${id}`);
  }

  return (
    <>
    <Card>
      <CardContent className="p-0">
        {visible.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
            {labels.empty}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="atable">
              {/* Column order, from left to right: identity (avatar + name
                  + email), job role(s), station(s), training count, status,
                  actions. Code / location / raw tier-as-text are gone —
                  the code is duplicated by the email, the location is
                  implicit in the stations, and the tier badge didn't fit
                  at this density. Job roles and stations render as plain
                  text (comma-separated when multiple) rather than chips —
                  chips added visual weight that the eye scans as
                  decoration, not data; text reads as data. */}
              <thead>
                <tr>
                  <th>{labels.thEmployee}</th>
                  <th>{labels.thJobRole}</th>
                  <th>{labels.thStation}</th>
                  <th>{labels.thTraining}</th>
                  <th>{labels.thStatus}</th>
                  <th>
                    <span className="sr-only">{labels.thActions}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((e) => {
                  const tone: StatusTone =
                    e.status === 'active'
                      ? 'ok'
                      : e.status === 'pending'
                        ? 'warn'
                        : 'bad';

                  // Role / station labels, in the order the employee has
                  // them. Unknown ids are dropped (a station could be
                  // archived out from under a row). Multiple values join
                  // with ", " — chips would add a `--panel-2` ground that
                  // competes with the avatar's ground at this density.
                  const roleLabels = (e.roleIds ?? (e as any).jobIds ?? [])
                    .map((id: string) => roleLabel.get(id))
                    .filter((s: string | undefined): s is string => Boolean(s));
                  const stationLabels = (e.stationIds ?? [])
                    .map((id: string) => stationLabel.get(id))
                    .filter((s: string | undefined): s is string => Boolean(s));

                  // Training rows for this employee. `getTrainingRowsForEmployee`
                  // is a pure selector over the mock training store; calling
                  // it on every render is fine for 19 rows.
                  const trainingRows: TrainingAssignmentRow[] =
                    getTrainingRowsForEmployee(e.id);

                  return (
                    <tr
                      key={e.id}
                      role="link"
                      tabIndex={0}
                      aria-label={e.name}
                      onClick={() => openRow(e.id)}
                      onKeyDown={(ev) => {
                        // Skip when the user pressed Enter/Space inside an
                        // interactive element inside the row — e.g. the
                        // kebab trigger — so its native activation wins.
                        const target = ev.target as HTMLElement | null;
                        if (target?.closest('button, a, input, select, textarea')) return;
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault();
                          openRow(e.id);
                        }
                      }}
                      className="cursor-pointer transition-colors hover:bg-[var(--color-panel)] focus-visible:bg-[var(--color-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand-600)]"
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar initials={initials(e.name)} size="sm" />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-[var(--color-ink)]">
                              {e.name}
                            </div>
                            <div className="truncate text-sm text-[var(--color-ink-3)]">
                              {e.email || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm text-[var(--color-ink-2)]">
                        {roleLabels.length > 0 ? roleLabels.join(', ') : '—'}
                      </td>
                      <td className="text-sm text-[var(--color-ink-2)]">
                        {stationLabels.length > 0 ? stationLabels.join(', ') : '—'}
                      </td>
                      <td>
                        <TrainingSummary rows={trainingRows} />
                      </td>
                      <td>
                        <StatusPill tone={tone}>{statusBadge(e.status)}</StatusPill>
                      </td>
                      <td onClick={(ev) => ev.stopPropagation()}>
                        <EmployeeRowActions
                          locale={locale}
                          employee={e}
                          onEdit={() => void openEdit(e)}
                        />
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
    {/* In-place edit modal. Mounted at the table level so the kebab Edit
        can open it without a route change. The list re-renders off the
        same `lms_employees_updated` event the modal dispatches on save,
        so the row reflects the new state without `router.refresh`. */}
    {editing ? (
      <EditRolesModal
        open
        onClose={() => setEditing(null)}
        employee={editing}
        roles={editRoles}
        locations={editLocations}
        stations={editStations}
        onLocationChange={onModalLocationChange}
        onSaved={onModalSaved}
      />
    ) : null}
    </>
  );
}

/** First letter of the first two words, uppercase. "María González" → "MG".
 *  Diacritics kept (the design system uses DM Sans which has them) and a
 *  hyphenated surname counts as one word: "Hiro Watanabe" → "HW". A
 *  single-word name returns the first letter. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((w) => w.charAt(0).toUpperCase()).join('') || '?';
}
