/**
 * Demo data for the Access step on the new-procedure wizard.
 *
 * Lives in its own file so the Access screen component can be merged into
 * the wizard without touching any other wizard code. The lists are not
 * persisted — the screen is presentational only.
 */

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

export const ACCESS_LOCATIONS: AccessOption[] = [
  { id: 'loc-downtown', label: 'Downtown Kitchen', sub: '4 stations · 22 staff', icon: 'ri-building-2-line' },
  { id: 'loc-harbor', label: 'Harbor Branch', sub: '3 stations · 14 staff', icon: 'ri-ship-line' },
  { id: 'loc-airport', label: 'Airport Terminal 2', sub: '2 stations · 9 staff', icon: 'ri-plane-line' },
  { id: 'loc-north', label: 'North Plaza', sub: '5 stations · 30 staff', icon: 'ri-store-3-line' },
];

export const ACCESS_ROLES: AccessOption[] = [
  { id: 'role-line-cook', label: 'Line Cook', sub: 'Station-bound, certified by station', icon: 'ri-knife-line' },
  { id: 'role-prep', label: 'Prep Cook', sub: 'Cold prep, dry storage, basics', icon: 'ri-restaurant-line' },
  { id: 'role-pastry', label: 'Pastry Chef', sub: 'Pastry kitchen + dessert station', icon: 'ri-cake-3-line' },
  { id: 'role-head-chef', label: 'Head Chef', sub: 'Full kitchen access', icon: 'ri-vip-crown-line' },
  { id: 'role-dishwasher', label: 'Dishwasher / Porter', sub: 'Closing + sanitation', icon: 'ri-sparkling-2-line' },
];

export const ACCESS_STATIONS: AccessOption[] = [
  { id: 'st-grill', label: 'Grill', sub: 'Hot line · high heat', icon: 'ri-fire-line' },
  { id: 'st-saute', label: 'Sauté', sub: 'Pans, sauces, finishing', icon: 'ri-restaurant-2-line' },
  { id: 'st-pastry', label: 'Pastry', sub: 'Bench, oven, chocolate', icon: 'ri-cake-line' },
  { id: 'st-cold', label: 'Cold / Salads', sub: 'Garde manger', icon: 'ri-snowflake-line' },
  { id: 'st-expo', label: 'Expo', sub: 'Pass / plating', icon: 'ri-arrow-left-right-line' },
];

export const ACCESS_EMPLOYEES: EmployeeOption[] = [
  { id: 'emp-001', name: 'María González', initials: 'MG', role: 'Line Cook', station: 'Grill' },
  { id: 'emp-002', name: 'James Carter', initials: 'JC', role: 'Line Cook', station: 'Sauté' },
  { id: 'emp-003', name: 'Ana Martínez', initials: 'AM', role: 'Pastry Chef', station: 'Pastry' },
  { id: 'emp-004', name: 'David Park', initials: 'DP', role: 'Prep Cook', station: 'Cold' },
  { id: 'emp-005', name: 'Sofía Hernández', initials: 'SH', role: 'Head Chef', station: 'Expo' },
  { id: 'emp-006', name: 'Lucas Silva', initials: 'LS', role: 'Dishwasher', station: 'Dish' },
  { id: 'emp-007', name: 'Priya Patel', initials: 'PP', role: 'Line Cook', station: 'Sauté' },
  { id: 'emp-008', name: 'Hiroshi Tanaka', initials: 'HT', role: 'Pastry Chef', station: 'Pastry' },
  { id: 'emp-009', name: 'Carla Fernández', initials: 'CF', role: 'Prep Cook', station: 'Cold' },
  { id: 'emp-010', name: 'Noah Williams', initials: 'NW', role: 'Line Cook', station: 'Grill' },
];

/** Filter helper used by the Assign tab's search input. */
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

/** Add/remove `value` from a Set<unknown>. Used by all four multi-select
 *  blocks (location / role / station / assign). */
export function toggleSet<T>(current: Set<T>, value: T): Set<T> {
  const next = new Set(current);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}
