import apiClient from '../services/apiClient';
import { API_ENDPOINTS } from './endpoints';

export const authApi = {
    login: (email, password) => apiClient.post(API_ENDPOINTS.AUTH.LOGIN, { email, password }),
    logout: () => apiClient.post(API_ENDPOINTS.AUTH.LOGOUT),
    refresh: () => apiClient.post(API_ENDPOINTS.AUTH.REFRESH),
};
