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
import { GasValidatedWebhookDto } from './dto/gas-validated-webhook.dto';
import { GasEvaluationWebhookDto } from './dto/gas-evaluation-webhook.dto';
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
  @ApiOperation({ 
    summary: 'Get All Cases (Unified)', 
    description: 'Retrieve cases with dynamic filtering. Agents are restricted to their own assignments, while Management can use all filters.' 
  })
  async getAllCases(@Request() req: RequestWithUser, @Query() query: GetCasesDto) {
    const managementRoles: Role[] = [Role.SUPER_USER, Role.ADMIN, Role.SUPERVISOR, Role.CMD, Role.LEADER, Role.SUPPORT];
    const isManagement = managementRoles.includes(req.user.role);

    if (!isManagement) {
      // Security Override: Force regular users to see only their own assignments
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

  @Post('webhook/gas-validated')
  @Throttle({ webhook: { limit: 200, ttl: 60000 } })
  @UseGuards(WebhookSecurityGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader({ name: 'x-webhook-signature', description: 'HMAC SHA256 Signature of the raw payload', required: true })
  @ApiOperation({ summary: 'GAS Validated Webhook' })
  @ApiResponse({ status: 202, description: 'Webhook received and processed successfully.' })
  async handleGasValidatedWebhook(@Body() payload: GasValidatedWebhookDto) {
    await this.casesService.handleGasValidatedWebhook(payload);
    return { status: 'processed', message: 'Webhook received and processed synchronously' };
  }

  @Post('webhook/gas-evaluation')
  @Throttle({ webhook: { limit: 200, ttl: 60000 } })
  @UseGuards(WebhookSecurityGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader({ name: 'x-webhook-signature', description: 'HMAC SHA256 Signature of the raw payload', required: true })
  @ApiOperation({ summary: 'GAS Evaluation Webhook' })
  @ApiResponse({ status: 202, description: 'Webhook received and processed successfully.' })
  async handleGasEvaluationWebhook(@Body() payload: GasEvaluationWebhookDto) {
    await this.casesService.handleGasEvaluationWebhook(payload);
    return { status: 'processed', message: 'Webhook received and processed synchronously' };
  }
}