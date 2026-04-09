import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AssignmentStatus } from '@prisma/client';
import { SalesforceWebhookDto } from './dto/salesforce-webhook.dto';
import { CloseCaseWebhookDto } from './dto/close-case-webhook.dto';
import { GasFormWebhookDto } from './dto/gas-form-webhook.dto';
import { GasValidatedWebhookDto } from './dto/gas-validated-webhook.dto';
import { GasEvaluationWebhookDto } from './dto/gas-evaluation-webhook.dto';
import { CasesService } from './cases.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class CasesWebhookService {
  private readonly logger = new Logger(CasesWebhookService.name);

  constructor(
    private prisma: PrismaService,
    private casesService: CasesService,
    private realtimeGateway: RealtimeGateway,
  ) { }

  async handleSalesforceWebhook(payload: SalesforceWebhookDto) {
    const { caseNumber, caseAccountName, caseCountry, caseType, caseOwner, caseStartTime } = payload;
    if (!caseNumber) throw new BadRequestException('caseNumber is required');

    const result = await this.prisma.$transaction(async (tx) => {
      const caseRecord = await tx.case.upsert({
        where: { caseNumber },
        create: { caseNumber, accountName: caseAccountName, country: caseCountry },
        update: { accountName: caseAccountName, country: caseCountry, receiveCount: { increment: 1 } },
      });

      const user = caseOwner ? await tx.user.findUnique({ where: { email: caseOwner } }) : null;

      const assignment = await tx.assignment.create({
        data: {
          caseId: caseRecord.id,
          userId: user?.id,
          ownerEmail: caseOwner,
          status: AssignmentStatus.OPEN,
          caseType,
          startTime: caseStartTime ? new Date(caseStartTime) : new Date(),
        },
      });

      await tx.caseLog.create({
        data: {
          assignmentId: assignment.id,
          action: 'SALESFORCE_CASE_CREATED',
          userId: user?.id,
          changes: { caseNumber, caseOwner },
        },
      });

      return { assignment, caseRecord };
    });

    this.casesService.broadcastCaseEvent('case_assigned', {
      caseId: result.caseRecord.id,
      assignmentId: result.assignment.id,
      status: result.assignment.status,
      caseNumber: result.caseRecord.caseNumber,
    }, result.assignment.userId ?? undefined);

    this.casesService.syncQueueTracker().catch(err => this.logger.error('Failed to sync queue tracker', err));

    return result.assignment;
  }

  async handleGasFormWebhook(payload: GasFormWebhookDto) {
    const { caseNumber, caseOwner, formType, caseETA, formSubmitTime } = payload;
    if (!caseNumber || !caseOwner) throw new BadRequestException('caseNumber and caseOwner are required');

    const result = await this.prisma.$transaction(async (tx) => {
      let caseRecord = await tx.case.findUnique({ where: { caseNumber } });
      if (!caseRecord) {
        this.logger.warn(`Case ${caseNumber} received from GAS before Salesforce. Creating stub...`);
        caseRecord = await tx.case.create({ data: { caseNumber } });
      }

      const user = await tx.user.findUnique({ where: { email: caseOwner } });
      if (!user) throw new NotFoundException(`Agent with email ${caseOwner} not found`);

      let assignment = await tx.assignment.findFirst({
        where: { caseId: caseRecord.id, userId: user.id },
        orderBy: { assignedAt: 'desc' },
      });

      const shouldUpdate = assignment && (
        assignment.status === AssignmentStatus.OPEN || assignment.etaMinutes === null
      );

      if (assignment && shouldUpdate) {
        assignment = await tx.assignment.update({
          where: { id: assignment.id },
          data: {
            formType,
            etaMinutes: caseETA ?? assignment.etaMinutes,
            formSubmitTime: formSubmitTime ? new Date(formSubmitTime) : assignment.formSubmitTime,
            etaSetAt: new Date(),
          },
        });
        await tx.caseLog.create({
          data: { assignmentId: assignment.id, action: 'GAS_FORM_UPDATED', userId: user.id, changes: { formType, caseETA } },
        });
      } else {
        assignment = await tx.assignment.create({
          data: {
            caseId: caseRecord.id,
            userId: user.id,
            status: AssignmentStatus.OPEN,
            formType,
            etaMinutes: caseETA,
            formSubmitTime: formSubmitTime ? new Date(formSubmitTime) : new Date(),
            etaSetAt: new Date(),
          },
        });
        await tx.caseLog.create({
          data: { assignmentId: assignment.id, action: 'GAS_FORM_SUBMITTED', userId: user.id, changes: { formType, caseETA } },
        });
      }

      return { assignment, caseRecord };
    });

    this.casesService.broadcastCaseEvent('eta_updated', {
      caseId: result.caseRecord.id,
      assignmentId: result.assignment.id,
      etaMinutes: result.assignment.etaMinutes,
      updatedAt: result.assignment.etaSetAt,
    }, result.assignment.userId ?? undefined);

    return result.assignment;
  }

  async handleSalesforceCloseWebhook(payload: CloseCaseWebhookDto) {
    const { caseNumber, caseOwner } = payload;

    const result = await this.prisma.$transaction(async (tx) => {
      const caseRecord = await tx.case.findUnique({ where: { caseNumber } });
      if (!caseRecord) throw new NotFoundException(`Case ${caseNumber} not found`);

      const user = await tx.user.findUnique({ where: { email: caseOwner } });
      if (!user) throw new NotFoundException(`User ${caseOwner} not found`);

      const openAssignments = await tx.assignment.findMany({
        where: { caseId: caseRecord.id, userId: user.id, status: AssignmentStatus.OPEN },
      });

      if (openAssignments.length === 0) return { count: 0 };

      await tx.assignment.updateMany({
        where: { id: { in: openAssignments.map(a => a.id) } },
        data: { status: AssignmentStatus.CLOSED, closedAt: new Date() },
      });

      await tx.case.update({
        where: { id: caseRecord.id },
        data: { lastClosedAt: new Date() },
      });

      for (const a of openAssignments) {
        await tx.caseLog.create({
          data: { assignmentId: a.id, action: 'SALESFORCE_CASE_CLOSED', userId: user.id, changes: { oldStatus: a.status, newStatus: 'CLOSED' } },
        });
      }

      return { count: openAssignments.length, caseId: caseRecord.id, userId: user.id };
    });

    if (result.count > 0) {
      this.casesService.broadcastLeaderboardUpdate({ status: AssignmentStatus.CLOSED });
      this.casesService.broadcastCaseEvent('case_closed', { caseId: result.caseId, caseNumber, closedCount: result.count }, result.userId ?? undefined);
    }

    this.casesService.syncQueueTracker().catch(err => this.logger.error('Failed to sync queue tracker', err));

    return { count: result.count };
  }

  async handleGasValidatedWebhook(payload: GasValidatedWebhookDto) {
    const { caseNumber, caseOwner, formType, formSubmitTime, items, choices, description, images, tmpAreas, isValid, isOnTime } = payload;
    if (!caseNumber || !caseOwner) throw new BadRequestException('caseNumber and caseOwner are required');

    const result = await this.prisma.$transaction(async (tx) => {
      const caseRecord = await tx.case.findUnique({ where: { caseNumber } });
      if (!caseRecord) throw new NotFoundException(`Case ${caseNumber} not found`);

      const user = await tx.user.findUnique({ where: { email: caseOwner } });
      if (!user) throw new NotFoundException(`User with email ${caseOwner} not found`);

      const assignment = await tx.assignment.findFirst({
        where: { caseId: caseRecord.id, userId: user.id, ...(formSubmitTime ? { formSubmitTime: new Date(formSubmitTime) } : {}) },
        orderBy: { assignedAt: 'desc' }
      });

      if (!assignment) {
        throw new NotFoundException(`Assignment not found for case: ${caseNumber}, user: ${caseOwner}, time: ${formSubmitTime}`);
      }

      const updateData: any = { items, choices, description, images, tmpAreas, isValid, isOnTime };
      if (formType && assignment.formType !== formType) updateData.formType = formType;

      const updatedAssignment = await tx.assignment.update({
        where: { id: assignment.id },
        data: updateData
      });

      await tx.caseLog.create({
        data: { assignmentId: assignment.id, action: 'GAS_EVALUATION_ADDED', userId: user.id, changes: updateData as any }
      });

      return { updatedAssignment, caseId: caseRecord.id, userId: user.id, updateData };
    });

    this.casesService.broadcastCaseEvent('case_evaluated', { ...result.updateData, assignmentId: result.updatedAssignment.id, caseId: result.caseId }, result.userId);
    this.casesService.broadcastLeaderboardUpdate(result.updatedAssignment);

    return result.updatedAssignment;
  }

  async handleGasEvaluationWebhook(payload: GasEvaluationWebhookDto) {
    const { caseNumber, caseOwner, qualityScore, finalCheckScore, evaluationTime } = payload;
    if (!caseNumber || !caseOwner) throw new BadRequestException('caseNumber and caseOwner are required');

    const result = await this.prisma.$transaction(async (tx) => {
      const caseRecord = await tx.case.findUnique({ where: { caseNumber } });
      if (!caseRecord) throw new NotFoundException(`Case ${caseNumber} not found`);

      const user = await tx.user.findUnique({ where: { email: caseOwner } });
      if (!user) throw new NotFoundException(`User with email ${caseOwner} not found`);

      const assignment = await tx.assignment.findFirst({
        where: { caseId: caseRecord.id, userId: user.id },
        orderBy: { assignedAt: 'desc' }
      });

      if (!assignment) throw new NotFoundException('Assignment not found');

      const updateData: any = {};
      if (typeof qualityScore !== 'undefined') updateData.qualityScore = qualityScore;
      if (typeof finalCheckScore !== 'undefined') updateData.finalCheckScore = finalCheckScore;

      const updatedAssignment = await tx.assignment.update({
        where: { id: assignment.id },
        data: updateData
      });

      await tx.caseLog.create({
        data: { assignmentId: assignment.id, action: 'GAS_EVALUATION_ADDED', userId: user.id, changes: { evaluationTime, ...updateData } as any }
      });

      return { updatedAssignment, caseId: caseRecord.id, userId: user.id, updateData };
    });

    this.casesService.broadcastCaseEvent('case_evaluated', { ...result.updateData, assignmentId: result.updatedAssignment.id, caseId: result.caseId }, result.userId);
    this.casesService.broadcastLeaderboardUpdate(result.updatedAssignment);

    return result.updatedAssignment;
  }

  async handleSalesforceHeartbeat() {
    const status = await this.prisma.integrationStatus.upsert({
      where: { system: 'salesforce' },
      create: { system: 'salesforce', status: 'OK' },
      update: { status: 'OK' },
    });
    this.realtimeGateway.server.to('management_dashboard').emit('sf_heartbeat', status);
    return status;
  }
}
