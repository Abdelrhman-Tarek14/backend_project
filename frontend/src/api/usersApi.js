import apiClient from '../services/apiClient';
import { API_ENDPOINTS } from './endpoints';

export const usersApi = {
    getCurrentUser: () => apiClient.get(API_ENDPOINTS.USERS.ME),
    updateUserPreferences: (data) => apiClient.patch(API_ENDPOINTS.USERS.ME, data),
    getUsers: (params) => apiClient.get(API_ENDPOINTS.USERS.LIST, { params }),
    updateUserStatus: (userId, data) => apiClient.patch(API_ENDPOINTS.USERS.STATUS(userId), data),
};
