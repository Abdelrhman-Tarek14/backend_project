import { Controller, Post, Body, Get, Patch, Param, Query, UseGuards, Request, SetMetadata } from '@nestjs/common';
import { CasesService } from './cases.service';
import { GasWebhookGuard } from './guards/gas-webhook.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, AssignmentStatus } from '@prisma/client';
import { GetCasesDto } from './dto/get-cases.dto';
import { UpdateAssignmentStatusDto } from './dto/update-case-status.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiSecurity, ApiParam } from '@nestjs/swagger';

@ApiTags('Cases')
@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get All Cases', description: 'Retrieve a paginated list of cases with session-aware filtering.' })
  async getAllCases(@Query() query: GetCasesDto) {
    return this.casesService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Case by ID', description: 'Detailed info with all historical assignments.' })
  async getCaseById(@Param('id') id: string) {
    return this.casesService.findById(id);
  }

  @Patch('assignments/:assignmentId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_USER, Role.ADMIN, Role.SUPERVISOR, Role.CMD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update Assignment Status', description: 'Open/Close a specific agent session.' })
  async updateAssignmentStatus(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentStatusDto,
    @Request() req: any,
  ) {
    return this.casesService.updateAssignmentStatus(assignmentId, dto.status, req.user?.sub);
  }

  @Post('webhook/salesforce')
  @UseGuards(GasWebhookGuard) // Reusing the same API key logic for now
  @ApiSecurity('GasApiKey')
  @ApiOperation({ summary: 'Salesforce Webhook', description: 'Ingest static case data from Salesforce.' })
  async handleSalesforceWebhook(@Body() payload: any) {
    return this.casesService.handleSalesforceWebhook(payload);
  }

  @Post('webhook/gas')
  @UseGuards(GasWebhookGuard)
  @ApiSecurity('GasApiKey')
  @ApiOperation({ summary: 'GAS Webhook', description: 'Create new agent assignments/sessions based on form fills.' })
  async handleGasWebhook(@Body() payload: any) {
    return this.casesService.handleGasWebhook(payload);
  }
}


