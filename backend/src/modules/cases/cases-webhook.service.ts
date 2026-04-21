import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AssignmentStatus } from '@prisma/client';
import { SalesforceWebhookDto } from './dto/salesforce-webhook.dto';
import { CloseCaseWebhookDto } from './dto/close-case-webhook.dto';
import { SheetValidatedWebhookDto } from './dto/sheet-validated-webhook.dto';
import { SheetEvaluationWebhookDto } from './dto/sheet-evaluation-webhook.dto';
import { SheetFormDto } from './dto/sheet-form.dto';
import { CasesService } from './cases.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class CasesWebhookService {
  private readonly logger = new Logger(CasesWebhookService.name);

  constructor(
    private prisma: PrismaService,
    private casesService: CasesService,
    @Inject(forwardRef(() => RealtimeGateway))
    private realtimeGateway: RealtimeGateway,
  ) { }

  @OnEvent('sf.status.changed')
  handleStatusChangeEvent(payload: { status: string }) {
    this.handleSalesforceHeartbeat({ status: payload.status });
  }

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

      const existingAssignment = await tx.assignment.findFirst({
        where: {
          caseId: caseRecord.id,
          status: AssignmentStatus.OPEN,
          OR: [
            { ownerEmail: caseOwner },
            ...(user ? [{ userId: user.id }] : [])
          ]
        }
      });

      let assignment;
      if (existingAssignment) {
        assignment = await tx.assignment.update({
          where: { id: existingAssignment.id },
          data: {
            caseType,
            startTime: caseStartTime ? new Date(caseStartTime) : existingAssignment.startTime,
            userId: user?.id || existingAssignment.userId,
          }
        });

        await tx.caseLog.create({
          data: {
            assignmentId: assignment.id,
            action: 'SALESFORCE_CASE_UPDATED',
            userId: user?.id,
            changes: { caseNumber, caseOwner },
          },
        });
      } else {
        assignment = await tx.assignment.create({
          data: {
            caseId: caseRecord.id,
            userId: user?.id,
            ownerEmail: caseOwner,
            assignedBy: 'Synced',
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
      }

      return { assignment, caseRecord };
    });

    this.casesService.broadcastCaseEvent('case_updated', {
      caseId: result.caseRecord.id,
      assignmentId: result.assignment.id,
      caseNumber: result.caseRecord.caseNumber,
      status: result.assignment.status,
      caseType: result.assignment.caseType,
      startTime: result.assignment.startTime,
    }, result.assignment.userId ?? undefined);

    this.casesService.syncQueueTracker().catch(err => this.logger.error('Failed to sync queue tracker', err));

    return result.assignment;
  }


  async handleSalesforceCloseWebhook(payload: CloseCaseWebhookDto) {
    const { caseNumber, caseOwner } = payload;

    const result = await this.prisma.$transaction(async (tx) => {
      const caseRecord = await tx.case.findUnique({ where: { caseNumber } });
      if (!caseRecord) throw new NotFoundException(`Case ${caseNumber} not found`);

      const user = await tx.user.findUnique({ where: { email: caseOwner } });

      const openAssignments = await tx.assignment.findMany({
        where: {
          caseId: caseRecord.id,
          ownerEmail: caseOwner,
          status: AssignmentStatus.OPEN
        },
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
          data: {
            assignmentId: a.id,
            action: 'SALESFORCE_CASE_CLOSED',
            userId: user?.id,
            changes: { oldStatus: a.status, newStatus: 'CLOSED' }
          },
        });
      }

      return { count: openAssignments.length, caseId: caseRecord.id, userId: user?.id };
    });

    if (result.count > 0) {
      this.casesService.broadcastLeaderboardUpdate({ status: AssignmentStatus.CLOSED });
      this.casesService.broadcastCaseEvent('case_closed', { caseId: result.caseId, caseNumber, closedCount: result.count }, result.userId ?? undefined);
    }

    this.casesService.syncQueueTracker().catch(err => this.logger.error('Failed to sync queue tracker', err));

    return { count: result.count };
  }

  async handleSheetValidatedWebhook(payload: SheetValidatedWebhookDto) {
    const { caseNumber, caseOwner, formType, formSubmitTime, items, choices, description, images, tmpAreas, formValidation, isOnTime } = payload;
    if (!caseNumber || !caseOwner) throw new BadRequestException('caseNumber and caseOwner are required');

    const result = await this.prisma.$transaction(async (tx) => {
      const caseRecord = await tx.case.findUnique({ where: { caseNumber } });
      if (!caseRecord) throw new NotFoundException(`Case ${caseNumber} not found`);

      const user = await tx.user.findUnique({ where: { email: caseOwner } });

      const assignment = await tx.assignment.findFirst({
        where: { caseId: caseRecord.id, ownerEmail: caseOwner, ...(formSubmitTime ? { formSubmitTime: new Date(formSubmitTime) } : {}) },
        orderBy: { startTime: 'desc' }
      });

      if (!assignment) {
        throw new NotFoundException(`Assignment not found for case: ${caseNumber}, user: ${caseOwner}, time: ${formSubmitTime}`);
      }

      const updateData: any = { items, choices, description, images, tmpAreas, formValidation };

      // Update ETA if provided
      if (payload.eta !== undefined) {
        updateData.etaMinutes = payload.eta;
      }

      // Calculate isOnTime on server based on startTime (Business Rule: Start Time = startTime)
      const currentEta = payload.eta !== undefined ? payload.eta : assignment.etaMinutes;
      const baseStartTime = assignment.startTime; // Ground truth
      const submitTime = formSubmitTime ? new Date(formSubmitTime) : assignment.formSubmitTime;

      if (baseStartTime && currentEta && submitTime) {
        const limit = new Date(baseStartTime.getTime() + currentEta * 60000);
        updateData.isOnTime = submitTime <= limit;
      } else {
        // Fallback if we can't calculate but it was provided in payload
        if (isOnTime !== undefined) updateData.isOnTime = isOnTime;
      }


      if (formType && assignment.formType !== formType) updateData.formType = formType;

      const updatedAssignment = await tx.assignment.update({
        where: { id: assignment.id },
        data: updateData
      });

      await tx.caseLog.create({
        data: { assignmentId: assignment.id, action: 'SHEET_EVALUATION_ADDED', userId: user?.id, changes: updateData as any }
      });


      return { updatedAssignment, caseId: caseRecord.id, userId: user?.id, updateData };
    });

    this.casesService.broadcastCaseEvent('case_updated', {
      ...result.updateData,
      eta: result.updatedAssignment.etaMinutes,
      assignmentId: result.updatedAssignment.id,
      caseId: result.caseId
    }, result.userId);
    this.casesService.broadcastLeaderboardUpdate(result.updatedAssignment);

    return result.updatedAssignment;
  }

  async handleSheetEvaluationWebhook(payload: SheetEvaluationWebhookDto) {
    const { caseNumber, caseOwner, qualityScore, finalCheckScore, evaluationTime } = payload;
    if (!caseNumber || !caseOwner) throw new BadRequestException('caseNumber and caseOwner are required');

    const result = await this.prisma.$transaction(async (tx) => {
      const caseRecord = await tx.case.findUnique({ where: { caseNumber } });
      if (!caseRecord) throw new NotFoundException(`Case ${caseNumber} not found`);

      const user = await tx.user.findUnique({ where: { email: caseOwner } });

      const assignment = await tx.assignment.findFirst({
        where: { caseId: caseRecord.id, ownerEmail: caseOwner },
        orderBy: { startTime: 'desc' }
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
        data: { assignmentId: assignment.id, action: 'SHEET_EVALUATION_ADDED', userId: user?.id, changes: { evaluationTime, ...updateData } as any }
      });

      return { updatedAssignment, caseId: caseRecord.id, userId: user?.id, updateData };
    });

    this.casesService.broadcastCaseEvent('case_updated', {
      ...result.updateData,
      assignmentId: result.updatedAssignment.id,
      caseId: result.caseId
    }, result.userId);
    this.casesService.broadcastLeaderboardUpdate(result.updatedAssignment);

    return result.updatedAssignment;
  }

  async handleSalesforceHeartbeat(payload?: { timestamp?: string; status?: string; lastSyncStatus?: number | null }) {
    const syncStatus = payload?.lastSyncStatus ?? null;
    const sfStatus = payload?.status ?? 'OK';
    const integrationStatus = await this.prisma.integrationStatus.upsert({
      where: { system: 'salesforce' },
      create: { system: 'salesforce', status: sfStatus, lastSyncStatus: syncStatus },
      update: { status: sfStatus, lastSyncStatus: syncStatus },
    });
    this.realtimeGateway.server.to('management_dashboard').emit('sf_heartbeat', integrationStatus);
    return integrationStatus;
  }

  async handleSheetOpenCases(payload: SheetFormDto) {
    const {
      caseNumber, caseOwner, formType, formSubmitTime,
      items, choices, description, images, tmpAreas,
      formValidation, eta
    } = payload;

    if (!caseNumber || !caseOwner) throw new BadRequestException('caseNumber and caseOwner are required');

    const result = await this.prisma.$transaction(async (tx) => {
      let caseRecord = await tx.case.findUnique({ where: { caseNumber } });
      if (!caseRecord) {
        this.logger.warn(`Case ${caseNumber} received from Sheet before Salesforce. Creating stub...`);
        caseRecord = await tx.case.create({ data: { caseNumber } });
      }

      const user = await tx.user.findUnique({ where: { email: caseOwner } });

      let assignment = await tx.assignment.findFirst({
        where: { caseId: caseRecord.id, ownerEmail: caseOwner },
        orderBy: { startTime: 'desc' },
      });

      const shouldUpdate = assignment && (
        assignment.status === AssignmentStatus.OPEN || assignment.etaMinutes === null
      );

      const commonData: any = {
        formType, items, choices, description, images, tmpAreas, formValidation,
        etaMinutes: eta,
        formSubmitTime: formSubmitTime ? new Date(formSubmitTime) : new Date(),
      };

      if (assignment && shouldUpdate) {
        const currentEta = eta !== undefined ? eta : assignment.etaMinutes;
        const baseStartTime = assignment.startTime;
        const submitTime = commonData.formSubmitTime;

        if (baseStartTime && currentEta) {
          const limit = new Date(baseStartTime.getTime() + currentEta * 60000);
          commonData.isOnTime = submitTime <= limit;
        }

        if (eta === undefined) delete commonData.etaMinutes;

        assignment = await tx.assignment.update({
          where: { id: assignment.id },
          data: commonData,
        });

        await tx.caseLog.create({
          data: { assignmentId: assignment.id, action: 'SHEET_FORM_UPDATED', userId: user?.id, changes: commonData },
        });

      } else {
        assignment = await tx.assignment.create({
          data: {
            caseId: caseRecord.id, userId: user?.id, ownerEmail: caseOwner,
            status: AssignmentStatus.OPEN,
            ...commonData
          },
        });

        await tx.caseLog.create({
          data: { assignmentId: assignment.id, action: 'SHEET_FORM_SUBMITTED', userId: user?.id, changes: commonData },
        });
      }

      return { assignment, caseRecord, user };
    });

    this.casesService.broadcastCaseEvent('case_updated', {
      caseId: result.caseRecord.id, assignmentId: result.assignment.id,
      eta: result.assignment.etaMinutes, formType: result.assignment.formType,
      updatedAt: new Date(), items, choices, description, tmpAreas
    }, result.assignment.userId ?? undefined);

    this.casesService.broadcastLeaderboardUpdate(result.assignment);

    return result.assignment;
  }

}
