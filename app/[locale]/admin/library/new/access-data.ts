/**
 * Demo data for the Access step on the new-procedure wizard.
 *
 * Lives in its own file so the Access screen component can be merged into
 * the wizard without touching any other wizard code. The lists are not
 * persisted — the screen is presentational only.
 */

import type { Category, Subcategory } from '@/lib/types';

export interface AccessOption {
  id: string;
  label: string;
  sub: string;
  icon: string;
}

export interface EmployeeOption {
  id: string;
  name: string;
  initials: string;
  role: string;
  station: string;
}

/**
 * Map a Category to the AccessOption shape used by AccessBlock. Keeps the
 * bilingual label and surfaces the subcategory count in `sub` so the
 * manager sees how granular the category is.
 */
export function categoryToAccessOption(c: Category, isEs: boolean): AccessOption {
  const count = c.subcategories?.length ?? 0;
  const label = isEs ? c.nameEs : c.nameEn;
  return {
    id: c.id,
    label,
    sub: `${count} ${isEs ? (count === 1 ? 'subcategoría' : 'subcategorías') : count === 1 ? 'subcategory' : 'subcategories'}`,
    icon: c.icon ?? 'ri-folder-line',
  };
}

/**
 * Map a Subcategory to an AccessOption. The label is bilingual and the
 * `sub` line names the parent category so a subcategory never floats
 * without context.
 */
export function subcategoryToAccessOption(s: Subcategory, parent: Category, isEs: boolean): AccessOption {
  const label = isEs ? s.nameEs : s.nameEn;
  const parentLabel = isEs ? parent.nameEs : parent.nameEn;
  return {
    id: s.id,
    label,
    sub: parentLabel,
    icon: 'ri-stack-line',
  };
}

/** Single restaurant at launch. Add entries here when a second location
 *  goes live — the dropdown stays in place and the form-level auto-select
 *  effect becomes a no-op once the list has more than one entry. */
export const ACCESS_LOCATIONS: AccessOption[] = [
  { id: 'loc-main', label: 'Alimentaria Mexicana — Main', sub: '5 stations · 22 staff', icon: 'ri-store-2-line' },
];

/** Platform tier — what a person can do in the LMS (manager or employee).
 *  Single-select: the two tiers are mutually exclusive on a person.
 *  Admin is intentionally absent (admin bypass is applied downstream). */
export const ACCESS_TIER_ROLES: AccessOption[] = [
  { id: 'role-manager', label: 'Manager / Head Chef', sub: 'Team & content access', icon: 'ri-user-star-line' },
  { id: 'role-employee', label: 'Employee', sub: 'Assigned content & training access', icon: 'ri-team-line' },
];

/** Kitchen job roles — what a person does. Multi-select: a person can
 *  hold several (line cook + prep cook across shifts). */
export const ACCESS_JOB_ROLES: AccessOption[] = [
  { id: 'job-line-cook', label: 'Line Cook', sub: 'Station-bound, certified by station', icon: 'ri-knife-line' },
  { id: 'job-prep-cook', label: 'Prep Cook', sub: 'Cold prep, dry storage, basics', icon: 'ri-restaurant-line' },
  { id: 'job-pastry', label: 'Pastry Chef', sub: 'Pastry kitchen + dessert station', icon: 'ri-cake-3-line' },
  { id: 'job-sous-chef', label: 'Sous Chef', sub: 'Second-in-command, station oversight', icon: 'ri-shield-star-line' },
  { id: 'job-dishwasher', label: 'Dishwasher / Porter', sub: 'Closing + sanitation', icon: 'ri-sparkling-2-line' },
  { id: 'job-pantry', label: 'Pantry Cook', sub: 'Cold section, salads, dressings', icon: 'ri-leaf-line' },
  { id: 'job-grill-cook', label: 'Grill Cook', sub: 'Hot line, high-heat station', icon: 'ri-fire-line' },
];

