// Mirror backend types (no shared package). Backend source of truth:
//   lms-backend/src/db/schema.ts (enums + table shapes)
//   lms-backend/src/controllers/admin/employees.ts (public row)

export type ClearanceLevel = 'general' | 'station' | 'confidential' | 'master';
export type LanguagePref = 'en' | 'es';
export type EmployeeStatus = 'pending' | 'active' | 'deactivated';

export interface Employee {
  id: string;
  name: string;
  locationId: string;
  roleId: string;
  stationId: string | null;
  clearanceLevel: ClearanceLevel;
  languagePref: LanguagePref;
}

export interface Role {
  id: string;
  clearanceLevel: ClearanceLevel;
  createdAt: string;
}

export interface Station {
  id: string;
  locationId: string;
  sortOrder: number;
  isArchived: boolean;
}

export interface Location {
  id: string;
  name: string;
}

export interface InviteResult {
  url: string;
  code: string;
  expiresAt: string;
}

export interface AdminEmployee extends Employee {
  employeeCode: string | null;
  status: EmployeeStatus;
  createdAt: string;
  deactivatedAt: string | null;
  locationName: string | null;
  roleClearance: ClearanceLevel | null;
}

export interface CreateEmployeeInput {
  name: string;
  locationId: string;
  roleId: string;
  stationId?: string | null;
  clearanceLevel: ClearanceLevel;
  employeeCode?: string | null;
  languagePref?: LanguagePref;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    lockedUntil?: string;
  };
}