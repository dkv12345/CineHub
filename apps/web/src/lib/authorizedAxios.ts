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
 * - Request interceptor: attaches Bearer token from local storage or memory.
 * - Response interceptor: catches 401 TOKEN_EXPIRED errors and coordinates silent refresh.
 */
export const authorizedAxios: AxiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// REQUEST INTERCEPTOR (SKELETON)
// ============================================================================
authorizedAxios.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    /**
     * GUIDE FOR STUDENT IMPLEMENTATION:
     * 1. Retrieve the access token from your state management or secure storage:
     *    const token = getAccessToken(); // or localStorage.getItem('accessToken');
     * 2. If token exists and headers are available, inject the Authorization header:
     *    if (token && config.headers) {
     *      config.headers.Authorization = `Bearer ${token}`;
     *    }
     * 3. Return config.
     */
    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  },
);

// ============================================================================
// RESPONSE INTERCEPTOR (SKELETON)
// ============================================================================
authorizedAxios.interceptors.response.use(
  (response) => {
    // If response is successful, pass it through directly
    return response;
  },
  async (error: AxiosError<{ error?: { code?: string; message?: string } }>) => {
    void isRefreshing;
    void failedQueue;

    /**
     * GUIDE FOR STUDENT IMPLEMENTATION:
     *
     * const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
     *
     * 1. Check if the error represents an expired access token:
     *    const isTokenExpired =
     *      error.response?.status === 401 &&
     *      error.response?.data?.error?.code === 'TOKEN_EXPIRED';
     *
     * 2. If it is expired and this request has not been retried yet (!originalRequest._retry):
     *
     *    a. If another refresh request is already running (isRefreshing === true):
     *       - Queue this request:
     *         return new Promise<string>((resolve, reject) => {
     *           failedQueue.push({ resolve, reject });
     *         }).then((newToken) => {
     *           originalRequest.headers.Authorization = `Bearer ${newToken}`;
     *           return authorizedAxios(originalRequest);
     *         });
     *
     *    b. If this is the first failed request:
     *       - Mark originalRequest._retry = true;
     *       - Set isRefreshing = true;
     *       - Try calling POST /api/auth/refresh-token:
     *         try {
     *           const { data } = await axios.post('/api/auth/refresh-token', {}, { withCredentials: true });
     *           const newAccessToken = data.data.accessToken;
     *           setAccessToken(newAccessToken);
     *           processQueue(null, newAccessToken);
     *           originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
     *           return authorizedAxios(originalRequest);
     *         } catch (refreshError) {
     *           processQueue(refreshError, null);
     *           // Clear auth tokens and trigger logout redirect
     *           return Promise.reject(refreshError);
     *         } finally {
     *           isRefreshing = false;
     *         }
     */

    return Promise.reject(error);
  },
);

export default authorizedAxios;
