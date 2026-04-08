import { Test, TestingModule } from '@nestjs/testing';
import { LeaderboardService } from './leaderboard.service';
import { PrismaService } from '../../database/prisma.service';

describe('LeaderboardService Calculation Audit', () => {
  let service: LeaderboardService;
  let prisma: PrismaService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should correctly calculate percentages and handle zero cases', async () => {
    // Mocking raw database results
    const rawData = [
      {
        userId: 'agent-1',
        name: 'Agent One',
        email: 'agent1@example.com',
        totalCases: 10,
        qualityPassed: 8,
        finalCheckPassed: 5,
        etaPassed: 9,
      },
      {
        userId: 'agent-2',
        name: 'Agent Two',
        email: 'agent2@example.com',
        totalCases: 0, // Zero cases scenario
        qualityPassed: 0,
        finalCheckPassed: 0,
        etaPassed: 0,
      }
    ];

    mockPrismaService.$queryRaw.mockResolvedValue(rawData);

    const result = await service.getLeaderboard();

    // Verify Agent One calculations: (8/10)*100 = 80, (5/10)*100 = 50, (9/10)*100 = 90
    expect(result[0].qualityScorePercentage).toBe(80);
    expect(result[0].finalCheckScorePercentage).toBe(50);
    expect(result[0].etaScorePercentage).toBe(90);

    // Verify Agent Two handles 0 cases correctly (return 0 instead of NaN/Error)
    expect(result[1].qualityScorePercentage).toBe(0);
    expect(result[1].finalCheckScorePercentage).toBe(0);
    expect(result[1].etaScorePercentage).toBe(0);
  });

  it('should round percentages correctly', async () => {
    const rawData = [
      {
        userId: 'agent-3',
        name: 'Agent Three',
        email: 'agent3@example.com',
        totalCases: 3, // (2/3) * 100 = 66.666...
        qualityPassed: 2,
        finalCheckPassed: 1,
        etaPassed: 1,
      }
    ];

    mockPrismaService.$queryRaw.mockResolvedValue(rawData);

    const result = await service.getLeaderboard();

    // Verify rounding (Math.round(66.666) = 67)
    expect(result[0].qualityScorePercentage).toBe(67);
  });
});
