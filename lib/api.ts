import type { ApiError, Employee } from './types';

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';

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
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
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