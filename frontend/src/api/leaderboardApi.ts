import apiClient from '../services/apiClient';
import { API_ENDPOINTS } from './endpoints';

export interface LeaderboardEntry {
    rank: number;
    name: string;
    email: string;
    displayName?: string;
    pictureUrl?: string;
    caseCount: number;
    averageTime?: number;
}

export interface LeaderboardParams {
    period?: 'daily' | 'weekly' | 'monthly' | 'all-time';
    limit?: number;
    country?: string;
}

export const leaderboardApi = {
    getLeaderboard: (params?: LeaderboardParams) =>
        apiClient.get<LeaderboardEntry[]>(API_ENDPOINTS.LEADERBOARD.GET, { params }),
};