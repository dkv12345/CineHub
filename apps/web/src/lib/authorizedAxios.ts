import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

/**
 * Interface representing an item waiting in the failed request queue.
 */
interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

/**
 * State container for Token Refresh and Request Queueing.
 */
let isRefreshing = false;
let failedQueue: QueueItem[] = [];

export const getIsRefreshing = (): boolean => isRefreshing;
export const setIsRefreshing = (value: boolean): void => {
  isRefreshing = value;
};

/**
 * The access token lives only in memory (never localStorage) so XSS cannot read it from storage.
 * It is restored after a page reload by calling the refresh endpoint with the HTTP-only cookie.
 */
let accessToken: string | null = null;
export const getAccessToken = (): string | null => accessToken;
export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

/**
 * Callback invoked when the session can no longer be refreshed (expired / revoked / reused token).
 * The auth store registers it so the UI drops back to the logged-out state.
 */
let sessionExpiredHandler: (() => void) | null = null;
export const setSessionExpiredHandler = (handler: (() => void) | null): void => {
  sessionExpiredHandler = handler;
};

/**
 * Processes all queued requests once the token refresh completes.
 *
 * @param error - Error if the refresh failed, or null if successful.
 * @param token - The newly issued access token if refresh succeeded.
 */
export const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Pre-configured Axios instance for authenticated API requests.
 *
 * Features:
 * - baseURL: '/api' (proxied by Vite to backend server in development).
 * - withCredentials: true (enables sending HTTP-only cookies like refreshToken).
 * - Request interceptor: attaches the in-memory Bearer token.
 * - Response interceptor: catches 401 TOKEN_EXPIRED errors and coordinates silent refresh.
 */
export const authorizedAxios: AxiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface RefreshedSession {
  accessToken: string;
  user: unknown;
}

let refreshPromise: Promise<RefreshedSession> | null = null;

/**
 * Exchanges the HTTP-only refresh cookie for a new access token (Refresh Token Rotation).
 *
 * Concurrent callers share one in-flight request. This matters because the backend treats a
 * replayed refresh token as theft and revokes the whole session: React StrictMode's double
 * mount or several parallel 401s must never send the same cookie twice.
 *
 * Uses the bare axios client so a failing refresh cannot recurse through the interceptor.
 */
export function refreshAccessToken(): Promise<RefreshedSession> {
  if (!refreshPromise) {
    isRefreshing = true;
    refreshPromise = axios
      .post<{ data: RefreshedSession }>('/api/auth/refresh-token', {}, { withCredentials: true })
      .then((response) => {
        accessToken = response.data.data.accessToken;
        return response.data.data;
      })
      .finally(() => {
        refreshPromise = null;
        isRefreshing = false;
      });
  }
  return refreshPromise;
}

// ============================================================================
// REQUEST INTERCEPTOR
// ============================================================================
authorizedAxios.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  },
);

// ============================================================================
// RESPONSE INTERCEPTOR
// ============================================================================
authorizedAxios.interceptors.response.use(
  (response) => {
    // If response is successful, pass it through directly
    return response;
  },
  async (error: AxiosError<{ error?: { code?: string; message?: string } }>) => {
    const originalRequest = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    const isTokenExpired =
      error.response?.status === 401 && error.response?.data?.error?.code === 'TOKEN_EXPIRED';

    if (!isTokenExpired || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Another request is already refreshing: wait for its result instead of refreshing twice.
    if (isRefreshing) {
      originalRequest._retry = true;
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return authorizedAxios(originalRequest);
      });
    }

    originalRequest._retry = true;
    try {
      const session = await refreshAccessToken();
      processQueue(null, session.accessToken);
      originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;
      return await authorizedAxios(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      accessToken = null;
      sessionExpiredHandler?.();
      return Promise.reject(refreshError);
    }
  },
);

export default authorizedAxios;
