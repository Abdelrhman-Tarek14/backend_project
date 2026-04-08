import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
    baseURL,
    withCredentials: true, // Required for cookies and CSRF
    headers: {
        'Content-Type': 'application/json',
    },
});

// CSRF Token state
let csrfToken = null;

/**
 * Fetch a new CSRF token from the backend
 */
export const fetchCsrfToken = async () => {
    try {
        const response = await axios.get(`${baseURL}/csrf`, { withCredentials: true });
        // Account for backend's TransformInterceptor wrapping
        csrfToken = response.data?.data?.csrfToken || response.data?.csrfToken;
        apiClient.defaults.headers.common['x-csrf-token'] = csrfToken;
        return csrfToken;
    } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
        return null;
    }
};

// Request interceptor to ensure CSRF token is present for mutating requests
apiClient.interceptors.request.use(
    async (config) => {
        const mutatingMethods = ['post', 'put', 'patch', 'delete'];

        if (mutatingMethods.includes(config.method?.toLowerCase())) {
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

// Response interceptor for handling token expiration (401 Unauthorized) and unwrapping responses
apiClient.interceptors.response.use(
    (response) => {
        // Automatically unwrap the backend's TransformInterceptor format
        // The backend returns { statusCode: 200, message: "...", data: { ... } }
        if (response.data && response.data.statusCode && typeof response.data.message !== 'undefined' && typeof response.data.data !== 'undefined') {
            response.data = response.data.data;
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retrying
        // CRITICAL: We skip auto-refresh for the /users/me endpoint during initial check
        // to avoid infinite loops on the login page when no session exists.
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/users/me')
        ) {
            originalRequest._retry = true;

            try {
                // Attempt to refresh tokens
                await axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true });
                // If refresh succeeds, we also need to ensure we have a fresh CSRF token 
                // because the session might have changed.
                await fetchCsrfToken();

                // Retry the original request
                return apiClient(originalRequest);
            } catch (refreshError) {
                // If refresh fails, it's a hard logout
                console.error('Session expired. Please log in again.');
                return Promise.reject(refreshError);
            }
        }

        // If 403 Forbidden (likely CSRF failure), try fetching CSRF again and retry once
        if (error.response?.status === 403 && !originalRequest._csrfRetry) {
            originalRequest._csrfRetry = true;
            await fetchCsrfToken();
            originalRequest.headers['x-csrf-token'] = csrfToken;
            return apiClient(originalRequest);
        }

        return Promise.reject(error);
    }
);

export default apiClient;
