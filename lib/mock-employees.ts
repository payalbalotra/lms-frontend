'use client';

import * as React from 'react';
import type {
  AdminEmployee,
  AccessLevel,
  ClearanceLevel,
  EmployeeStatus,
  EmployeeRole,
  Role,
  Station,
} from './types';
import { listRoles, listStations, listLocations } from './api';

// ----------------------------------------------------------------------------
// Shared storage key
// ----------------------------------------------------------------------------
// The live admin store lives in `lib/api.ts` and uses the `lms_demo_` prefix
// helper — `getStored('employees_v3', …)` reads/writes `lms_demo_employees_v3`.
// We share that key so the new modal, the kebab actions, and the new invite
// form all see the same data. (Reusing the key — not a parallel `v4` store —
// is what keeps the list and detail pages coherent.)
const STORAGE_KEY = 'lms_demo_employees_v3';

/** Custom event the detail modal fires after a write so the same-tab list
 *  page refreshes without waiting for a cross-tab `storage` event. */
export const EMPLOYEES_UPDATED_EVENT = 'lms_employees_updated';

// ----------------------------------------------------------------------------
// Seed
// ----------------------------------------------------------------------------
// The 19 records match the live `SEED_EMPLOYEES` in `lib/api.ts`. We keep
// them in lockstep on the `id` and core fields so when `lib/api.ts` seeds an
// empty browser, these values land in localStorage on the next read and
// every other page that consults the store agrees.
//
// `email` is a new field on `AdminEmployee`; the live seed in `lib/api.ts`
// doesn't carry one. We backfill it here, on first read, so the new list
// and detail pages always have a value to render.
const SEED_EMPLOYEES: AdminEmployee[] = [
  {
    id: 'emp-maria', name: 'María González', locationId: 'loc-main',
    accessLevel: 'employee', roleIds: ['role-cook'], stationIds: ['stn-grill'], role: 'employee', languagePref: 'es',
    employeeCode: 'EMP-001', status: 'active',
    createdAt: '2026-01-10T00:00:00Z', deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    email: 'maria.gonzalez@almentria.mx',
    roleClearance: 'station',
  },
  {
    id: 'emp-james', name: 'James Carter', locationId: 'loc-main',
    accessLevel: 'employee', roleIds: ['role-cook', 'role-prep'], stationIds: ['stn-gm', 'stn-grill'], role: 'employee', languagePref: 'en',
    employeeCode: 'EMP-002', status: 'active',
    createdAt: '2026-01-12T00:00:00Z', deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    email: 'james.carter@almentria.mx',
    roleClearance: 'station',
  },
  {
    id: 'emp-ana', name: 'Ana Martínez', locationId: 'loc-main',
    accessLevel: 'employee', roleIds: ['role-pastry'], stationIds: ['stn-prep'], role: 'employee', languagePref: 'es',
    employeeCode: 'EMP-003', status: 'active',
    createdAt: '2026-01-15T00:00:00Z', deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    email: 'ana.martinez@almentria.mx',
    roleClearance: 'station',
  },
  {
    id: 'emp-david', name: 'David Park', locationId: 'loc-main',
    accessLevel: 'employee', roleIds: ['role-prep'], stationIds: ['stn-gm'], role: 'employee', languagePref: 'en',
    employeeCode: 'EMP-004', status: 'active',
    createdAt: '2026-01-20T00:00:00Z', deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    email: 'david.park@almentria.mx',
    roleClearance: 'station',
  },
  {
    id: 'emp-sofia', name: 'Sofía Hernández', locationId: 'loc-main',
    accessLevel: 'manager', roleIds: ['role-cook'], stationIds: ['stn-expo', 'stn-gm'], role: 'admin', languagePref: 'es',
    employeeCode: 'EMP-005', status: 'active',
    createdAt: '2026-01-05T00:00:00Z', deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    email: 'sofia.hernandez@almentria.mx',
    roleClearance: 'station',
  },
  {
    id: 'emp-lucas', name: 'Lucas Silva', locationId: 'loc-main',
    accessLevel: 'employee', roleIds: ['role-dish'], stationIds: ['stn-dish'], role: 'employee', languagePref: 'es',
    employeeCode: 'EMP-006', status: 'active',
    createdAt: '2026-01-25T00:00:00Z', deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    email: 'lucas.silva@almentria.mx',
    roleClearance: 'general',
  },
  {
    id: 'emp-priya', name: 'Priya Patel', locationId: 'loc-main',
    accessLevel: 'employee', roleIds: ['role-cook'], stationIds: ['stn-gm'], role: 'employee', languagePref: 'en',
    employeeCode: 'EMP-007', status: 'active',
    createdAt: '2026-02-01T00:00:00Z', deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    email: 'priya.patel@almentria.mx',
    roleClearance: 'station',
  },
  {
    id: 'emp-hiroshi', name: 'Hiroshi Tanaka', locationId: 'loc-main',
    accessLevel: 'employee', roleIds: ['role-pastry'], stationIds: ['stn-prep'], role: 'employee', languagePref: 'en',
    employeeCode: 'EMP-008', status: 'active',
    createdAt: '2026-02-05T00:00:00Z', deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    email: 'hiroshi.tanaka@almentria.mx',
    roleClearance: 'station',
  },
  {
    id: 'emp-carla', name: 'Carla Fernández', locationId: 'loc-main',
    accessLevel: 'employee', roleIds: ['role-prep'], stationIds: ['stn-gm'], role: 'employee', languagePref: 'es',
    employeeCode: 'EMP-009', status: 'active',
    createdAt: '2026-02-10T00:00:00Z', deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    email: 'carla.fernandez@almentria.mx',
    roleClearance: 'station',
  },
  {
    id: 'emp-admin', name: 'Chef Raúl Medina', locationId: 'loc-main',
    accessLevel: 'manager', roleIds: ['role-cook'], stationIds: ['stn-expo'], role: 'admin', languagePref: 'en',
    employeeCode: 'EMP-010', status: 'active',
    createdAt: '2026-01-10T00:00:00Z', deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    email: 'raul.medina@almentria.mx',
    roleClearance: 'master',
  },
  {
    id: 'emp-cook', name: 'Carlos Gomez', locationId: 'loc-main',
    accessLevel: 'employee', roleIds: ['role-cook'], stationIds: ['stn-grill', 'stn-gm'], role: 'employee', languagePref: 'es',
    employeeCode: 'EMP-011', status: 'active',
    createdAt: '2026-02-01T00:00:00Z', deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    email: 'carlos.gomez@almentria.mx',
    roleClearance: 'station',
  },
  {
    id: 'emp-prep', name: 'Maria Santos', locationId: 'loc-main',
    accessLevel: 'employee', roleIds: ['role-prep'], stationIds: ['stn-prep'], role: 'employee', languagePref: 'es',
    employeeCode: 'EMP-012', status: 'active',
    createdAt: '2026-02-15T00:00:00Z', deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    email: 'maria.santos@almentria.mx',
    roleClearance: 'general',
  },
  {
    id: 'emp-001', name: 'Marisol Ruiz', locationId: 'loc-main',
    accessLevel: 'employee', roleIds: ['role-prep'], stationIds: ['stn-gm'], role: 'employee', languagePref: 'es',
    employeeCode: 'EMP-013', status: 'active',
    createdAt: '2026-09-20T00:00:00Z', deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    email: 'marisol.ruiz@almentria.mx',
    roleClearance: 'general',
  },
  {
    id: 'emp-004', name: 'Hiro Watanabe', locationId: 'loc-main',
    accessLevel: 'employee', roleIds: ['role-cook'], stationIds: ['stn-grill'], role: 'employee', languagePref: 'en',
    employeeCode: 'EMP-014', status: 'active',
    createdAt: '2026-08-20T00:00:00Z', deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    email: 'hiro.watanabe@almentria.mx',
    roleClearance: 'station',
  },
  {
    id: 'emp-006', name: 'Ana López', locationId: 'loc-main',
    accessLevel: 'employee', roleIds: ['role-dish'], stationIds: ['stn-dish'], role: 'employee', languagePref: 'es',
    employeeCode: 'EMP-015', status: 'active',
    createdAt: '2026-09-21T00:00:00Z', deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    email: 'ana.lopez@almentria.mx',
    roleClearance: 'general',
  },
  {
    id: 'emp-elena', name: 'Elena Rostova', locationId: 'loc-main',
    accessLevel: 'employee', roleIds: ['role-pastry'], stationIds: ['stn-prep'], role: 'employee', languagePref: 'en',
    employeeCode: 'EMP-016', status: 'active',
    createdAt: '2026-09-22T00:00:00Z', deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    email: 'elena.rostova@almentria.mx',
    roleClearance: 'station',
  },
  {
    id: 'emp-mateo', name: 'Mateo Rossi', locationId: 'loc-main',
    accessLevel: 'employee', roleIds: ['role-cook'], stationIds: ['stn-grill'], role: 'employee', languagePref: 'en',
    employeeCode: 'EMP-017', status: 'active',
    createdAt: '2026-09-22T00:00:00Z', deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    email: 'mateo.rossi@almentria.mx',
    roleClearance: 'station',
  },
  {
    id: 'emp-chloe', name: 'Chloe Dubois', locationId: 'loc-main',
    accessLevel: 'employee', roleIds: ['role-prep'], stationIds: ['stn-gm'], role: 'employee', languagePref: 'en',
    employeeCode: 'EMP-018', status: 'active',
    createdAt: '2026-09-23T00:00:00Z', deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    email: 'chloe.dubois@almentria.mx',
    roleClearance: 'station',
  },
  {
    id: 'emp-007', name: 'Luis Ortega', locationId: 'loc-main',
    accessLevel: 'employee', roleIds: ['role-prep'], stationIds: ['stn-prep'], role: 'employee', languagePref: 'es',
    employeeCode: 'EMP-019', status: 'pending',
    createdAt: '2026-09-22T00:00:00Z', deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    email: 'luis.ortega@almentria.mx',
    roleClearance: 'general',
  },
];

