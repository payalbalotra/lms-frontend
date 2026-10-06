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
    params: { _t: Date.now() },
  });

  return { jobs: data.data?.jobs ?? [] };
}

export async function fetchJobsWithStations(
  cookieHeader?: string,
): Promise<{ jobs: JobWithStations[] }> {
  const headers: Record<string, string> = {};

  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)lms_token=([^;]+)/);
    if (tokenMatch) {
      headers['Authorization'] = `Bearer ${decodeURIComponent(tokenMatch[1])}`;
    }
  }

  // Call backend GET /api/v1/jobs/with-stations directly
  try {
    const { data } = await http.get<{
      success: boolean;
      data: { jobs: JobWithStations[] };
    }>(JOBS_ENDPOINTS.WITH_STATIONS, {
      headers: Object.keys(headers).length ? headers : undefined,
      params: { _t: Date.now() },
    });

    return { jobs: data.data?.jobs ?? [] };
  } catch {
    // If backend route is not ready yet, return jobs with empty stations (no artificial unions)
    const { jobs } = await fetchJobs(cookieHeader);
    return {
      jobs: jobs.map((j) => ({
        ...j,
        stations: [],
      })),
    };
  }
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
): Promise<{ stations: Array<{ id: string; name: string }> }> {
  if (!jobIds.length) {
    return { stations: [] };
  }

  const { jobs } = await fetchJobsWithStations();
  const stationMap = new Map<string, { id: string; name: string }>();

  for (const job of jobs) {
    if (jobIds.includes(job.id)) {
      for (const st of job.stations || []) {
        stationMap.set(st.id, st);
      }
    }
  }

  return { stations: Array.from(stationMap.values()) };
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
