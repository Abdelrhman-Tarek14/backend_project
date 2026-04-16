import { ROLES } from './roles';

/**
 * Permission constants for the application.
 * Use these instead of raw strings to avoid typos.
 */
export const PERMISSIONS = {
    // User Management
    MANAGE_USERS: 'manage_users',
    ASSIGN_SUPER_ADMIN: 'assign_super_admin', // Only for Super Admin

    // Case Management
    CREATE_CASE: 'create_case',
    EDIT_CASE: 'edit_case',
    DELETE_CASE: 'delete_case',
    VIEW_CLOSED_CASES: 'view_closed_cases',

    // System Settings
    MANAGE_SETTINGS: 'manage_settings',
    VIEW_LOGS: 'view_logs',
    MANAGE_RESOURCES: 'manage_resources',

    // Automation
    ACCESS_AUTOMATION: 'access_automation',
};

/**
 * Permission Matrix: Maps each permission to an array of roles that have it.
 * This is the central source of truth for "who can do what".
 */
export const PERMISSION_MATRIX = {
    [PERMISSIONS.MANAGE_USERS]: [ROLES.SUPER_USER, ROLES.ADMIN],
    [PERMISSIONS.ASSIGN_SUPER_ADMIN]: [ROLES.SUPER_USER],

    [PERMISSIONS.CREATE_CASE]: [ROLES.SUPER_USER, ROLES.ADMIN, ROLES.CMD, ROLES.SUPERVISOR, ROLES.LEADER],
    [PERMISSIONS.EDIT_CASE]: [ROLES.SUPER_USER, ROLES.ADMIN, ROLES.CMD],
    [PERMISSIONS.DELETE_CASE]: [ROLES.SUPER_USER, ROLES.ADMIN, ROLES.CMD],
    [PERMISSIONS.VIEW_CLOSED_CASES]: [ROLES.SUPER_USER, ROLES.ADMIN, ROLES.CMD, ROLES.SUPERVISOR, ROLES.LEADER],

    [PERMISSIONS.MANAGE_SETTINGS]: [ROLES.SUPER_USER],
    [PERMISSIONS.VIEW_LOGS]: [ROLES.SUPER_USER, ROLES.ADMIN],
    [PERMISSIONS.MANAGE_RESOURCES]: [ROLES.SUPER_USER],

    [PERMISSIONS.ACCESS_AUTOMATION]: [ROLES.SUPER_USER, ROLES.ADMIN, ROLES.CMD],
};
