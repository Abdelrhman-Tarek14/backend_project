import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AssignmentStatus } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { GetCasesDto } from './dto/get-cases.dto';
import { SalesforceWebhookDto } from './dto/salesforce-webhook.dto';
import { CloseCaseWebhookDto } from './dto/close-case-webhook.dto';
import { GasFormWebhookDto } from './dto/gas-form-webhook.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@Injectable()
export class CasesService {
  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  async findAll(query: GetCasesDto) {
    const { page = 1, limit = 10, status, date, agentId } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (status) {
      whereClause.assignments = {
        some: { status: status as AssignmentStatus },
      };
    }
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);
      whereClause.createdAt = { gte: startOfDay, lte: endOfDay };
    }

    if (agentId) {
      whereClause.assignments = {
        some: { 
          ...whereClause.assignments?.some,
          userId: agentId 
        },
      };
    }

    const [cases, totalCount] = await Promise.all([
      this.prisma.case.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { assignments: { include: { user: true } } },
      }),
      this.prisma.case.count({ where: whereClause }),
    ]);

    return {
      data: cases,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async findById(id: string) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id },
      include: { 
        assignments: { 
          include: { 
            user: true, 
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
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');

    return this.prisma.$transaction(async (prisma) => {
      const updatedAssignment = await prisma.assignment.update({
        where: { id: assignmentId },
        data: {
          ...data,
          startTime: data.startTime ? new Date(data.startTime) : undefined,
          closedAt: data.closedAt ? new Date(data.closedAt) : undefined,
        },
      });

      await prisma.caseLog.create({
        data: {
          assignmentId,
          action: 'MANUAL_ASSIGNMENT_UPDATE',
          userId: adminId,
          changes: { ...data },
        },
      });

      return updatedAssignment;
    });
  }

  async handleSalesforceWebhook(payload: SalesforceWebhookDto) {
    const { 
      caseNumber, 
      caseAccountName, 
      caseCountry, 
      caseType, 
      caseOwner, // email
      caseStartTime 
    } = payload;
    
    if (!caseNumber) throw new BadRequestException('caseNumber is required');

    // 1. Upsert Case
    const caseRecord = await this.prisma.case.upsert({
      where: { caseNumber },
      create: { 
        caseNumber, 
        accountName: caseAccountName, 
        country: caseCountry 
      },
      update: { 
        accountName: caseAccountName, 
        country: caseCountry 
      },
    });

    // 2. Resolve Agent (caseOwner is email)
    const user = caseOwner ? await this.prisma.user.findUnique({ where: { email: caseOwner } }) : null;

    // 3. Create NEW Assignment
    return this.prisma.$transaction(async (prisma) => {
      const assignment = await prisma.assignment.create({
        data: {
          caseId: caseRecord.id,
          userId: user?.id || undefined,
          ownerEmail: caseOwner || undefined,
          status: AssignmentStatus.OPEN,
          caseType,
          startTime: caseStartTime ? new Date(caseStartTime) : new Date(),
        },
      });

      await prisma.caseLog.create({
        data: {
          assignmentId: assignment.id,
          action: 'SALESFORCE_CASE_CREATED',
          userId: user?.id,
          changes: { caseNumber, caseOwner },
        },
      });

      return assignment;
    });
  }

  async handleGasFormWebhook(payload: GasFormWebhookDto) {
    const { caseNumber, caseOwner, formType, caseETA, formSubmitTime } = payload;
    if (!caseNumber || !caseOwner) throw new BadRequestException('caseNumber and caseOwner (email) are required');

    // 1. Ensure Case exists
    let caseRecord = await this.prisma.case.findUnique({ where: { caseNumber } });
    if (!caseRecord) {
      caseRecord = await this.prisma.case.create({ data: { caseNumber } });
    }

    // 2. Resolve Agent
    const user = await this.prisma.user.findUnique({ where: { email: caseOwner } });
    if (!user) throw new NotFoundException(`User with email ${caseOwner} not found`);

    // 3. Logic to update existing assignment or create new one
    // Scenario: 
    // - Update if status is OPEN
    // - Update if status is NOT OPEN but ETA is null
    // - Else Create NEW
    return this.prisma.$transaction(async (prisma) => {
      // Find the latest assignment for this case and user
      let assignment = await prisma.assignment.findFirst({
        where: {
          caseId: caseRecord.id,
          userId: user.id,
        },
        orderBy: { assignedAt: 'desc' },
      });

      const shouldUpdate = assignment && (
        assignment.status === AssignmentStatus.OPEN || 
        assignment.etaMinutes === null
      );

      if (assignment && shouldUpdate) {
        // UPDATE existing
        const currentAssignment = assignment; // Narrowing for TS
        assignment = await prisma.assignment.update({
          where: { id: currentAssignment.id },
          data: {
            formType,
            etaMinutes: caseETA || currentAssignment.etaMinutes,
            startTime: formSubmitTime ? new Date(formSubmitTime) : currentAssignment.startTime,
            etaSetAt: new Date(),
          },
        });

        await prisma.caseLog.create({
          data: {
            assignmentId: assignment.id,
            action: 'GAS_FORM_UPDATED',
            userId: user.id,
            changes: { formType, caseETA },
          },
        });
      } else {
        // CREATE new
        assignment = await prisma.assignment.create({
          data: {
            caseId: caseRecord.id,
            userId: user.id,
            status: AssignmentStatus.OPEN,
            formType,
            etaMinutes: caseETA,
            startTime: formSubmitTime ? new Date(formSubmitTime) : new Date(),
            etaSetAt: new Date(),
          },
        });

        await prisma.caseLog.create({
          data: {
            assignmentId: assignment.id,
            action: 'GAS_FORM_SUBMITTED',
            userId: user.id,
            changes: { assignmentId: assignment.id, formType, caseETA },
          },
        });
      }

      // Broadcast to clients
      this.realtimeGateway.server.emit('eta_updated', {
        caseId: caseRecord.id,
        assignmentId: assignment.id,
        etaMinutes: caseETA,
        updatedAt: assignment.etaSetAt,
      });

      return assignment;
    });
  }

  async handleSalesforceCloseWebhook(payload: CloseCaseWebhookDto) {
    const { caseNumber, caseOwner } = payload;
    
    // 1. Resolve Case
    const caseRecord = await this.prisma.case.findUnique({ where: { caseNumber } });
    if (!caseRecord) throw new NotFoundException(`Case with number ${caseNumber} not found`);

    // 2. Resolve User
    const user = await this.prisma.user.findUnique({ where: { email: caseOwner } });
    if (!user) throw new NotFoundException(`User with email ${caseOwner} not found`);

    // 3. Update all OPEN assignments for this case and user
    return this.prisma.$transaction(async (prisma) => {
      const openAssignments = await prisma.assignment.findMany({
        where: {
          caseId: caseRecord.id,
          userId: user.id,
          status: AssignmentStatus.OPEN,
        },
      });

      if (openAssignments.length === 0) {
        return { message: 'No open assignments found for this case and user', count: 0 };
      }

      await prisma.assignment.updateMany({
        where: {
          id: { in: openAssignments.map(a => a.id) },
        },
        data: {
          status: AssignmentStatus.CLOSED,
          closedAt: new Date(),
        },
      });

      // Create logs for each closed assignment
      for (const assignment of openAssignments) {
        await prisma.caseLog.create({
          data: {
            assignmentId: assignment.id,
            action: 'SALESFORCE_CASE_CLOSED',
            userId: user.id,
            changes: { oldStatus: assignment.status, newStatus: AssignmentStatus.CLOSED },
          },
        });
      }

      return { 
        message: `Successfully closed ${openAssignments.length} assignment(s)`, 
        count: openAssignments.length 
      };
    });
  }
}
