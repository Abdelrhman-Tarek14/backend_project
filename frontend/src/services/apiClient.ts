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

            try {
                await axios.post(`${baseURL}${API_ENDPOINTS.AUTH.REFRESH}`, {}, { withCredentials: true });
                await fetchCsrfToken();
                return apiClient(originalRequest);
            } catch (refreshError) {
                console.error('Session expired. Please log in again.');
                return Promise.reject(refreshError);
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

        return Promise.reject(error);
    }
);

export default apiClient;