// ----------------------------------------------------------------------------
// Storage helpers
// ----------------------------------------------------------------------------

function readRaw(): AdminEmployee[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as AdminEmployee[];
  } catch {
    return null;
  }
}

function writeRaw(employees: AdminEmployee[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
  } catch {
    // Ignore storage errors (quota, private mode)
  }
}

/** Read the role catalog from `lms_demo_roles_v2` synchronously. Used by
 *  the mutator to recompute the highest access tier across the new role
 *  set — same rule the create flow in `lib/api.ts → createEmployee` uses,
 *  just done from the persisted snapshot so the mutator can stay sync.
 *  Returns an empty array on the server or if the store hasn't been seeded
 *  yet; the mutator falls back to the existing tier in that case. */
function readRolesCatalog(): Array<{ id: string; clearanceLevel: string }> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('lms_demo_roles_v2');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Array<{ id: string; clearanceLevel: string }>) : [];
  } catch {
    return [];
  }
}

/** One-shot migration. Records written before this slice don't carry
 *  `email`; the list and detail pages want one. If we read a record without
 *  an email, fall back to the seed's email by id. If the id has no seed
 *  match (e.g. a row created by `lib/api.ts → createEmployee`), leave
 *  `email` null — the form will surface "—" in the list and skip the mailto
 *  link on the detail page. Re-saves once so the next read is a no-op. */
