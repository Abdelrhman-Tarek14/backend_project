import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Role, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async update(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async logUserActivity(userId: string, state: string) {
    return this.prisma.userLog.create({
      data: {
        userId,
        state,
      },
    });
  }

  async findAll(page: number = 1, limit: number = 10, requestingUserRole: string) {
    const skip = (page - 1) * limit;
    
    // -- Dynamic Visibility Rules --
    let whereClause: any = {};
    if (requestingUserRole === 'SUPER_USER' || requestingUserRole === 'ADMIN') {
      whereClause = {}; // Sees all
    } else if (requestingUserRole === 'SUPERVISOR') {
      whereClause = { role: { notIn: [Role.ADMIN, Role.SUPER_USER] } };
    } else if (requestingUserRole === 'CMD' || requestingUserRole === 'LEADER') {
      whereClause = { role: { in: [Role.AGENT, Role.LEADER, Role.CMD] } };
    } else {
      // AGENT, SUPPORT, NEW_USER see no one
      throw new ForbiddenException('You do not have permission to view the user list.');
    }

    const [users, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          isOnline: true,
          lastActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    return {
      data: users,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async updateStatus(targetUserId: string, data: { role?: Role, isActive?: boolean }, requestingUser: any) {
    if (requestingUser.sub === targetUserId) {
      throw new BadRequestException('Self-modification of administrative status is prohibited.');
    }

    const { role: newRole, isActive: newActiveStatus } = data;
    if (newRole === undefined && newActiveStatus === undefined) {
      throw new BadRequestException('At least one status field (role or isActive) must be provided.');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundException('User not found.');

    const reqRole = requestingUser.role as Role;

    // -- Hierarchical Validation --
    if (reqRole === Role.SUPER_USER) {
      // Can do anything
    } else if (reqRole === Role.ADMIN) {
      // Can't target or promote TO SUPER_USER
      if (targetUser.role === Role.SUPER_USER || newRole === Role.SUPER_USER) {
        throw new ForbiddenException('Insufficient permissions to modify Super User accounts.');
      }
    } else if (reqRole === Role.SUPERVISOR) {
      // Can't target or promote to ADMIN or SUPER_USER
      const restrictedRoles: Role[] = [Role.ADMIN, Role.SUPER_USER];
      if (restrictedRoles.includes(targetUser.role) || (newRole && restrictedRoles.includes(newRole))) {
        throw new ForbiddenException('Supervisors can only manage accounts up to Supervisor level.');
      }
    } else {
      throw new ForbiddenException('You do not have permission to modify user status.');
    }

    const updateData: any = {};
    if (newRole !== undefined) updateData.role = newRole;
    if (newActiveStatus !== undefined) updateData.isActive = newActiveStatus;

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
    });
  }
}
