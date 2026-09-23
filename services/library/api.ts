/**
 * Library data layer.
 *
 * Mirrors the previous axios-backed shape (`fetchProcedures`,
 * `fetchProcedureById`, `createProcedure`, `updateProcedure`,
 * `archiveProcedure`) but routes every call through the localStorage mock
 * store in `lib/api.ts`. Nothing in the wizard imports this module yet;
 * keeping it shaped like the eventual real API means the wizard can adopt
 * it later by swapping the imports.
 *
 * `updateProcedure` and `archiveProcedure` aren't implemented in the mock
 * yet — they throw a clear error so accidental adoption surfaces the gap
 * instead of silently writing through to a partial store.
 */

import {
  listProcedures as mockListProcedures,
  createProcedure as mockCreateProcedure,
  getProcedureBySlug as mockGetProcedureBySlug,
} from '@/lib/api';
import type { Procedure, CreateProcedureInput } from '@/lib/types';
import type { ProcedureFilterOptions } from './types';

export async function fetchProcedures(
  _options: ProcedureFilterOptions = {},
  _isAdmin = false
): Promise<{ procedures: Procedure[]; total?: number }> {
  const { procedures } = await mockListProcedures({});
  return { procedures, total: procedures.length };
}

export async function fetchProcedureById(
  id: string,
  _isAdmin = false
): Promise<Procedure> {
  const { procedure } = await mockGetProcedureBySlug(id);
  if (!procedure) throw new Error(`Procedure not found: ${id}`);
  return procedure;
}

export async function createProcedure(input: CreateProcedureInput): Promise<Procedure> {
  const { procedure } = await mockCreateProcedure(input);
  return procedure;
}

export async function updateProcedure(
  _id: string,
  _input: Partial<CreateProcedureInput>
): Promise<Procedure> {
  throw new Error('updateProcedure: not implemented in mock store');
}

export async function archiveProcedure(_id: string): Promise<Procedure> {
  throw new Error('archiveProcedure: not implemented in mock store');
}
