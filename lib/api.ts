import type {
  AdminEmployee,
  ApiError,
  CreateEmployeeInput,
  CreateLocationInput,
  CreateProcedureInput,
  CreateRoleInput,
  CreateStationInput,
  Employee,
  EmployeeStatus,
  InviteResult,
  Location,
  Procedure,
  Role,
  Station,
  UpdateLocationInput,
  UpdateRoleInput,
  UpdateStationInput,
} from './types';


export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  (typeof window === 'undefined'
    ? (process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:4000')
    : '');

export class ApiException extends Error {
  public readonly status: number;
  public readonly code: string;
  /** Per-field validation details from the backend (populated for
   *  `INVALID_INPUT`). Useful for surfacing *which* field failed. */
  public readonly details: { path: string; message: string }[];

  public constructor(
    status: number,
    code: string,
    message: string,
    details: { path: string; message: string }[] = [],
  ) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.code = code;
    this.details = details;
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
    let details: { path: string; message: string }[] = [];
    try {
      const payload = (await response.json()) as ApiError;
      if (payload.error) {
        code = payload.error.code;
        message = payload.error.message;
        if (Array.isArray(payload.error.details)) details = payload.error.details;
      }
    } catch {
      // Body wasn't JSON; keep generic message.
    }
    throw new ApiException(response.status, code, message, details);
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

// ----------------------------------------------------------------------------
// Library — procedures
// ----------------------------------------------------------------------------

export function createProcedure(input: CreateProcedureInput): Promise<{ procedure: Procedure }> {
  return apiRequest('/api/admin/library/procedures', { method: 'POST', body: input });
}

export function listProcedures(
  filter: { status?: Procedure['status'] } = {},
  cookieHeader?: string,
): Promise<{ procedures: Procedure[] }> {
  const qs = filter.status ? `?status=${encodeURIComponent(filter.status)}` : '';
  return apiRequest(`/api/admin/library/procedures${qs}`, { cookieHeader });
}

/** Public-by-slug read for the /procedures/[id] doc view. Open to any
 *  logged-in employee (admin or cook). Throws `ApiException` with status 404
 *  when the slug doesn't match anything. */
export function getProcedureBySlug(
  slug: string,
  cookieHeader?: string,
): Promise<{ procedure: Procedure }> {
  return apiRequest(`/api/procedures/${encodeURIComponent(slug)}`, { cookieHeader });
}

// ----------------------------------------------------------------------------
// Uploads (presigned PUT to R2)
// ----------------------------------------------------------------------------

export interface PresignedUpload {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
}

// Mints a one-shot presigned PUT URL for an image. Backend (services/uploads.ts)
// enforces the mime whitelist and the 10 MB cap; the editor mirrors the same
// checks client-side so users see the error without a round-trip.
export function requestImageUpload(
  input: { filename: string; contentType: string; size: number },
  cookieHeader?: string,
): Promise<PresignedUpload> {
  return apiRequest('/api/admin/uploads/image', {
    method: 'POST',
    body: input,
    cookieHeader,
  });
}

// Mints a one-shot presigned PUT URL for a video. Same shape as the image
// helper; backend enforces the video mime allowlist (mp4/webm/quicktime) and
// a 100 MB cap.
export function requestVideoUpload(
  input: { filename: string; contentType: string; size: number },
  cookieHeader?: string,
): Promise<PresignedUpload> {
  return apiRequest('/api/admin/uploads/video', {
    method: 'POST',
    body: input,
    cookieHeader,
  });
}

// PUTs the file bytes to R2 directly. Browsers must send Content-Type with
// the same value used in the matching requestXxxUpload(); R2 rejects the
// request otherwise. Cloudflare's CORS config must allow PUT from the
// origin (set in the bucket dashboard — see .env.example). Shared between
// image and video uploads — the wire format is identical.
export async function uploadToR2(
  uploadUrl: string,
  file: Blob,
  contentType: string,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': contentType },
  });
  if (!response.ok) {
    throw new Error(`R2 PUT failed with status ${response.status}`);
  }
}

// Hard-deletes a previously-uploaded R2 object. The editor's Remove button
// fires this best-effort so abandoned drafts don't leak storage. Backend
// silently no-ops (404 UPLOAD_NOT_OWNED) when the URL isn't one of our
// own uploads — e.g. a pasted YouTube link. Lifecycle rules in the bucket
// are the safety net for everything this misses.
export function deleteUpload(input: { url: string }): Promise<{ ok: true }> {
  return apiRequest('/api/admin/uploads', {
    method: 'DELETE',
    body: input,
  });
}