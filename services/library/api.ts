import { apiClient } from '../api-client';
import { LIBRARY_ENDPOINTS } from './endpoints';
import type { Procedure, CreateProcedureInput, ProcedureFilterOptions } from './types';

export async function fetchProcedures(
  options: ProcedureFilterOptions = {},
  isAdmin = false
): Promise<{ procedures: Procedure[]; total?: number }> {
  const endpoint = isAdmin
    ? LIBRARY_ENDPOINTS.LIST_ADMIN
    : LIBRARY_ENDPOINTS.LIST_PUBLIC;

  const response = await apiClient.get<{ procedures: Procedure[]; total?: number }>(
    endpoint,
    { params: options }
  );
  return response.data;
}

export async function fetchProcedureById(
  id: string,
  isAdmin = false
): Promise<Procedure> {
  const endpoint = isAdmin
    ? LIBRARY_ENDPOINTS.GET_ADMIN(id)
    : LIBRARY_ENDPOINTS.GET_PUBLIC(id);

  const response = await apiClient.get<{ procedure: Procedure }>(endpoint);
  return response.data.procedure;
}

export async function createProcedure(
  input: CreateProcedureInput
): Promise<Procedure> {
  const response = await apiClient.post<{ procedure: Procedure }>(
    LIBRARY_ENDPOINTS.CREATE,
    input
  );
  return response.data.procedure;
}

export async function updateProcedure(
  id: string,
  input: Partial<CreateProcedureInput>
): Promise<Procedure> {
  const response = await apiClient.patch<{ procedure: Procedure }>(
    LIBRARY_ENDPOINTS.UPDATE(id),
    input
  );
  return response.data.procedure;
}

export async function archiveProcedure(id: string): Promise<Procedure> {
  const response = await apiClient.post<{ procedure: Procedure }>(
    LIBRARY_ENDPOINTS.ARCHIVE(id)
  );
  return response.data.procedure;
}
