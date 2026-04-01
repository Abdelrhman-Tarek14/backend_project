import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Role, User, Prisma } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => RealtimeGateway))
    private realtimeGateway: RealtimeGateway,
  ) { }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async logUserActivity(userId: string, state: string) {
    return this.prisma.userLog.create({
      data: {
        userId,
        state,
      },
    });
  }

  async findAll(page: number = 1, limit: number = 10, requestingUserRole: Role) {
    const skip = (page - 1) * limit;

    let whereClause: Prisma.UserWhereInput = {};

    if (requestingUserRole === Role.SUPER_USER || requestingUserRole === Role.ADMIN) {
      whereClause = {};
    } else if (requestingUserRole === Role.SUPERVISOR) {
      whereClause = { role: { notIn: [Role.ADMIN, Role.SUPER_USER] } };
    } else if (requestingUserRole === Role.CMD || requestingUserRole === Role.LEADER) {
      whereClause = { role: { in: [Role.AGENT, Role.LEADER, Role.CMD] } };
    } else {
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
          leaderId: true,
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

  async update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateStatus(
    targetUserId: string,
    data: { role?: Role, isActive?: boolean, leaderId?: string | null },
    requestingUser: { sub: string, role: Role }
  ) {
    if (requestingUser.sub === targetUserId) {
      throw new BadRequestException('Self-modification of administrative status is prohibited.');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundException('User not found.');

    const reqRole = requestingUser.role;

    if (reqRole === Role.SUPER_USER) {
    } else if (reqRole === Role.ADMIN) {
      if (targetUser.role === Role.SUPER_USER || data.role === Role.SUPER_USER) {
        throw new ForbiddenException('Insufficient permissions to modify Super User accounts.');
      }
    } else if (reqRole === Role.SUPERVISOR) {
      const restrictedRoles: Role[] = [Role.ADMIN, Role.SUPER_USER];
      if (restrictedRoles.includes(targetUser.role) || (data.role && restrictedRoles.includes(data.role))) {
        throw new ForbiddenException('Supervisors can only manage accounts up to Supervisor level.');
      }
    } else {
      throw new ForbiddenException('You do not have permission to modify user status.');
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (data.leaderId !== undefined) {
      if (data.leaderId === null) {
        updateData.leader = { disconnect: true };
      } else {
        const leaderExists = await this.prisma.user.findUnique({ where: { id: data.leaderId } });
        if (!leaderExists) throw new NotFoundException('The specified Team Leader was not found.');
        updateData.leader = { connect: { id: data.leaderId } };
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
    });

    if (data.isActive === false) {
      this.realtimeGateway.server.to(`user:${targetUserId}`).emit('force_logout', {
        message: 'Your account has been deactivated by an administrator.'
      });
    }

    return updatedUser;
  }

  async setOnlineStatus(userId: string, isOnline: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isOnline,
        lastActive: new Date()
      },
    });
  }
}