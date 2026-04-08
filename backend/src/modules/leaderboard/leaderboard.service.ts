import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getLeaderboard(startDate?: string, endDate?: string, leaderId?: string, email?: string, name?: string, leaderName?: string) {
    // Default to the first day of the current month
    const defaultStart = new Date();
    defaultStart.setDate(1);
    defaultStart.setHours(0, 0, 0, 0);

    const start = startDate ? new Date(startDate) : defaultStart;
    const end = endDate ? new Date(endDate) : new Date();

    const leaderCondition = leaderId ? Prisma.sql`AND u."leaderId" = ${leaderId}` : Prisma.empty;
    const leaderNameCondition = leaderName ? Prisma.sql`AND u."leaderId" IN (SELECT id FROM "User" WHERE name ILIKE ${'%' + leaderName + '%'})` : Prisma.empty;
    const emailCondition = email ? Prisma.sql`AND u.email ILIKE ${'%' + email + '%'}` : Prisma.empty;
    const nameCondition = name ? Prisma.sql`AND u.name ILIKE ${'%' + name + '%'}` : Prisma.empty;

    const rawData = await this.prisma.$queryRaw<any[]>`
      SELECT 
        u.id AS "userId",
        u.name,
        u.email,
        COUNT(a.id)::int AS "totalCases",
        -- Default to 1 (Pass) unless explicitly set to false
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

    return rawData.map(row => {
       const total = row.totalCases;
       return {
          userId: row.userId,
          name: row.name,
          email: row.email,
          totalCases: total,
          qualityScorePercentage: total > 0 ? Math.round((row.qualityPassed / total) * 100) : 0,
          finalCheckScorePercentage: total > 0 ? Math.round((row.finalCheckPassed / total) * 100) : 0,
          etaScorePercentage: total > 0 ? Math.round((row.etaPassed / total) * 100) : 0,
       };
    });
  }
}
