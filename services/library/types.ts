import type { Procedure, CreateProcedureInput } from '@/lib/types';

export type { Procedure, CreateProcedureInput };

export interface ProcedureFilterOptions {
  locationId?: string;
  categoryId?: string;
  q?: string;
  page?: number;
}
