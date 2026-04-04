import { Test, TestingModule } from '@nestjs/testing';
import { WebhookSecurityGuard } from './webhook-security.guard';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

describe('WebhookSecurityGuard Audit', () => {
  let guard: WebhookSecurityGuard;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'allowedWebhookIps') return ['127.0.0.1'];
      if (key === 'webhookSecret') return 'test-secret';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookSecurityGuard,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    guard = module.get<WebhookSecurityGuard>(WebhookSecurityGuard);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should normalize IPv6-mapped IPv4 and allow it if in allowlist', () => {
    const mockRequest: any = {
      ip: '::ffff:127.0.0.1',
      headers: { 'x-webhook-signature': 'valid' },
      rawBody: Buffer.from('payload'),
      socket: { remoteAddress: '::ffff:127.0.0.1' },
    };

    const mockContext: any = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    };

    // Mock HMAC signature to match
    const hmac = crypto.createHmac('sha256', 'test-secret');
    const validSignature = hmac.update(mockRequest.rawBody).digest('hex');
    mockRequest.headers['x-webhook-signature'] = validSignature;

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should throw ForbiddenException for unauthorized IP', () => {
    const mockRequest: any = {
      ip: '1.2.3.4',
      headers: { 'x-webhook-signature': 'valid' },
      rawBody: Buffer.from('payload'),
      socket: { remoteAddress: '1.2.3.4' },
    };

    const mockContext: any = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    };

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });

  it('should throw UnauthorizedException for missing signature', () => {
    const mockRequest: any = {
      ip: '127.0.0.1',
      headers: {},
      rawBody: Buffer.from('payload'),
      socket: { remoteAddress: '127.0.0.1' },
    };

    const mockContext: any = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    };

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });
});
