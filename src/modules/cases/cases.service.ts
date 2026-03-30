import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AssignmentStatus } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { GetCasesDto } from './dto/get-cases.dto';

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

  async updateAssignmentStatus(assignmentId: string, status: AssignmentStatus, userId?: string) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');

    return this.prisma.$transaction(async (prisma) => {
      const updatedAssignment = await prisma.assignment.update({
        where: { id: assignmentId },
        data: { status },
      });

      await prisma.caseLog.create({
        data: {
          assignmentId,
          action: 'ASSIGNMENT_STATUS_CHANGED',
          userId,
          changes: { assignmentId, old: assignment.status, new: status },
        },
      });

      return updatedAssignment;
    });
  }

  async handleSalesforceWebhook(payload: any) {
    const { caseNumber, accountName, country } = payload;
    if (!caseNumber) throw new BadRequestException('caseNumber is required');

    return this.prisma.case.upsert({
      where: { caseNumber },
      create: { caseNumber, accountName, country },
      update: { accountName, country },
    });
  }

  async handleGasWebhook(payload: any) {
    const { caseNumber, email, formType, etaMinutes, startTime, caseType } = payload;
    if (!caseNumber || !email) throw new BadRequestException('caseNumber and email are required');

    // 1. Ensure Case exists
    const caseRecord = await this.prisma.case.upsert({
      where: { caseNumber },
      create: { caseNumber },
      update: {},
    });

    // 2. Resolve Agent
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException(`User with email ${email} not found`);

    // 3. Create NEW Assignment (Historical tracking)
    return this.prisma.$transaction(async (prisma) => {
      const assignment = await prisma.assignment.create({
        data: {
          caseId: caseRecord.id,
          userId: user.id,
          status: AssignmentStatus.OPEN,
          formType,
          caseType,
          etaMinutes,
          startTime: startTime ? new Date(startTime) : new Date(),
          etaSetAt: new Date(),
        },
      });

      await prisma.caseLog.create({
        data: {
          assignmentId: assignment.id,
          action: 'GAS_FORM_SUBMITTED',
          userId: user.id,
          changes: { assignmentId: assignment.id, formType, etaMinutes },
        },
      });

      // Broadcast to clients
      this.realtimeGateway.server.emit('eta_updated', {
        caseId: caseRecord.id,
        assignmentId: assignment.id,
        etaMinutes,
        updatedAt: assignment.etaSetAt,
      });

      return assignment;
    });
  }
}
