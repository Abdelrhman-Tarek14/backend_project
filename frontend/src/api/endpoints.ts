/**
 * Centralized API endpoints for the application.
 */
export const API_ENDPOINTS = {
    CSRF: '/csrf',
    AUTH: {
        GOOGLE: '/auth/google',
        LOGIN: '/auth/login',
        REFRESH: '/auth/refresh',
        LOGOUT: '/auth/logout',
    },
    USERS: {
        ME: '/users/me',
        LIST: '/users',
        STATUS: (id: string | number) => `/users/${String(id)}/status` as const,
    },
    CASES: {
        LIST: '/cases',
        BY_ID: (id: string | number) => `/cases/${String(id)}` as const,
        SF_STATUS: '/cases/salesforce/status',
        ASSIGNMENT: (assignmentId: string | number) => `/cases/assignments/${String(assignmentId)}` as const,
    },
    LEADERBOARD: {
        GET: '/leaderboard',
    },
} as const;

export type ApiEndpoints = typeof API_ENDPOINTS;