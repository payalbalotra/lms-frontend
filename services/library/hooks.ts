import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProcedures,
  fetchProcedureById,
  createProcedure,
  updateProcedure,
  archiveProcedure,
} from './api';
import type { CreateProcedureInput, ProcedureFilterOptions } from './types';

export const PROCEDURES_QUERY_KEY = ['procedures'] as const;

export function useProcedures(options: ProcedureFilterOptions = {}, isAdmin = false) {
  return useQuery({
    queryKey: [...PROCEDURES_QUERY_KEY, options, { isAdmin }],
    queryFn: () => fetchProcedures(options, isAdmin),
  });
}

export function useProcedure(id: string, isAdmin = false) {
  return useQuery({
    queryKey: [...PROCEDURES_QUERY_KEY, id, { isAdmin }],
    queryFn: () => fetchProcedureById(id, isAdmin),
    enabled: Boolean(id),
  });
}

export function useCreateProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProcedureInput) => createProcedure(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCEDURES_QUERY_KEY });
    },
  });
}

export function useUpdateProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateProcedureInput> }) =>
      updateProcedure(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCEDURES_QUERY_KEY });
    },
  });
}

export function useArchiveProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveProcedure(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCEDURES_QUERY_KEY });
    },
  });
}
