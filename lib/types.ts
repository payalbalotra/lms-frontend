// Types mirror the backend's publicEmployee() shape in
// lms-backend/src/controllers/auth.ts. Two-repo rule: no shared package.

export type ClearanceLevel = 'general' | 'station' | 'confidential' | 'master';

export interface Employee {
  id: string;
  name: string;
  locationId: string;
  roleId: string;
  stationId: string | null;
  clearanceLevel: ClearanceLevel;
  languagePref: 'en' | 'es';
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    lockedUntil?: string;
  };
}