function migrate(employees: AdminEmployee[]): AdminEmployee[] {
  const seedById = new Map(SEED_EMPLOYEES.map((e) => [e.id, e] as const));
  let touched = false;
  const next = employees.map((e) => {
    if (e.email) return e;
    const seed = seedById.get(e.id);
    if (!seed?.email) return e;
    touched = true;
    return { ...e, email: seed.email };
  });
  if (touched) writeRaw(next);
  return next;
}

/** The full list, every time. SSR-safe: returns the seed on the server and
 *  on the first client render before useEffect has hydrated, so the page
 *  shell and the modal have data immediately. */
export function hydrateEmployees(): AdminEmployee[] {
  const stored = readRaw();
  if (!stored) return SEED_EMPLOYEES;
  return migrate(stored);
}

/** Same as hydrateEmployees, filtered by status. */
export function hydrateEmployeesByStatus(status: EmployeeStatus | 'all'): AdminEmployee[] {
  const all = hydrateEmployees();
  return status === 'all' ? all : all.filter((e) => e.status === status);
}

/** Look up one employee by id from the same store. */
export function getEmployeeById(id: string): AdminEmployee | undefined {
  return hydrateEmployees().find((e) => e.id === id);
}

// ----------------------------------------------------------------------------
// Mutator
// ----------------------------------------------------------------------------

