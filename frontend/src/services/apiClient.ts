import axios from 'axios';
import type { InternalAxiosRequestConfig, AxiosError } from 'axios';
import { API_ENDPOINTS } from '../api/endpoints';

const baseURL = import.meta.env.VITE_API_URL || '';

const apiClient = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

let csrfToken: string | null = null;

/**
 * Fetch a new CSRF token from the backend
 */
export const fetchCsrfToken = async (): Promise<string | null> => {
    try {
        const response = await axios.get(`${baseURL}${API_ENDPOINTS.CSRF}`, { withCredentials: true });
        // Account for backend's TransformInterceptor wrapping
        csrfToken = response.data?.data?.csrfToken || response.data?.csrfToken;
        
        if (csrfToken) {
            apiClient.defaults.headers.common['x-csrf-token'] = csrfToken;
        }
        return csrfToken;
    } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
        return null;
    }
};

// Request interceptor
apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const mutatingMethods = ['post', 'put', 'patch', 'delete'];

        if (mutatingMethods.includes(config.method?.toLowerCase() || '')) {
            if (!csrfToken) {
                await fetchCsrfToken();
            }

            if (csrfToken) {
                config.headers['x-csrf-token'] = csrfToken;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);



let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string | null) => void; reject: (error: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Response interceptor
apiClient.interceptors.response.use(
    (response) => {
        if (response.data && response.data.statusCode && typeof response.data.data !== 'undefined') {
            response.data = response.data.data;
        }
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as any;
        
        if (!originalRequest) return Promise.reject(error);

        // 401 Unauthorized handling
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => {
                    return apiClient(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            isRefreshing = true;

            try {
                // Ensure we have a CSRF token before refreshing
                if (!csrfToken) {
                    await fetchCsrfToken();
                }
                
                let headers = csrfToken ? { 'x-csrf-token': csrfToken } : {};
                
                try {
                    // Call refresh endpoint
                    await axios.post(`${baseURL}${API_ENDPOINTS.AUTH.REFRESH}`, {}, { 
                        withCredentials: true,
                        headers
                    });
                } catch (refreshErr: any) {
                    // If refresh fails with 403 (CSRF issue), get a new CSRF and try refresh one more time
                    if (refreshErr.response?.status === 403) {
                        await fetchCsrfToken();
                        headers = csrfToken ? { 'x-csrf-token': csrfToken } : {};
                        await axios.post(`${baseURL}${API_ENDPOINTS.AUTH.REFRESH}`, {}, { 
                            withCredentials: true,
                            headers
                        });
                    } else {
                        throw refreshErr;
                    }
                }
                
                // Get fresh CSRF after successful refresh
                await fetchCsrfToken();
                
                // Slightly longer delay (300ms) to ensure browser cookies are fully settled 
                // especially when multiple concurrent requests are waiting in the queue.
                await new Promise(resolve => setTimeout(resolve, 300));
                
                processQueue(null, csrfToken);
                
                // Ensure the retried request has the latest CSRF token
                if (csrfToken) {
                    originalRequest.headers['x-csrf-token'] = csrfToken;
                }
                
                return apiClient(originalRequest);
            } catch (refreshError: any) {
                processQueue(refreshError, null);
                
                // Only redirect to login if it's truly a 401/403 failure on the refresh itself
                console.error('Session expired or refresh failed.');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // 403 Forbidden handling (CSRF failure)
        if (error.response?.status === 403 && !originalRequest._csrfRetry) {
            originalRequest._csrfRetry = true;
            await fetchCsrfToken();
            
            if (csrfToken) {
                originalRequest.headers['x-csrf-token'] = csrfToken;
            }
            return apiClient(originalRequest);
        }

        // 503 Service Unavailable handling (Maintenance Mode)
        if (error.response?.status === 503) {
            window.dispatchEvent(new CustomEvent('maintenance-mode', { detail: { active: true } }));
        }

        return Promise.reject(error);
    }
);

export default apiClient;