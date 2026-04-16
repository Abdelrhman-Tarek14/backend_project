import apiClient from '../services/apiClient';
import { API_ENDPOINTS } from './endpoints';
import type { UserRole } from '../constants/roles';

export interface AuthUser {
    id: string | number;
    email: string;
    name: string;
    role: UserRole;
    displayName?: string;
    pictureUrl?: string;
    [key: string]: any;
}

export interface AuthResponse {
    user: AuthUser;
    accessToken: string;
    message?: string;
}

export interface LoginCredentials {
    email: string;
    password?: string; 
}

export const authApi = {
    login: (credentials: LoginCredentials) => 
        apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials),

    logout: () => 
        apiClient.post<{ message: string }>(API_ENDPOINTS.AUTH.LOGOUT),

    refresh: () => 
        apiClient.post<{ accessToken: string }>(API_ENDPOINTS.AUTH.REFRESH),
};