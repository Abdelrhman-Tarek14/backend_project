import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import type { Request, Response } from 'express';
import { getDoubleCsrfInstance } from './common/utils/csrf.util';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  @ApiOperation({
    summary: 'System Health Check',
    description: 'Returns current server status and version.'
  })
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('csrf')
  @ApiOperation({
    summary: 'Get CSRF Token',
    description: 'Returns a CSRF token.',
  })
  @ApiResponse({ status: 200, description: 'CSRF token generated successfully' })
  getCsrfToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {

    // 👇 التعديل هنا: الدالة اسمها generateCsrfToken
    const { generateCsrfToken } = getDoubleCsrfInstance();
    const csrfToken = generateCsrfToken(req, res);

    return { csrfToken };
  }
}