export const LIBRARY_ENDPOINTS = {
  LIST_PUBLIC: '/procedures',
  GET_PUBLIC: (id: string) => `/procedures/${id}`,
  LIST_ADMIN: '/admin/library/procedures',
  GET_ADMIN: (id: string) => `/admin/library/procedures/${id}`,
  CREATE: '/admin/library/procedures',
  UPDATE: (id: string) => `/admin/library/procedures/${id}`,
  ARCHIVE: (id: string) => `/admin/library/procedures/${id}/archive`,
  IMPORT: '/admin/library/import',
} as const;
