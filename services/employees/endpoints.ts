export const EMPLOYEES_ENDPOINTS = {
  LIST: '/api/v1/employees',
  CREATE: '/api/v1/employees',
  UPDATE: (id: string) => `/api/v1/employees/${id}`,
  RESEND_INVITE: (id: string) => `/api/v1/employees/${id}/invites`,
  DEACTIVATE: (id: string) => `/api/v1/employees/${id}/deactivate`,
  REACTIVATE: (id: string) => `/api/v1/employees/${id}/reactivate`,
} as const;
