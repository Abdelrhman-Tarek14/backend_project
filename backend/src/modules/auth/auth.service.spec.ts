import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

describe('AuthService Security Audit', () => {
  let service: AuthService;
  let usersService: UsersService;

  const mockUsersService = {
    findById: jest.fn(),
    update: jest.fn(),
    logUserActivity: jest.fn(),
    findByEmail: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('new_token'),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'jwt.accessSecret') return 'at-secret';
      if (key === 'jwt.refreshSecret') return 'rt-secret';
      return '1h';
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  describe('refreshTokens (Reuse Detection)', () => {
    it('should detect token reuse and invalidate all sessions', async () => {
      const userId = 'user-123';
      const oldRefreshToken = 'stolen-token';
      const storedHashedToken = await bcrypt.hash('different-token', 10);

      mockUsersService.findById.mockResolvedValue({
        id: userId,
        hashedRefreshToken: storedHashedToken,
        role: Role.AGENT,
        isActive: true,
      });

      // Try to refresh with a token that doesn't match the one in DB
      await expect(service.refreshTokens(userId, oldRefreshToken))
        .rejects.toThrow(UnauthorizedException);

      // Verify that the system cleared the stored token as a safety measure
      expect(mockUsersService.update).toHaveBeenCalledWith(userId, { hashedRefreshToken: null });
      expect(mockUsersService.logUserActivity).toHaveBeenCalledWith(userId, 'TOKEN_REUSE_DETECTED');
    });

    it('should allow refresh if token matches and rotation occurs', async () => {
      const userId = 'user-123';
      const validRefreshToken = 'valid-token';
      const hashedToken = await bcrypt.hash(validRefreshToken, 10);

      mockUsersService.findById.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        hashedRefreshToken: hashedToken,
        role: Role.AGENT,
        isActive: true,
      });

      const result = await service.refreshTokens(userId, validRefreshToken);
      
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(mockUsersService.update).toHaveBeenCalled();
    });
  });

  describe('validateLocalAuth (Account Status)', () => {
    it('should block login for NEW_USER role', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'new@example.com',
        role: Role.NEW_USER,
        isActive: true,
        passwordHash: await bcrypt.hash('pass123', 10),
      });

      await expect(service.validateLocalAuth('new@example.com', 'pass123'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should block login for inactive users', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'old@example.com',
        role: Role.AGENT,
        isActive: false,
        passwordHash: await bcrypt.hash('pass123', 10),
      });

      await expect(service.validateLocalAuth('old@example.com', 'pass123'))
        .rejects.toThrow(UnauthorizedException);
    });
  });
});
