import http from '@/lib/http';
import { JOBS_ENDPOINTS } from './endpoints';
import type { Job, Role, JobWithStations, CreateRoleInput, UpdateRoleInput } from './types';

export async function fetchJobs(
  cookieHeader?: string,
): Promise<{ jobs: Job[] }> {
  const headers: Record<string, string> = {};

  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)lms_token=([^;]+)/);
    if (tokenMatch) {
      headers['Authorization'] = `Bearer ${decodeURIComponent(tokenMatch[1])}`;
    }
  }

  const { data } = await http.get<{
    success: boolean;
    data: { jobs: Job[] };
  }>(JOBS_ENDPOINTS.LIST, {
    headers: Object.keys(headers).length ? headers : undefined,
    // Backend paginates (default 10) — the roles catalog is small, take all.
    params: { limit: 200 },
  });

  return { jobs: data.data?.jobs ?? [] };
}

export async function fetchJobsWithStations(
  cookieHeader?: string,
): Promise<{ jobs: JobWithStations[] }> {
  const { jobs } = await fetchJobs(cookieHeader);
  return {
    jobs: jobs.map((j) => ({
      ...j,
      stations: [],
    })),
  };
}

export async function fetchRoles(
  cookieHeader?: string,
): Promise<{ roles: Role[] }> {
  const { jobs } = await fetchJobsWithStations(cookieHeader);
  const roles: Role[] = jobs.map((j) => ({
    id: j.id,
    name: j.name,
    clearanceLevel: 'general',
    stationIds: j.stations.map((s) => s.id),
    createdAt: j.createdAt || new Date().toISOString(),
  }));
  return { roles };
}

export async function fetchJobStations(
  jobIds: string[],
  cookieHeader?: string,
): Promise<{ stations: Array<{ id: string; name: string }> }> {
  if (!jobIds.length) {
    return { stations: [] };
  }

  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)lms_token=([^;]+)/);
    if (tokenMatch) {
      headers['Authorization'] = `Bearer ${decodeURIComponent(tokenMatch[1])}`;
    }
  }

  // GET first: comma-separated query string, no body semantics, so it
  // survives every proxy (Next rewrites have mangled the QUERY verb in
  // practice, costing a wasted round-trip on every call). QUERY second,
  // POST last — both documented by the backend for this route.
  try {
    // 1. GET with comma-separated query string ?jobIds=id1,id2
    const { data } = await http.get<{
      success: boolean;
      data: { stations: Array<{ id: string; name: string }> };
    }>(JOBS_ENDPOINTS.STATIONS, {
      params: { jobIds: jobIds.join(',') },
      headers: Object.keys(headers).length ? headers : undefined,
    });

    return { stations: data.data?.stations ?? [] };
  } catch {
    try {
      // 2. HTTP QUERY with body { jobIds } as per backend specification
      const { data } = await http.request<{
        success: boolean;
        data: { stations: Array<{ id: string; name: string }> };
      }>({
        method: 'QUERY',
        url: JOBS_ENDPOINTS.STATIONS,
        data: { jobIds },
        headers: Object.keys(headers).length ? headers : undefined,
      });

      return { stations: data.data?.stations ?? [] };
    } catch {
      // 3. Fallback: POST with JSON body
      const { data } = await http.post<{
        success: boolean;
        data: { stations: Array<{ id: string; name: string }> };
      }>(
        JOBS_ENDPOINTS.STATIONS,
        { jobIds },
        { headers: Object.keys(headers).length ? headers : undefined },
      );

      return { stations: data.data?.stations ?? [] };
    }
  }
}

export async function createJob(
  input: { name: string },
): Promise<{ job: Job }> {
  const { data } = await http.post<{
    success: boolean;
    data: { job: Job };
  }>(JOBS_ENDPOINTS.CREATE, input);

  return { job: data.data.job };
}

export async function updateJob(
  id: string,
  patch: { name: string },
): Promise<{ job: Job }> {
  const { data } = await http.patch<{
    success: boolean;
    data: { job: Job };
  }>(JOBS_ENDPOINTS.UPDATE(id), patch);

  return { job: data.data.job };
}

export async function deleteJob(id: string): Promise<{ ok: true }> {
  await http.delete(JOBS_ENDPOINTS.DELETE(id));
  return { ok: true };
}
