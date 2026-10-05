import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { ApiException } from './errors';

const baseURL = process.env.NEXT_PUBLIC_API_BASE ?? '';

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
    // Stamp a per-request id so the backend log can stitch a user's actions
    // across a session. crypto is available in every Next.js runtime we
    // actually run (browser, edge, node 19+).
    config.headers.set('x-request-id', crypto.randomUUID());
    return config;
  },
  (error) => Promise.reject(error),
);

/* ------------------------ Response interceptor ------------------------ */

interface ApiErrorBody {
  code?: string;
  message?: string;
  details?: { path: string; message: string }[];
}

function normaliseAxiosError(error: AxiosError<ApiErrorBody>): ApiException {
  const status = error.response?.status ?? 0;
  const body = error.response?.data;
  return new ApiException(
    status,
    body?.code ?? 'UNKNOWN',
    body?.message ?? error.message ?? 'Request failed',
    body?.details ?? [],
  );
}

http.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiErrorBody>) => Promise.reject(normaliseAxiosError(error)),
);

export default http;