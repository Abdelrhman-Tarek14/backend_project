import { Role } from '@prisma/client';

export const ROLE_RANK: Record<Role, number> = {
  [Role.SUPER_USER]: 100,
  [Role.ADMIN]: 80,
  [Role.SUPERVISOR]: 60,
  [Role.CMD]: 40,
  [Role.LEADER]: 30,
  [Role.SUPPORT]: 20,
  [Role.AGENT]: 10,
  [Role.NEW_USER]: 0,
};
