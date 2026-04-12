import { Controller, Post, Body, Get, Patch, Param, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CasesService } from './cases.service';
import { CasesWebhookService } from './cases-webhook.service';
import { WebhookSecurityGuard } from './guards/webhook-security.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { MANAGEMENT_ROLES } from '../../common/constants/roles.constants';
import { Role } from '@prisma/client';
import { GetCasesDto } from './dto/get-cases.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { SalesforceWebhookDto } from './dto/salesforce-webhook.dto';
import { GasFormWebhookDto } from './dto/gas-form-webhook.dto';
import { CloseCaseWebhookDto } from './dto/close-case-webhook.dto';
import { GasValidatedWebhookDto } from './dto/gas-validated-webhook.dto';
import { GasEvaluationWebhookDto } from './dto/gas-evaluation-webhook.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader, ApiSecurity } from '@nestjs/swagger';

interface RequestWithUser extends Request {
  user: { id: string; email: string; role: Role };
}

@ApiTags('Cases')
@Controller('cases')
export class CasesController {
  constructor(
    private readonly casesService: CasesService,
    private readonly casesWebhookService: CasesWebhookService,
  ) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get All Cases (Unified)',
    description: 'Retrieve cases with dynamic filtering. Agents are restricted to their own assignments, while Management can use all filters.'
  })
  @ApiResponse({ status: 200, description: 'List of cases retrieved successfully.' })
  async getAllCases(@Request() req: RequestWithUser, @Query() query: GetCasesDto) {
    const isManagement = MANAGEMENT_ROLES.includes(req.user.role);

    if (!isManagement) {
      query.agentId = req.user.id;
      delete query.agentEmail;
      delete query.agentName;
    }

    return this.casesService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Case by ID', description: 'Detailed info with all historical assignments.' })
  @ApiResponse({ status: 200, description: 'Case details retrieved successfully.' })
  @ApiResponse({ status: 403, description: 'Access denied — Agent trying to view another agent case.' })
  async getCaseById(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.casesService.findById(id, {
      id: req.user.id,
      role: req.user.role,
    });
  }

  @Patch('assignments/:assignmentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_USER, Role.ADMIN, Role.CMD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manual Assignment Update', description: 'Manually update any field for a specific agent session (Admin/CMD only).' })
  @ApiResponse({ status: 200, description: 'Assignment updated successfully.' })
  async updateAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
    @Request() req: RequestWithUser,
  ) {
    return this.casesService.updateAssignment(assignmentId, dto, req.user);
  }

  @Get('salesforce/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Salesforce Integration Status' })
  @ApiResponse({ status: 200, description: 'Salesforce integration status retrieved successfully.' })
  async getSalesforceStatus() {
    return this.casesService.getSalesforceStatus();
  }

  @Post('webhook/salesforce')
  @Throttle({ webhook: { limit: 200, ttl: 60000 } })
  @UseGuards(WebhookSecurityGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiSecurity('SfApiKey')
  @ApiHeader({ name: 'x-webhook-signature', description: 'HMAC SHA256 Signature of the raw payload', required: true })
  @ApiOperation({ summary: 'Salesforce Webhook', description: 'Triggered when a case is created or assigned in Salesforce.' })
  @ApiResponse({ status: 202, description: 'Webhook received and processed successfully.' })
  async handleSalesforceWebhook(@Body() payload: SalesforceWebhookDto) {
    await this.casesWebhookService.handleSalesforceWebhook(payload);
    return { status: 'processed', message: 'Webhook received and processed synchronously' };
  }

  @Post('webhook/salesforce/close')
  @Throttle({ webhook: { limit: 200, ttl: 60000 } })
  @UseGuards(WebhookSecurityGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiSecurity('SfApiKey')
  @ApiHeader({ name: 'x-webhook-signature', description: 'HMAC SHA256 Signature of the raw payload', required: true })
  @ApiOperation({ summary: 'Salesforce: Close Case' })
  @ApiResponse({ status: 202, description: 'Webhook received and processed successfully.' })
  async handleSalesforceCloseWebhook(@Body() payload: CloseCaseWebhookDto) {
    await this.casesWebhookService.handleSalesforceCloseWebhook(payload);
    return { status: 'processed', message: 'Webhook received and processed synchronously' };
  }

  @Post('webhook/gas-form')
  @Throttle({ webhook: { limit: 200, ttl: 60000 } })
  @UseGuards(WebhookSecurityGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiSecurity('GasApiKey')
  @ApiHeader({ name: 'x-webhook-signature', description: 'HMAC SHA256 Signature', required: true })
  @ApiOperation({ summary: 'GAS: Form Submission (ETA)' })
  @ApiResponse({ status: 202, description: 'Webhook received and processed successfully.' })
  async handleGasFormWebhook(@Body() payload: GasFormWebhookDto) {
    await this.casesWebhookService.handleGasFormWebhook(payload);
    return { status: 'processed', message: 'Webhook received and processed synchronously' };
  }

  @Post('webhook/gas-validated')
  @Throttle({ webhook: { limit: 200, ttl: 60000 } })
  @UseGuards(WebhookSecurityGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiSecurity('GasApiKey')
  @ApiHeader({ name: 'x-webhook-signature', description: 'HMAC SHA256 Signature', required: true })
  @ApiOperation({ summary: 'GAS: Form Validation (Metrics)' })
  @ApiResponse({ status: 202, description: 'Webhook received and processed successfully.' })
  async handleGasValidatedWebhook(@Body() payload: GasValidatedWebhookDto) {
    await this.casesWebhookService.handleGasValidatedWebhook(payload);
    return { status: 'processed', message: 'Webhook received and processed synchronously' };
  }

  @Post('webhook/gas-evaluation')
  @Throttle({ webhook: { limit: 200, ttl: 60000 } })
  @UseGuards(WebhookSecurityGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiSecurity('GasApiKey')
  @ApiHeader({ name: 'x-webhook-signature', description: 'HMAC SHA256 Signature', required: true })
  @ApiOperation({ summary: 'GAS: Evaluation Submission' })
  @ApiResponse({ status: 202, description: 'Webhook received and processed successfully.' })
  async handleGasEvaluationWebhook(@Body() payload: GasEvaluationWebhookDto) {
    await this.casesWebhookService.handleGasEvaluationWebhook(payload);
    return { status: 'processed', message: 'Webhook received and processed synchronously' };
  }

  @Post('webhook/salesforce/heartbeat')
  @Throttle({ webhook: { limit: 200, ttl: 60000 } })
  @UseGuards(WebhookSecurityGuard)
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('SfApiKey')
  @ApiHeader({ name: 'x-webhook-signature', description: 'HMAC SHA256 Signature of the raw payload', required: true })
  @ApiOperation({ summary: 'Salesforce Heartbeat' })
  async handleSalesforceHeartbeat(@Body() body: { timestamp?: string; status?: string; lastSyncStatus?: number }) {
    await this.casesWebhookService.handleSalesforceHeartbeat(body);
    return { status: 'ok', message: 'Heartbeat received' };
  }

}