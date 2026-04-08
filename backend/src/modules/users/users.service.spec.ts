import { Test, TestingModule } from '@nestjs/testing';
import { ModuleRef } from '@nestjs/core';
import { UsersService } from './users.service.js';
import { PrismaService } from '../../database/prisma.service';
import { Role } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

describe('UsersService Hierarchy Audit', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userLog: {
      create: jest.fn(),
    },
  };

  const mockRealtimeGateway = {
    server: {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    },
  };

  const mockModuleRef = {
    get: jest.fn().mockReturnValue(mockRealtimeGateway),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ModuleRef, useValue: mockModuleRef },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should prevent an ADMIN from upgrading a user to SUPER_USER', async () => {
    const adminUser = { id: 'admin1', role: Role.ADMIN };
    const targetUser = { id: 'user1', role: Role.AGENT };
    const newStatus = { role: Role.SUPER_USER };

    mockPrismaService.user.findUnique.mockResolvedValue(targetUser);

    await expect(service.updateStatus(targetUser.id, newStatus, adminUser as any))
      .rejects.toThrow(ForbiddenException);

    expect(mockPrismaService.user.update).not.toHaveBeenCalled();
  });

  it('should prevent a user from modifying another user of equal or higher rank', async () => {
    const admin1 = { id: 'admin1', role: Role.ADMIN };
    const admin2 = { id: 'admin2', role: Role.ADMIN };
    const newStatus = { isActive: false };

    mockPrismaService.user.findUnique.mockResolvedValue(admin2);

    await expect(service.updateStatus(admin2.id, newStatus, admin1 as any))
      .rejects.toThrow(ForbiddenException);
  });

  it('should allow a SUPER_USER to modify anyone', async () => {
    const superUser = { id: 'super1', role: Role.SUPER_USER };
    const adminUser = { id: 'admin1', role: Role.ADMIN };
    const newStatus = { isActive: false };

    mockPrismaService.user.findUnique.mockResolvedValue(adminUser);
    mockPrismaService.user.update.mockResolvedValue({ ...adminUser, ...newStatus });

    const result = await service.updateStatus(adminUser.id, newStatus, superUser as any);

    expect(result.isActive).toBe(false);
    expect(mockPrismaService.user.update).toHaveBeenCalled();
  });

  it('should allow an ADMIN to upgrade an AGENT to LEADER', async () => {
    const adminUser = { id: 'admin1', role: Role.ADMIN };
    const agentUser = { id: 'agent1', role: Role.AGENT };
    const newStatus = { role: Role.LEADER };

    mockPrismaService.user.findUnique.mockResolvedValue(agentUser);
    mockPrismaService.user.update.mockResolvedValue({ ...agentUser, ...newStatus });

    const result = await service.updateStatus(agentUser.id, newStatus, adminUser as any);

    expect(result.role).toBe(Role.LEADER);
  });

  it('should emit force_logout when deactivating a user', async () => {
    const superUser = { id: 'super1', role: Role.SUPER_USER };
    const agentUser = { id: 'agent1', role: Role.AGENT };
    const newStatus = { isActive: false };

    mockPrismaService.user.findUnique.mockResolvedValue(agentUser);
    mockPrismaService.user.update.mockResolvedValue({ ...agentUser, ...newStatus });

    await service.updateStatus(agentUser.id, newStatus, superUser as any);

    expect(mockRealtimeGateway.server.to).toHaveBeenCalledWith(`user:${agentUser.id}`);
    expect(mockRealtimeGateway.server.to('').emit).toHaveBeenCalledWith(
      'force_logout',
      expect.objectContaining({ message: expect.any(String) })
    );
  });
});