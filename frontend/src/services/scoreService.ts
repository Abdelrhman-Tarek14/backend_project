import { leaderboardApi } from '../api/leaderboardApi';
import type { LeaderboardEntry } from '../api/leaderboardApi';

export interface LeaderboardUser extends LeaderboardEntry {
    qualityScorePercentage?: number;
    finalCheckScorePercentage?: number;
    etaScorePercentage?: number;
    totalCases: number;
}

export interface UserStats {
    qaScore: number;
    finalCheck: number;
    etaAccuracy: number;
    casesCompleted: number;
    successRate: number;
    weeklyData: number[];
}

export const scoreService = {
    getUserStats: async (email: string | null | undefined): Promise<UserStats | null> => {
        if (!email) return null;

        try {
            const response = await leaderboardApi.getLeaderboard({ email } as any);

            const leaderboardData = response.data || [];
            const data = leaderboardData.find(u => u.email.toLowerCase() === email.toLowerCase());

            if (!data) {
                return {
                    qaScore: 0,
                    finalCheck: 0,
                    etaAccuracy: 0,
                    casesCompleted: 0,
                    successRate: 0,
                    weeklyData: [0, 0, 0, 0, 0, 0, 0]
                };
            }

            const qa = (data as any).qualityScorePercentage || 0;
            const fc = (data as any).finalCheckScorePercentage || 0;
            const eta = (data as any).etaScorePercentage || 0;

            return {
                qaScore: qa,
                finalCheck: fc,
                etaAccuracy: eta,
                casesCompleted: data.caseCount || 0,
                successRate: Math.round((qa + fc + eta) / 3),
                weeklyData: [0, 0, 0, 0, 0, 0, 0]
            };
        } catch (error) {
            console.error("Error fetching user stats:", error);
            return null;
        }
    },

    getLeaderboard: async (params: any = {}): Promise<LeaderboardUser[]> => {
        try {
            const response = await leaderboardApi.getLeaderboard(params);

            return (response.data || []).map(item => ({
                ...item,
                totalCases: item.caseCount
            })) as LeaderboardUser[];
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            return [];
        }
    },

    getSystemStats: async () => {
        try {
            const data = await scoreService.getLeaderboard();

            const totalCases = data.reduce((sum, item) => sum + (item.totalCases || 0), 0);

            const avgQuality = data.length > 0
                ? data.reduce((sum, item) => sum + (item.qualityScorePercentage || 0), 0) / data.length
                : 0;

            return {
                completedToday: totalCases,
                successRate: Math.round(avgQuality),
                avgTime: "N/A",
                weeklyData: [0, 0, 0, 0, 0, 0, 0]
            };
        } catch (error) {
            console.error("Error fetching system stats:", error);
            return null;
        }
    }
};