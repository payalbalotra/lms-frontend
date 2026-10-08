import http from '@/lib/http';
import { EMPLOYEES_ENDPOINTS } from './endpoints';
import type {
  AdminEmployee,
  Employee,
  CreateEmployeeInput,
  InviteResult,
  EmployeeFilterOptions,
} from './types';

function normalizeEmployee<T extends Employee>(raw: any): T {
  const roleIds = Array.isArray(raw?.roleIds)
    ? raw.roleIds
    : Array.isArray(raw?.jobIds)
      ? raw.jobIds
      : [];
  const jobIds = Array.isArray(raw?.jobIds)
    ? raw.jobIds
    : Array.isArray(raw?.roleIds)
      ? raw.roleIds
      : [];
  const stationIds = Array.isArray(raw?.stationIds) ? raw.stationIds : [];

  return {
    ...raw,
    roleIds,
    jobIds,
    stationIds,
  } as T;
}

export async function fetchEmployees(
  opts: EmployeeFilterOptions = {},
  cookieHeader?: string,
): Promise<{ employees: AdminEmployee[] }> {
  const status = opts.status ?? 'all';
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
    data: { employees: AdminEmployee[] };
  }>(EMPLOYEES_ENDPOINTS.LIST, {
    headers: Object.keys(headers).length ? headers : undefined,
    params: {
      status: status !== 'all' ? status : undefined,
      _t: Date.now(),
    },
  });

  const rawList = data.data?.employees ?? [];
  return { employees: rawList.map((e) => normalizeEmployee<AdminEmployee>(e)) };
}

export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<{ employee: Employee; invite: InviteResult }> {
  const { data } = await http.post<{
    success: boolean;
    data: {
      employee: Employee;
      inviteUrl?: string;
    };
  }>(EMPLOYEES_ENDPOINTS.CREATE, {
    name: input.name,
    email: input.email,
    locationId: input.locationId,
    role: input.accessLevel === 'manager' ? 'manager' : 'employee',
    jobIds: input.roleIds,
    stationIds: input.stationIds ?? [],
    employeeCode: input.employeeCode || undefined,
    languagePref: input.languagePref ?? 'en',
  });

  const invite: InviteResult = {
    url: data.data?.inviteUrl || '',
    code: '',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  return { employee: normalizeEmployee<Employee>(data.data.employee), invite };
}

export async function resendInvite(
  employeeId: string,
): Promise<{ invite: InviteResult }> {
  const { data } = await http.post<{
    success: boolean;
    data: {
      inviteUrl: string;
    };
  }>(EMPLOYEES_ENDPOINTS.RESEND_INVITE(employeeId));

  return {
    invite: {
      url: data.data?.inviteUrl || '',
      code: '',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  };
}

export async function deactivateEmployee(
  employeeId: string,
): Promise<{ employee: AdminEmployee }> {
  const { data } = await http.post<{
    success: boolean;
    data: {
      employee: AdminEmployee;
    };
  }>(EMPLOYEES_ENDPOINTS.DEACTIVATE(employeeId));

  return { employee: normalizeEmployee<AdminEmployee>(data.data.employee) };
}

export async function reactivateEmployee(
  employeeId: string,
): Promise<{ employee: AdminEmployee }> {
  const { data } = await http.post<{
    success: boolean;
    data: {
      employee: AdminEmployee;
    };
  }>(EMPLOYEES_ENDPOINTS.REACTIVATE(employeeId));

  return { employee: normalizeEmployee<AdminEmployee>(data.data.employee) };
}

