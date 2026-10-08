import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { ApiException } from './errors';

const baseURL =
  typeof window !== 'undefined'
    ? '' // In browser, use same-origin relative URLs to proxy through Next.js rewrites (zero CORS)
    : process.env.BACKEND_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:8000';

export const http: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15_000,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
});

/* ------------------------- Request interceptor ------------------------- */

http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.headers.set('x-request-id', crypto.randomUUID());

    if (typeof window !== 'undefined') {
      const isPublicActivation =
        config.url?.includes('/auth/set-password') ||
        config.url?.includes('/auth/invites');
      const token =
        localStorage.getItem('token') ||
        (document.cookie.match(/(?:^|;\s*)lms_token=([^;]+)/)?.[1]);
      if (token && !isPublicActivation) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/* ------------------------ Response interceptor ------------------------ */

interface ApiErrorBody {
  code?: string;
  message?: string;
  error?: { code?: string; message?: string };
  details?: { path: string; message: string }[];
  errors?: { field: string; message: string }[];
}

function normaliseAxiosError(error: AxiosError<ApiErrorBody>): ApiException {
  const status = error.response?.status ?? 0;
  const body = error.response?.data;
  const code = body?.code ?? body?.error?.code ?? 'UNKNOWN';
  const message =
    body?.message ?? body?.error?.message ?? error.message ?? 'Request failed';
  const details =
    body?.details ??
    body?.errors?.map((e) => ({ path: e.field, message: e.message })) ??
    [];

  return new ApiException(status, code, message, details);
}

http.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiErrorBody>) => Promise.reject(normaliseAxiosError(error)),
);

export default http;