export interface UpdateEmployeeRoleStationInput {
  roleIds: string[];
  stationIds: string[];
}

/** Full edit input — everything the edit modal saves in one write.
 *  Same shape as `CreateEmployeeInput` plus the fields the edit modal
 *  exposes that the invite form doesn't (none yet, but reserved). */
export interface UpdateEmployeeInput {
  name: string;
  email: string | null;
  locationId: string;
  accessLevel: AccessLevel;
  /** When the caller sets this to `'admin'` the LMS-role tier on the
   *  employee reads as Admin in the detail page; the three union
   *  members map to the 3-tier model. The persisted field is
   *  `AdminEmployee.role`; `'employee'` here means "not an admin". */
  role: EmployeeRole;
  roleIds: string[];
  stationIds: string[];
}

/** Synchronous write — the modal calls it, then closes, then the toast
 *  (a separate, later UI task) can offer Undo by calling this again with
 *  the captured prior state. The list and detail page subscribe via
 *  `useEmployees` and refresh through the storage / custom-event channels.
 *
 *  Returns the resulting record, or `null` if no employee with that id is
 *  in the store (e.g. the user opened the detail page from a stale link). */
export function updateEmployeeRoleStation(
  id: string,
  patch: UpdateEmployeeRoleStationInput,
): AdminEmployee | null {
  const employees = hydrateEmployees();
  const idx = employees.findIndex((e) => e.id === id);
  if (idx === -1) return null;

  // Highest access tier across the new role set, mirroring the rule the
  // create flow in `lib/api.ts → createEmployee` uses. Employees with no
  // roles keep their existing tier — a manager with all roles stripped
  // still reads as elevated; a line cook still reads as a station cook.
  // We only move up the ladder, never down, so the permission flags
  // downstream code already computes stay valid.
  const clearanceRank: Record<ClearanceLevel, number> = {
    general: 0,
    station: 1,
    confidential: 2,
    master: 3,
  };
  const catalog = readRolesCatalog();
  const byId = new Map(catalog.map((r) => [r.id, r.clearanceLevel] as const));
  const known: ClearanceLevel[] = ['general', 'station', 'confidential', 'master'];
  const levels: ClearanceLevel[] = patch.roleIds
    .map((rid) => byId.get(rid))
    .filter((lvl): lvl is ClearanceLevel => Boolean(lvl && (known as string[]).includes(lvl)));
  const highestAccessTier: ClearanceLevel = levels.length
    ? levels.reduce((acc, lvl) => (clearanceRank[lvl] > clearanceRank[acc] ? lvl : acc))
    : (employees[idx].roleClearance ?? 'general');

  const updated: AdminEmployee = {
    ...employees[idx],
    roleIds: [...patch.roleIds],
    stationIds: [...patch.stationIds],
    roleClearance: highestAccessTier,
  };

  const next = [...employees];
  next[idx] = updated;
  writeRaw(next);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EMPLOYEES_UPDATED_EVENT));
  }
  return updated;
}

/** Full edit mutator. Replaces name / email / location / access level /
 *  role flag / kitchen job roles / stations in one write. The location
 *  change cascades through `locationName` so the list cell renders the
 *  new label without a refetch. Recomputes the access-tier (clearance)
 *  the same way `updateEmployeeRoleStation` does. */
