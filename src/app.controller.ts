import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import type { Request, Response } from 'express';
import { doubleCsrf } from 'csrf-csrf';
import { ConfigService } from '@nestjs/config';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'System Health Check', description: 'Returns current server status and version.' })
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('csrf')
  @ApiOperation({
    summary: 'Get CSRF Token',
    description: 'Returns a CSRF token. The frontend must call this endpoint first and include the returned token in the `x-csrf-token` header for all state-changing requests (POST, PATCH, DELETE).',
  })
  @ApiResponse({ status: 200, description: 'CSRF token generated successfully', schema: { type: 'object', properties: { csrfToken: { type: 'string' } } } })
  getCsrfToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { generateCsrfToken } = doubleCsrf({
      getSecret: () => this.configService.get<string>('CSRF_SECRET') ?? 'default-csrf-secret-change-me',
      getSessionIdentifier: (r) => (r as any).cookies?.['access_token'] ?? r.ip,
      cookieName: '__Host-csrf',
      cookieOptions: {
        httpOnly: true,
        sameSite: 'lax',
        secure: this.configService.get<string>('NODE_ENV') === 'production',
        path: '/',
      },
      getCsrfTokenFromRequest: (r) => r.headers['x-csrf-token'] as string,
    });
    const csrfToken = generateCsrfToken(req, res);
    return { csrfToken };
  }
}