/** Mirrors §03 Content Taxonomy → Stations in PROJECT_OVERVIEW.md. The
 *  "All stations" shortcut on the Access step only renders when this list
 *  has more than one entry. */
export const ACCESS_STATIONS: AccessOption[] = [
  { id: 'st-gm', label: 'GM', sub: 'Cold section & pantry', icon: 'ri-snowflake-line' },
  { id: 'st-grill', label: 'Grill', sub: 'Hot line · high heat', icon: 'ri-fire-line' },
  { id: 'st-expo', label: 'Expo', sub: 'Pass / plating', icon: 'ri-arrow-left-right-line' },
  { id: 'st-prep', label: 'Prep Kitchen', sub: 'Cold prep & dry storage', icon: 'ri-knife-line' },
  { id: 'st-dish', label: 'Dishwasher', sub: 'Closing & sanitation', icon: 'ri-sparkling-2-line' },
];

/** Demo roster — 18 people. The "Show more" toggle only renders when the
 *  filtered count exceeds the visible cap. */
export const ACCESS_EMPLOYEES: EmployeeOption[] = [
  { id: 'emp-001', name: 'María González', initials: 'MG', role: 'Line Cook', station: 'Grill' },
  { id: 'emp-002', name: 'James Carter', initials: 'JC', role: 'Line Cook', station: 'GM' },
  { id: 'emp-003', name: 'Ana Martínez', initials: 'AM', role: 'Pastry Chef', station: 'Prep Kitchen' },
  { id: 'emp-004', name: 'David Park', initials: 'DP', role: 'Prep Cook', station: 'GM' },
  { id: 'emp-005', name: 'Sofía Hernández', initials: 'SH', role: 'Head Chef', station: 'Expo' },
  { id: 'emp-006', name: 'Lucas Silva', initials: 'LS', role: 'Dishwasher', station: 'Dishwasher' },
  { id: 'emp-007', name: 'Priya Patel', initials: 'PP', role: 'Line Cook', station: 'GM' },
  { id: 'emp-008', name: 'Hiroshi Tanaka', initials: 'HT', role: 'Pastry Chef', station: 'Prep Kitchen' },
  { id: 'emp-009', name: 'Carla Fernández', initials: 'CF', role: 'Prep Cook', station: 'GM' },
  { id: 'emp-010', name: 'Noah Williams', initials: 'NW', role: 'Line Cook', station: 'Grill' },
  { id: 'emp-011', name: 'Tomas Novak', initials: 'TN', role: 'Sous Chef', station: 'Expo' },
  { id: 'emp-012', name: 'Aisha Khan', initials: 'AK', role: 'Line Cook', station: 'Grill' },
  { id: 'emp-013', name: 'Diego Romero', initials: 'DR', role: 'Pantry Cook', station: 'GM' },
  { id: 'emp-014', name: 'Yuki Sato', initials: 'YS', role: 'Pastry Chef', station: 'Prep Kitchen' },
  { id: 'emp-015', name: 'Olivia Brown', initials: 'OB', role: 'Prep Cook', station: 'GM' },
  { id: 'emp-016', name: 'Mateo Alvarez', initials: 'MA', role: 'Line Cook', station: 'GM' },
  { id: 'emp-017', name: 'Leila Rahman', initials: 'LR', role: 'Dishwasher', station: 'Dishwasher' },
  { id: 'emp-018', name: 'Ethan Wright', initials: 'EW', role: 'Sous Chef', station: 'Expo' },
];

export function filterEmployees(query: string): EmployeeOption[] {
  const q = query.toLowerCase().trim();
  if (!q) return ACCESS_EMPLOYEES;
  return ACCESS_EMPLOYEES.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.role.toLowerCase().includes(q) ||
      e.station.toLowerCase().includes(q),
  );
}

export function toggleSet<T>(current: Set<T>, value: T): Set<T> {
  const next = new Set(current);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}
