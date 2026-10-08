export const LIBRARY_ENDPOINTS = {
  LIST_PUBLIC: '/api/v1/procedures',
  GET_PUBLIC: (slug: string) => `/api/v1/procedures/${slug}`,
  LIST: '/api/v1/procedures',
  GET: (slug: string) => `/api/v1/procedures/${slug}`,
  CREATE: '/api/v1/procedures',
  UPDATE: (id: string) => `/api/v1/procedures/${id}`,
  ARCHIVE: (id: string) => `/api/v1/procedures/${id}/archive`,
  IMPORT: '/api/v1/procedures/import',
} as const;
