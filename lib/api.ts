import type {
  AdminEmployee,
  ApiError,
  CreateEmployeeInput,
  CreateLocationInput,
  CreateRoleInput,
  CreateStationInput,
  Employee,
  EmployeeStatus,
  InviteResult,
  Location,
  Role,
  Station,
  UpdateLocationInput,
  UpdateRoleInput,
  UpdateStationInput,
} from './types';

// Client-side fetches use a relative path so the browser hits the Next.js
// rewrite proxy (next.config.ts → /api/* → backend). That keeps the Better
// Auth Set-Cookie scoped to localhost:3000 — the page origin — so it
// survives client navigations and SSR fetches that read cookies().
//
// Server-side fetches (in Server Components, layouts, route handlers) bypass
// the proxy and hit the backend directly. The cookie from the incoming
// browser request is forwarded manually via options.cookieHeader so the
// backend's requireAuth still sees it. Going through the rewrite for
// internal SSR fetches is fragile (Next.js may rewrite the cookie header or
// strip attributes depending on version), so direct + manual forwarding is
// the reliable path.
//
// Override via NEXT_PUBLIC_API_BASE to point both at a different origin.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  (typeof window === 'undefined'
    ? (process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:4000')
    : '');

export class ApiException extends Error {
  public readonly status: number;
  public readonly code: string;

  public constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  // Forward the incoming request's cookies when calling the API server-side.
  // On the client, omit this — the browser attaches cookies automatically because
  // both `/api/auth/*` and the page share same-site origin and CORS allows credentials.
  cookieHeader?: string;
  headers?: Record<string, string>;
  // Abort when the caller (a Server Component) has already surpassed its deadline.
  signal?: AbortSignal;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers ?? {}),
  };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.cookieHeader) headers.cookie = options.cookieHeader;

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    cache: 'no-store',
  });

  if (!response.ok) {
    let code = 'UNKNOWN';
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as ApiError;
      if (payload.error) {
        code = payload.error.code;
        message = payload.error.message;
      }
    } catch {
      // Body wasn't JSON; keep generic message.
    }
    throw new ApiException(response.status, code, message);
  }

  return (await response.json()) as T;
}

// ----------------------------------------------------------------------------
// Typed endpoints
// ----------------------------------------------------------------------------

export interface LoginInput {
  name: string;
  password: string;
  locationId: string;
  deviceMode?: 'personal' | 'shared';
}

export function login(input: LoginInput): Promise<{ employee: Employee }> {
  return apiRequest('/api/auth/login', { method: 'POST', body: input });
}

export function logout(): Promise<{ ok: true }> {
  return apiRequest('/api/auth/logout', { method: 'POST' });
}

export function fetchMe(cookieHeader?: string, signal?: AbortSignal): Promise<{ employee: Employee }> {
  return apiRequest('/api/auth/me', { cookieHeader, signal });
}

// ----------------------------------------------------------------------------
// Admin lookups
// ----------------------------------------------------------------------------

export function listRoles(cookieHeader?: string): Promise<{ roles: Role[] }> {
  return apiRequest('/api/admin/employees/roles', { cookieHeader });
}

export function listStations(
  locationId: string,
  cookieHeader?: string,
  opts: { includeArchived?: boolean } = {},
): Promise<{ stations: Station[] }> {
  const includeArchived = opts.includeArchived ? '&includeArchived=true' : '';
  return apiRequest(
    `/api/admin/employees/stations?locationId=${encodeURIComponent(locationId)}${includeArchived}`,
    { cookieHeader },
  );
}

export function listLocations(cookieHeader?: string): Promise<{ locations: Location[] }> {
  return apiRequest('/api/admin/employees/locations', { cookieHeader });
}

// ----------------------------------------------------------------------------
// Admin employees
// ----------------------------------------------------------------------------

export function listEmployees(
  opts: { status?: EmployeeStatus | 'all' } = {},
  cookieHeader?: string,
): Promise<{ employees: AdminEmployee[] }> {
  const status = opts.status ?? 'all';
  const qs = status === 'all' ? '' : `?status=${encodeURIComponent(status)}`;
  return apiRequest(`/api/admin/employees${qs}`, { cookieHeader });
}

export function createEmployee(input: CreateEmployeeInput): Promise<{ employee: Employee; invite: InviteResult }> {
  return apiRequest('/api/admin/employees', { method: 'POST', body: input });
}

export function resendInvite(employeeId: string): Promise<{ invite: InviteResult }> {
  return apiRequest(`/api/admin/employees/${encodeURIComponent(employeeId)}/invites`, { method: 'POST' });
}

export function deactivateEmployee(employeeId: string): Promise<{ employee: AdminEmployee }> {
  return apiRequest(`/api/admin/employees/${encodeURIComponent(employeeId)}/deactivate`, { method: 'POST' });
}

export function reactivateEmployee(employeeId: string): Promise<{ employee: AdminEmployee }> {
  return apiRequest(`/api/admin/employees/${encodeURIComponent(employeeId)}/reactivate`, { method: 'POST' });
}

// ----------------------------------------------------------------------------
// Admin settings — stations, roles, locations
// ----------------------------------------------------------------------------

export function createStation(input: CreateStationInput): Promise<{ station: Station }> {
  return apiRequest('/api/admin/employees/stations', { method: 'POST', body: input });
}

export function updateStation(stationId: string, patch: UpdateStationInput): Promise<{ station: Station }> {
  return apiRequest(`/api/admin/employees/stations/${encodeURIComponent(stationId)}`, {
    method: 'PATCH',
    body: patch,
  });
}

export function archiveStation(stationId: string): Promise<{ station: Station }> {
  return apiRequest(`/api/admin/employees/stations/${encodeURIComponent(stationId)}/archive`, {
    method: 'POST',
  });
}

export function createRole(input: CreateRoleInput): Promise<{ role: Role }> {
  return apiRequest('/api/admin/employees/roles', { method: 'POST', body: input });
}

export function updateRole(roleId: string, patch: UpdateRoleInput): Promise<{ role: Role }> {
  return apiRequest(`/api/admin/employees/roles/${encodeURIComponent(roleId)}`, {
    method: 'PATCH',
    body: patch,
  });
}

export function deleteRole(roleId: string): Promise<{ ok: true }> {
  return apiRequest(`/api/admin/employees/roles/${encodeURIComponent(roleId)}`, {
    method: 'DELETE',
  });
}

export function createLocation(input: CreateLocationInput): Promise<{ location: Location }> {
  return apiRequest('/api/admin/employees/locations', { method: 'POST', body: input });
}

export function updateLocation(locationId: string, patch: UpdateLocationInput): Promise<{ location: Location }> {
  return apiRequest(`/api/admin/employees/locations/${encodeURIComponent(locationId)}`, {
    method: 'PATCH',
    body: patch,
  });
}

export function deleteLocation(locationId: string): Promise<{ ok: true }> {
  return apiRequest(`/api/admin/employees/locations/${encodeURIComponent(locationId)}`, {
    method: 'DELETE',
  });
}

// ----------------------------------------------------------------------------
// Activate (invite token → activate → auto-login)
// ----------------------------------------------------------------------------

export function lookupInvite(token: string): Promise<{
  employeeName: string;
  expiresAt: string;
  employeeStatus: 'pending' | 'active' | 'deactivated';
}> {
  return apiRequest(`/api/auth/invites/${encodeURIComponent(token)}`);
}

export function activate(input: { token: string; code: string; password: string }): Promise<{ employee: Employee }> {
  return apiRequest('/api/auth/activate', { method: 'POST', body: input });
}