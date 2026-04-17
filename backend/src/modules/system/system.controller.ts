import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SystemService } from './system.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { MANAGEMENT_ROLES } from '../../common/constants/roles.constants';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';

@ApiTags('System')
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Public()
  @Get('maintenance/status')
  @ApiOperation({ summary: 'Get current maintenance mode status' })
  async getStatus() {
    return this.systemService.getMaintenanceStatus();
  }

  @Patch('maintenance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Toggle maintenance mode (Admin only)' })
  @ApiResponse({ status: 200, description: 'Maintenance mode updated' })
  async setMaintenance(@Body('enabled') enabled: boolean) {
    return this.systemService.toggleMaintenance(enabled);
  }

  @Get('health')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Get comprehensive system health metrics (Admin only)' })
  @ApiResponse({ status: 200, description: 'System health retrieved' })
  async getHealth() {
    return this.systemService.getSystemHealth();
  }
}
