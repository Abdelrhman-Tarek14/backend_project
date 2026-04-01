import { Controller, Post, Body, Get, Patch, Param, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CasesService } from './cases.service';
import { WebhookSecurityGuard } from './guards/webhook-security.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, AssignmentStatus } from '@prisma/client';
import { GetCasesDto } from './dto/get-cases.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { SalesforceWebhookDto } from './dto/salesforce-webhook.dto';
import { GasFormWebhookDto } from './dto/gas-form-webhook.dto';
import { CloseCaseWebhookDto } from './dto/close-case-webhook.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';

interface RequestWithUser extends Request {
  user: { id: string; email: string; role: Role };
}

@ApiTags('Cases')
@Controller('cases')
export class CasesController {
  constructor(
    private readonly casesService: CasesService,
  ) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get All Cases', description: 'Retrieve a paginated list of cases with session-aware filtering.' })
  async getAllCases(@Query() query: GetCasesDto) {
    return this.casesService.findAll(query);
  }

  @Get('my-open')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get My Open Cases', description: 'Retrieve all OPEN assignments for the current user.' })
  async getMyOpenCases(@Request() req: RequestWithUser, @Query() query: GetCasesDto) {
    return this.casesService.findAll({
      ...query,
      status: AssignmentStatus.OPEN,
      agentId: req.user.id,
    });
  }

  @Get('all-open')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_USER, Role.ADMIN, Role.SUPERVISOR, Role.CMD, Role.LEADER, Role.SUPPORT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get All Open Cases', description: 'Retrieve all OPEN assignments across the system (Management/Support only).' })
  async getAllOpenCases(@Query() query: GetCasesDto) {
    return this.casesService.findAll({
      ...query,
      status: AssignmentStatus.OPEN,
    });
  }

  @Get('my-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get My Case History', description: 'Retrieve all CLOSED assignments for the current user.' })
  async getMyHistoryCases(@Request() req: RequestWithUser, @Query() query: GetCasesDto) {
    return this.casesService.findAll({
      ...query,
      status: AssignmentStatus.CLOSED,
      agentId: req.user.id,
    });
  }

  @Get('all-history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_USER, Role.ADMIN, Role.SUPERVISOR, Role.CMD, Role.LEADER, Role.SUPPORT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get All Case History', description: 'Retrieve all CLOSED assignments across the system (Management/Support only).' })
  async getAllHistoryCases(@Query() query: GetCasesDto) {
    return this.casesService.findAll({
      ...query,
      status: AssignmentStatus.CLOSED,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Case by ID', description: 'Detailed info with all historical assignments.' })
  async getCaseById(@Param('id') id: string) {
    return this.casesService.findById(id);
  }

  @Patch('assignments/:assignmentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_USER, Role.ADMIN, Role.CMD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manual Assignment Update', description: 'Manually update any field for a specific agent session (Admin/CMD only).' })
  async updateAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
    @Request() req: RequestWithUser,
  ) {
    return this.casesService.updateAssignment(assignmentId, dto, req.user?.id);
  }

  @Post('webhook/salesforce')
  @Throttle({ webhook: { limit: 200, ttl: 60000 } })
  @UseGuards(WebhookSecurityGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader({ name: 'x-webhook-signature', description: 'HMAC SHA256 Signature of the raw payload', required: true })
  @ApiOperation({ summary: 'Salesforce Webhook' })
  @ApiResponse({ status: 202, description: 'Webhook received and processed successfully.' })
  async handleSalesforceWebhook(@Body() payload: SalesforceWebhookDto) {
    await this.casesService.handleSalesforceWebhook(payload);
    return { status: 'processed', message: 'Webhook received and processed synchronously' };
  }

  @Post('webhook/salesforce/close')
  @Throttle({ webhook: { limit: 200, ttl: 60000 } })
  @UseGuards(WebhookSecurityGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader({ name: 'x-webhook-signature', description: 'HMAC SHA256 Signature of the raw payload', required: true })
  @ApiOperation({ summary: 'Salesforce Case Closure' })
  @ApiResponse({ status: 202, description: 'Webhook received and processed successfully.' })
  async handleSalesforceCloseWebhook(@Body() payload: CloseCaseWebhookDto) {
    await this.casesService.handleSalesforceCloseWebhook(payload);
    return { status: 'processed', message: 'Webhook received and processed synchronously' };
  }

  @Post('webhook/gas-form')
  @Throttle({ webhook: { limit: 200, ttl: 60000 } })
  @UseGuards(WebhookSecurityGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader({ name: 'x-webhook-signature', description: 'HMAC SHA256 Signature of the raw payload', required: true })
  @ApiOperation({ summary: 'GAS Form Webhook' })
  @ApiResponse({ status: 202, description: 'Webhook received and processed successfully.' })
  async handleGasFormWebhook(@Body() payload: GasFormWebhookDto) {
    await this.casesService.handleGasFormWebhook(payload);
    return { status: 'processed', message: 'Webhook received and processed synchronously' };
  }
}