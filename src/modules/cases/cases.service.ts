import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AssignmentStatus, Prisma } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { GetCasesDto } from './dto/get-cases.dto';
import { SalesforceWebhookDto } from './dto/salesforce-webhook.dto';
import { CloseCaseWebhookDto } from './dto/close-case-webhook.dto';
import { GasFormWebhookDto } from './dto/gas-form-webhook.dto';
import { GasValidatedWebhookDto } from './dto/gas-validated-webhook.dto';
import { GasEvaluationWebhookDto } from './dto/gas-evaluation-webhook.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);

  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
  ) { }

  async findAll(query: GetCasesDto) {
    const { page = 1, limit = 10, status, date, agentId, agentEmail, agentName } = query;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.CaseWhereInput = {};

    // Base conditions for assignments
    const assignmentFilters: Prisma.AssignmentWhereInput = {};
    if (status) assignmentFilters.status = status;
    if (agentId) assignmentFilters.userId = agentId;

    if (agentEmail || agentName) {
      assignmentFilters.user = {
        is: {
          ...(agentEmail ? { email: { contains: agentEmail, mode: 'insensitive' } } : {}),
          ...(agentName ? { name: { contains: agentName, mode: 'insensitive' } } : {}),
        },
      };
    }

    // Apply filters to Case whereClause
    if (Object.keys(assignmentFilters).length > 0) {
      whereClause.assignments = { some: assignmentFilters };
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);
      whereClause.createdAt = { gte: startOfDay, lte: endOfDay };
    }

    const [cases, totalCount] = await Promise.all([
      this.prisma.case.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignments: {
            where: assignmentFilters, // Only return relevant assignments for this history view
            include: { user: { select: { id: true, name: true, email: true, role: true } } }
          }
        },
      }),
      this.prisma.case.count({ where: whereClause }),
    ]);

    return {
      data: cases,
      meta: { totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) },
    };
  }

  async findById(id: string) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
            caseLogs: { orderBy: { createdAt: 'desc' } }
          },
          orderBy: { assignedAt: 'desc' }
        }
      },
    });
    if (!caseRecord) throw new NotFoundException('Case not found');
    return caseRecord;
  }

  async updateAssignment(assignmentId: string, data: UpdateAssignmentDto, adminId?: string) {
    // التحقق من وجود المهمة قبل التحديث
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const updatedAssignment = await this.prisma.$transaction(async (tx) => {
      const updatedAssignment = await tx.assignment.update({
        where: { id: assignmentId },
        data: {
          ...data,
          startTime: data.startTime ? new Date(data.startTime) : undefined,
          closedAt: data.closedAt ? new Date(data.closedAt) : undefined,
        },
      });

      await tx.caseLog.create({
        data: {
          assignmentId,
          action: 'MANUAL_ASSIGNMENT_UPDATE',
          userId: adminId,
          changes: data as any,
        },
      });

      return updatedAssignment;
    });

    this.broadcastCaseEvent('case_updated', {
      caseId: updatedAssignment.caseId,
      assignmentId: updatedAssignment.id,
      ...data,
    }, updatedAssignment.userId ?? undefined);

    this.broadcastLeaderboardUpdate(updatedAssignment);

    return updatedAssignment;
  }

  async handleSalesforceWebhook(payload: SalesforceWebhookDto) {
    const { caseNumber, caseAccountName, caseCountry, caseType, caseOwner, caseStartTime } = payload;
    if (!caseNumber) throw new BadRequestException('caseNumber is required');

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Upsert Case داخل الترانزاكشن لضمان الذرية (Atomicity)
      const caseRecord = await tx.case.upsert({
        where: { caseNumber },
        create: { caseNumber, accountName: caseAccountName, country: caseCountry },
        update: { accountName: caseAccountName, country: caseCountry, receiveCount: { increment: 1 } },
      });

      // 2. البحث عن الموظف
      const user = caseOwner ? await tx.user.findUnique({ where: { email: caseOwner } }) : null;

      // 3. إنشاء التعيين الجديد
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

    this.broadcastCaseEvent('case_assigned', {
      caseId: result.caseRecord.id,
      assignmentId: result.assignment.id,
      status: result.assignment.status,
      caseNumber: result.caseRecord.caseNumber,
    }, result.assignment.userId ?? undefined);

    return result.assignment;
  }

  async handleGasFormWebhook(payload: GasFormWebhookDto) {
    const { caseNumber, caseOwner, formType, caseETA, formSubmitTime } = payload;
    if (!caseNumber || !caseOwner) throw new BadRequestException('caseNumber and caseOwner are required');

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. التأكد من وجود الحالة
      let caseRecord = await tx.case.findUnique({ where: { caseNumber } });
      if (!caseRecord) {
        this.logger.warn(`Case ${caseNumber} received from GAS before Salesforce. Creating stub...`);
        caseRecord = await tx.case.create({ data: { caseNumber } });
      }

      // 2. البحث عن الموظف
      const user = await tx.user.findUnique({ where: { email: caseOwner } });
      if (!user) throw new NotFoundException(`Agent with email ${caseOwner} not found`);

      // 3. منطق التحديث أو الإنشاء (Latest Assignment)
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

    this.broadcastCaseEvent('eta_updated', {
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
       for (let i = 0; i < result.count; i++) {
          this.broadcastLeaderboardUpdate({ status: AssignmentStatus.CLOSED });
       }
       this.broadcastCaseEvent('case_closed', { caseId: result.caseId, caseNumber, closedCount: result.count }, result.userId ?? undefined);
    }

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

      const assignmentQuery: any = {
        caseId: caseRecord.id,
        userId: user.id
      };
      
      if (formSubmitTime) {
         assignmentQuery.formSubmitTime = new Date(formSubmitTime);
      }

      const assignment = await tx.assignment.findFirst({
        where: assignmentQuery,
        orderBy: { assignedAt: 'desc' }
      });

      if (!assignment) {
         throw new NotFoundException(`Assignment not found for case: ${caseNumber}, user: ${caseOwner}, time: ${formSubmitTime}`);
      }

      const updateData: any = { items, choices, description, images, tmpAreas, isValid, isOnTime };
      if (formType && assignment.formType !== formType) {
        updateData.formType = formType;
      }

      const updatedAssignment = await tx.assignment.update({
        where: { id: assignment.id },
        data: updateData
      });

      await tx.caseLog.create({
         data: {
            assignmentId: assignment.id,
            action: 'GAS_EVALUATION_ADDED',
            userId: user.id,
            changes: updateData
         }
      });

      return { updatedAssignment, caseId: caseRecord.id, userId: user.id, updateData };
    });

    this.broadcastCaseEvent('case_evaluated', { ...result.updateData, assignmentId: result.updatedAssignment.id, caseId: result.caseId }, result.userId);

    this.broadcastLeaderboardUpdate(result.updatedAssignment);

    return result.updatedAssignment;
  }

  async handleGasEvaluationWebhook(payload: GasEvaluationWebhookDto) {
    const { caseNumber, caseOwner, evaluationTime, qualityScore, finalCheckScore } = payload;
    if (!caseNumber || !caseOwner) throw new BadRequestException('caseNumber and caseOwner are required');

    const result = await this.prisma.$transaction(async (tx) => {
      const caseRecord = await tx.case.findUnique({ where: { caseNumber } });
      if (!caseRecord) throw new NotFoundException(`Case ${caseNumber} not found`);

      const user = await tx.user.findUnique({ where: { email: caseOwner } });
      if (!user) throw new NotFoundException(`User with email ${caseOwner} not found`);

      const assignmentQuery: any = {
        caseId: caseRecord.id,
        userId: user.id
      };

      const assignment = await tx.assignment.findFirst({
        where: assignmentQuery,
        orderBy: { assignedAt: 'desc' }
      });

      if (!assignment) {
         throw new NotFoundException(`Assignment not found for case: ${caseNumber}, user: ${caseOwner}`);
      }

      const updateData: any = {};
      if (typeof qualityScore !== 'undefined') updateData.qualityScore = qualityScore;
      if (typeof finalCheckScore !== 'undefined') updateData.finalCheckScore = finalCheckScore;

      const updatedAssignment = await tx.assignment.update({
        where: { id: assignment.id },
        data: updateData
      });

      await tx.caseLog.create({
         data: {
            assignmentId: assignment.id,
            action: 'GAS_EVALUATION_ADDED',
            userId: user.id,
            changes: { evaluationTime, ...updateData }
         }
      });

      return { updatedAssignment, caseId: caseRecord.id, userId: user.id, updateData };
    });

    this.broadcastCaseEvent('case_evaluated', { ...result.updateData, assignmentId: result.updatedAssignment.id, caseId: result.caseId }, result.userId);

    this.broadcastLeaderboardUpdate(result.updatedAssignment);

    return result.updatedAssignment;
  }

  private broadcastCaseEvent(eventName: string, payload: any, userId?: string) {
    this.realtimeGateway.server.to('management_dashboard').emit(eventName, payload);
    if (userId) {
      this.realtimeGateway.server.to(`user:${userId}`).emit(eventName, payload);
    }
  }

  private broadcastLeaderboardUpdate(assignment: { status: AssignmentStatus }) {
    if (assignment.status === AssignmentStatus.CLOSED) {
      this.realtimeGateway.server.to('management_dashboard').emit('leaderboard_updated');
    }
  }
}