export function updateEmployee(
  id: string,
  patch: UpdateEmployeeInput,
): AdminEmployee | null {
  const employees = hydrateEmployees();
  const idx = employees.findIndex((e) => e.id === id);
  if (idx === -1) return null;

  // Highest access tier across the new role set. Mirrors
  // `updateEmployeeRoleStation`'s rule so the two mutators stay
  // consistent — a role change via either path produces the same tier.
  const clearanceRank: Record<ClearanceLevel, number> = {
    general: 0,
    station: 1,
    confidential: 2,
    master: 3,
  };
  const catalog = readRolesCatalog();
  const byId = new Map(catalog.map((r) => [r.id, r.clearanceLevel] as const));
  const known: ClearanceLevel[] = ['general', 'station', 'confidential', 'master'];
  const levels: ClearanceLevel[] = patch.roleIds
    .map((rid) => byId.get(rid))
    .filter((lvl): lvl is ClearanceLevel => Boolean(lvl && (known as string[]).includes(lvl)));
  const highestAccessTier: ClearanceLevel = levels.length
    ? levels.reduce((acc, lvl) => (clearanceRank[lvl] > clearanceRank[acc] ? lvl : acc))
    : (employees[idx].roleClearance ?? 'general');

  // Resolve the new location name.
  let locationName = employees[idx].locationName;
  if (patch.locationId !== employees[idx].locationId) {
    try {
      const raw = localStorage.getItem('lms_demo_locations_v1');
      if (raw) {
        const list = JSON.parse(raw) as Array<{ id: string; name: string }>;
        const match = Array.isArray(list) ? list.find((l) => l.id === patch.locationId) : null;
        if (match) locationName = match.name;
      }
    } catch {
      // Ignore — fall back to the old locationName
    }
  }

  const updated: AdminEmployee = {
    ...employees[idx],
    name: patch.name,
    email: patch.email,
    locationId: patch.locationId,
    locationName,
    accessLevel: patch.accessLevel,
    role: patch.role,
    roleIds: [...patch.roleIds],
    stationIds: [...patch.stationIds],
    roleClearance: highestAccessTier,
  };

  const next = [...employees];
  next[idx] = updated;
  writeRaw(next);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EMPLOYEES_UPDATED_EVENT));
  }
  return updated;
}

// ----------------------------------------------------------------------------
// React hook
// ----------------------------------------------------------------------------

/** Live employee list. Re-renders on:
 *  - `storage` events for the shared key (cross-tab edits — kebab
 *    deactivate in tab A flows here in tab B).
 *  - The `lms_employees_updated` custom event (same-tab fanout, so the
 *    detail modal's save refreshes the list without a full reload).
 *
 *  `initial` is what the server rendered; the first hydration replaces it
 *  on mount so the SSR shell doesn't flash an out-of-date list. */
export function useEmployees(initial: AdminEmployee[]): AdminEmployee[] {
  const [list, setList] = React.useState<AdminEmployee[]>(initial);

  React.useEffect(() => {
    // First hydration: replace the SSR snapshot with whatever the store
    // has now (the live store could have been edited in this tab between
    // the server render and the mount).
    setList(hydrateEmployees());

    const onStorage = (e: StorageEvent): void => {
      if (e.key !== STORAGE_KEY) return;
      setList(hydrateEmployees());
    };
    const onLocal = (): void => setList(hydrateEmployees());

    window.addEventListener('storage', onStorage);
    window.addEventListener(EMPLOYEES_UPDATED_EVENT, onLocal);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(EMPLOYEES_UPDATED_EVENT, onLocal);
    };
  }, []);

  return list;
}

// ----------------------------------------------------------------------------
// Picker options — the edit modal's two `MultiSelectChips` need every role
// and every station at the employee's location. We expose async loaders
// that defer to `lib/api.ts → listRoles / listStations` so the option labels
// stay sourced from the same place the rest of the admin app uses.
// ----------------------------------------------------------------------------

export async function loadRoles(): Promise<Role[]> {
  const { roles } = await listRoles();
  return roles;
}

export async function loadStationsForLocation(locationId: string): Promise<Station[]> {
  const { stations } = await listStations(locationId);
  return stations;
}

export async function loadLocations(): Promise<Array<{ id: string; name: string }>> {
  const { locations } = await listLocations();
  return locations;
}
