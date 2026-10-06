import type {
  AdminEmployee,
  Employee,
  EmployeeStatus,
  EmployeeRole,
  CreateEmployeeInput,
  InviteResult,
} from '@/lib/types';

export type {
  AdminEmployee,
  Employee,
  EmployeeStatus,
  EmployeeRole,
  CreateEmployeeInput,
  InviteResult,
};

export interface EmployeeFilterOptions {
  status?: EmployeeStatus | 'all';
  q?: string;
}
