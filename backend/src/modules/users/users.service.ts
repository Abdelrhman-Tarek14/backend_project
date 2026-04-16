import { Injectable, ForbiddenException, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { Role, Prisma } from '@prisma/client';
import { ROLE_RANK } from './users.constants.js';
import { UserEntity } from './entities/user.entity';
import type { RealtimeGateway } from '../realtime/realtime.gateway.js';

@Injectable()
export class UsersService implements OnModuleInit {
  private realtimeGateway: RealtimeGateway;

  constructor(
    private prisma: PrismaService,
    private moduleRef: ModuleRef,
  ) { }

  async onModuleInit() {
    const { RealtimeGateway } = await import('../realtime/realtime.gateway.js');
    this.realtimeGateway = this.moduleRef.get(RealtimeGateway, { strict: false });
  }

  async create(data: {
    email: string;
    name: string;
    googleId?: string;
    pictureUrl?: string | null;
    role?: Role;
    isActive?: boolean;
  }): Promise<UserEntity> {
    const user = await this.prisma.user.create({ data });
    return new UserEntity(user);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? new UserEntity(user) : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? new UserEntity(user) : null;
  }

  async findByGoogleId(googleId: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { googleId } });
    return user ? new UserEntity(user) : null;
  }

  async logUserActivity(userId: string, state: string) {
    return this.prisma.userLog.create({
      data: { userId, state },
    });
  }

  async findAll(page: number = 1, limit: number = 10, requestingUserRole: Role) {
    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

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
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          displayName: true,
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
      data: users.map(user => new UserEntity(user)),
      meta: {
        totalCount,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(totalCount / safeLimit),
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
    data: { role?: Role; isActive?: boolean; leaderId?: string | null },
    requestingUser: { sub: string; role: Role }
  ) {
    if (requestingUser.sub === targetUserId) {
      throw new BadRequestException('Self-modification of administrative status is prohibited.');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundException('User not found.');

    const reqRole = requestingUser.role;

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

    if (data.isActive !== undefined || data.role !== undefined) {
      this.realtimeGateway.server.to(`user:${targetUserId}`).emit('user_status_changed', {
        message: 'Your account status or role has been updated by an administrator.',
      });
    }

    return updatedUser;
  }

  async setOnlineStatus(userId: string, isOnline: boolean) {
    return this.prisma.$executeRaw`
      UPDATE "User"
      SET "isOnline" = ${isOnline}, "lastActive" = CURRENT_TIMESTAMP
      WHERE "id" = ${userId}
    `;
  }
}