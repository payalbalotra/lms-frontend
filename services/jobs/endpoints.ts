export const JOBS_ENDPOINTS = {
  LIST: '/api/v1/jobs',
  CREATE: '/api/v1/jobs',
  UPDATE: (id: string) => `/api/v1/jobs/${id}`,
  DELETE: (id: string) => `/api/v1/jobs/${id}`,
  STATIONS: '/api/v1/jobs/stations',
  WITH_STATIONS: '/api/v1/jobs/with-stations',
} as const;
