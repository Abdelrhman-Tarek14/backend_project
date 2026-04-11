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
        STATUS: (id) => `/users/${id}/status`,
    },
    CASES: {
        LIST: '/cases',
        BY_ID: (id) => `/cases/${id}`,
        SF_STATUS: '/cases/salesforce/status',
        ASSIGNMENT: (assignmentId) => `/cases/assignments/${assignmentId}`,
    },
    LEADERBOARD: {
        GET: '/leaderboard',
    },
};
