import { Role } from '@prisma/client';

export const MANAGEMENT_ROLES: Role[] = [
  Role.SUPER_USER,
  Role.ADMIN,
  Role.SUPERVISOR,
  Role.CMD,
  Role.LEADER,
  Role.SUPPORT,
];
