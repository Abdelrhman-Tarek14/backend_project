import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { GetLeaderboardDto } from './dto/get-leaderboard.dto';

const ROLES_WITH_EMAIL_ACCESS: Role[] = [
  Role.SUPER_USER,
  Role.ADMIN,
  Role.SUPERVISOR,
  Role.CMD,
  Role.LEADER,
];

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) { }

  async getLeaderboard(query: GetLeaderboardDto, requestingRole: Role) {
    const { startDate, endDate, leaderId, email, name, leaderName } = query;

    const defaultStart = new Date();
    defaultStart.setDate(1);
    defaultStart.setHours(0, 0, 0, 0);

    const start = startDate ? new Date(startDate) : defaultStart;
    const end = endDate ? new Date(endDate) : new Date();

    const rawData = await this.buildLeaderboardQuery(start, end, { leaderId, email, name, leaderName });

    const canSeeEmail = ROLES_WITH_EMAIL_ACCESS.includes(requestingRole);

    return rawData.map(row => {
      const total = row.totalCases;
      return {
        userId: row.userId,
        name: row.name,
        ...(canSeeEmail && { email: row.email }),
        totalCases: total,
        qualityScorePercentage: total > 0 ? Math.round((row.qualityPassed / total) * 100) : 0,
        finalCheckScorePercentage: total > 0 ? Math.round((row.finalCheckPassed / total) * 100) : 0,
        etaScorePercentage: total > 0 ? Math.round((row.etaPassed / total) * 100) : 0,
      };
    });
  }

  private async buildLeaderboardQuery(
    start: Date,
    end: Date,
    filters: { leaderId?: string; email?: string; name?: string; leaderName?: string }
  ) {
    const { leaderId, email, name, leaderName } = filters;

    const leaderCondition = leaderId ? Prisma.sql`AND u."leaderId" = ${leaderId}` : Prisma.empty;
    const leaderNameCondition = leaderName ? Prisma.sql`AND u."leaderId" IN (SELECT id FROM "User" WHERE name ILIKE ${'%' + leaderName + '%'})` : Prisma.empty;
    const emailCondition = email ? Prisma.sql`AND u.email ILIKE ${'%' + email + '%'}` : Prisma.empty;
    const nameCondition = name ? Prisma.sql`AND u.name ILIKE ${'%' + name + '%'}` : Prisma.empty;

    return this.prisma.$queryRaw<any[]>`
      SELECT 
        u.id AS "userId",
        u.name,
        u.email,
        COUNT(a.id)::int AS "totalCases",
        SUM(CASE WHEN a."qualityScore" = false THEN 0 ELSE 1 END)::int AS "qualityPassed",
        SUM(CASE WHEN a."finalCheckScore" = false THEN 0 ELSE 1 END)::int AS "finalCheckPassed",
        SUM(CASE WHEN a."isOnTime" = false THEN 0 ELSE 1 END)::int AS "etaPassed"
      FROM "User" u
      INNER JOIN "Assignment" a ON u.id = a."userId"
      WHERE u.role = 'AGENT' 
        AND a.status = 'CLOSED'
        AND a."assignedAt" >= ${start} 
        AND a."assignedAt" <= ${end}
        ${leaderCondition}
        ${leaderNameCondition}
        ${emailCondition}
        ${nameCondition}
      GROUP BY u.id, u.name, u.email
      HAVING COUNT(a.id) > 0
      ORDER BY "totalCases" DESC
    `;
  }
}