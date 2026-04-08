import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AssignmentStatus, Prisma } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { GetCasesDto } from './dto/get-cases.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { ConfigService } from '@nestjs/config';
import { MANAGEMENT_ROLES } from '../../common/constants/roles.constants';
import { Role } from '@prisma/client';

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);

  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
    private configService: ConfigService,
  ) { }

  async findAll(query: GetCasesDto) {
    const { page = 1, limit = 10, status, date, agentId, agentEmail, agentName } = query;
    const safeLimit = Math.min(limit, 100); // ✅ رقم 4 — حد أقصى 100
    const skip = (page - 1) * safeLimit;

    const whereClause: Prisma.CaseWhereInput = {};
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
        take: safeLimit, // ✅
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          caseNumber: true,
          accountName: true,
          country: true,
          createdAt: true,
          lastClosedAt: true,
          receiveCount: true,
          assignments: {
            where: assignmentFilters,
            select: {
              id: true,
              userId: true,
              status: true,
              caseType: true,
              formType: true,
              etaMinutes: true,
              assignedAt: true,
              closedAt: true,
              user: {
                select: { id: true, name: true, email: true, role: true }
              },
              queueRecord: {
                select: { position: true }
              }
            }
          }
        },
      }),
      this.prisma.case.count({ where: whereClause }),
    ]);

    return {
      data: cases,
      meta: {
        totalCount,
        page,
        limit: safeLimit,                            // ✅
        totalPages: Math.ceil(totalCount / safeLimit), // ✅
      },
    };
  }

  async findById(id: string, requestingUser?: { id: string; role: Role }) {
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

    // ✅ رقم 6 — Agent يشوف بس الـ cases بتاعته
    if (requestingUser && !MANAGEMENT_ROLES.includes(requestingUser.role)) {
      const hasAccess = caseRecord.assignments.some(a => a.userId === requestingUser.id);
      if (!hasAccess) throw new ForbiddenException('Access denied');
    }

    return caseRecord;
  }

  async updateAssignment(assignmentId: string, data: UpdateAssignmentDto, adminId?: string) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const updatedAssignment = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.assignment.update({
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

      return updated;
    });

    this.broadcastCaseEvent('case_updated', {
      caseId: updatedAssignment.caseId,
      assignmentId: updatedAssignment.id,
      ...data,
    }, updatedAssignment.userId ?? undefined);

    this.broadcastLeaderboardUpdate(updatedAssignment);

    if (data.status || data.caseType) {
      this.syncQueueTracker().catch(err => this.logger.error('Failed to sync queue tracker', err));
    }

    return updatedAssignment;
  }

  async getSystemStatus() {
    return this.prisma.integrationStatus.findMany();
  }

  public broadcastCaseEvent(eventName: string, payload: any, userId?: string) {
    this.realtimeGateway.server.to('management_dashboard').emit(eventName, payload);
    if (userId) {
      this.realtimeGateway.server.to(`user:${userId}`).emit(eventName, payload);
    }
  }

  public broadcastLeaderboardUpdate(assignment: { status: AssignmentStatus }) {
    if (assignment.status === AssignmentStatus.CLOSED) {
      this.realtimeGateway.server.to('management_dashboard').emit('leaderboard_updated');
    }
  }

  public async syncQueueTracker() {
    const priorityTypes = this.configService.get<string[]>('queuePriorityTypes', ['menu typing', 'please correct error']);

    const openAssignments = await this.prisma.assignment.findMany({
      where: { status: AssignmentStatus.OPEN },
      select: { id: true, caseType: true, assignedAt: true },
    });

    openAssignments.sort((a, b) => {
      const typeALower = a.caseType?.toLowerCase().trim() || '';
      const typeBLower = b.caseType?.toLowerCase().trim() || '';

      const indexA = priorityTypes.findIndex(t => typeALower.includes(t));
      const indexB = priorityTypes.findIndex(t => typeBLower.includes(t));

      const rankA = indexA === -1 ? 999 : indexA;
      const rankB = indexB === -1 ? 999 : indexB;

      if (rankA !== rankB) return rankA - rankB;
      return new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime();
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.queueRecord.deleteMany({});
      const newRecords = openAssignments.map((assignment, index) => ({
        assignmentId: assignment.id,
        position: index + 1,
      }));
      if (newRecords.length > 0) {
        await tx.queueRecord.createMany({ data: newRecords });
      }
    });

    this.realtimeGateway.server.to('management_dashboard').emit('queue_updated');
  }
}