import apiClient from '../services/apiClient';
import { API_ENDPOINTS } from './endpoints';
import { ROLES } from '../constants/roles'; 

export type UserRole = typeof ROLES[keyof typeof ROLES];

export interface UserStatusUpdate {
    role?: UserRole; 
    isActive?: boolean;
}

export interface User {
    id: string | number;
    email: string;
    name: string;
    displayName?: string;
    role: UserRole; 
    pictureUrl?: string;
    colorTheme?: string;
    [key: string]: any;
}

export const usersApi = {
    getCurrentUser: () => 
        apiClient.get<User>(API_ENDPOINTS.USERS.ME),

    updateUserPreferences: (data: { displayName?: string | null }) => 
        apiClient.patch<User>(API_ENDPOINTS.USERS.ME, data),

    getUsers: (params?: any) => 
        apiClient.get<User[]>(API_ENDPOINTS.USERS.LIST, { params }),

    updateUserStatus: (userId: string | number, data: UserStatusUpdate) => 
        apiClient.patch<User>(API_ENDPOINTS.USERS.STATUS(userId), data),
};