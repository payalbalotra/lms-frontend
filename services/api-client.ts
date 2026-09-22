import axios from 'axios';

/**
 * Shared Axios client for LMS frontend.
 * Uses relative `/api` path so requests go through the Next.js proxy rewrite,
 * ensuring HttpOnly cookies (such as `al-session`) are attached automatically.
 */
export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? 500;
    const message = error.response?.data?.error?.message || error.message || 'An error occurred';
    const code = error.response?.data?.error?.code || 'UNKNOWN_ERROR';
    
    return Promise.reject({
      status,
      code,
      message,
      details: error.response?.data?.error?.details || [],
    });
  }
);
