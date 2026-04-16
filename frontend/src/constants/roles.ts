/**
 * Defined application roles for TermHub RBAC system.
 * Matches backend Prisma Role enum.
 */
export const ROLES = {
    SUPER_USER: 'SUPER_USER',
    ADMIN: 'ADMIN',
    SUPERVISOR: 'SUPERVISOR',
    CMD: 'CMD',
    LEADER: 'LEADER',
    SUPPORT: 'SUPPORT',
    AGENT: 'AGENT',
    NEW_USER: 'NEW_USER',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

/**
 * Role group definitions for easier permission checks.
 */
export const ROLE_GROUPS: Record<string, readonly UserRole[]> = {
    // Top-level management
    SUPER_USERS: [ROLES.SUPER_USER],

    // Administrative access (can manage system data)
    ADMINS: [ROLES.SUPER_USER, ROLES.ADMIN, ROLES.CMD, ROLES.SUPERVISOR, ROLES.LEADER, ROLES.SUPPORT],

    // Operations & Support management (Full control over cases)
    OPS: [ROLES.SUPER_USER, ROLES.ADMIN, ROLES.CMD, ROLES.SUPERVISOR, ROLES.LEADER],

    // Leadership & Training (View-only for some admin sections)
    LEADERSHIP: [ROLES.LEADER, ROLES.SUPPORT],

    // General users
    ALL_ROLES: Object.values(ROLES) as readonly UserRole[]
} as const;