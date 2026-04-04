import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Role, User, Prisma } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';

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

    // HIERARCHY CHECK: No one can modify someone of higher or equal rank (except SUPER_USER)
    if (reqRole !== Role.SUPER_USER) {
      if (ROLE_RANK[targetUser.role] >= ROLE_RANK[reqRole]) {
         throw new ForbiddenException(`Insufficient permissions to modify users with ${targetUser.role} rank.`);
      }
      if (data.role && ROLE_RANK[data.role] > ROLE_RANK[reqRole]) {
         throw new ForbiddenException(`You cannot promote a user to a rank higher than yours (${data.role}).`);
      }
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