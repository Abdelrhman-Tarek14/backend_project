import { leaderboardApi } from '../api/leaderboardApi';

export const scoreService = {
    /**
     * Fetch aggregated stats for a specific user (Agent Dashboard)
     * @param {string} email - Agent's email
     */
    getUserStats: async (email) => {
        if (!email) return null;

        try {
            // Fetch leaderboard filtered by email for the current month
            const response = await leaderboardApi.getLeaderboard({ email });
            
            // The backend returns an array of matches. Since we filtered by exact email, 
            // the match might be at index 0 or not exist if no cases are assigned yet.
            const data = response.data?.find(u => u.email.toLowerCase() === email.toLowerCase());

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

            return {
                qaScore: data.qualityScorePercentage || 0,
                finalCheck: data.finalCheckScorePercentage || 0,
                etaAccuracy: data.etaScorePercentage || 0,
                casesCompleted: data.totalCases || 0,
                successRate: Math.round((data.qualityScorePercentage + data.finalCheckScorePercentage + data.etaScorePercentage) / 3),
                weeklyData: [0, 0, 0, 0, 0, 0, 0] // Weekly breakdown not yet supported by backend query
            };
        } catch (error) {
            console.error("Error fetching user stats:", error);
            return null;
        }
    },

    /**
     * Fetch the full leaderboard
     */
    getLeaderboard: async () => {
        try {
            const response = await leaderboardApi.getLeaderboard();
            return response.data || [];
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            return [];
        }
    },

    /**
     * Fetch aggregated stats for the entire team/system (Admin Dashboard)
     */
    getSystemStats: async () => {
        try {
            const data = await scoreService.getLeaderboard();

            const totalCases = data.reduce((sum, item) => sum + (item.totalCases || 0), 0);
            const avgQuality = data.length > 0 ? data.reduce((sum, item) => sum + (item.qualityScorePercentage || 0), 0) / data.length : 0;

            return {
                completedToday: totalCases, // This is for the month, but it's better than 0
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
